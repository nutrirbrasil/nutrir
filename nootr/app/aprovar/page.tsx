"use client";

import { useEffect, useState } from "react";
import { SkeletonPage } from "@/components/Skeleton";
import { RequireAuth } from "@/components/RequireAuth";
import { AddedFoodList, FoodAdder, addedFoodToInput, type AddedFood } from "@/components/FoodAdder";
import { mealFoodToAdded } from "@/components/DietBuilder";
import { PageHeader } from "@/components/PageHeader";
import { nootrApi } from "@/lib/api";
import type { AdminPendingDiet, AdminUserContext, CustomFood, Recipe } from "@/lib/types";

interface EditMeal {
  id: string;
  name: string;
  time: string;
  foods: AddedFood[];
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentario: "sedentário",
  leve: "atividade leve",
  moderado: "atividade moderada",
  intenso: "atividade intensa",
  atleta: "atleta",
};

interface Totals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

/** "1.6–2 g/kg" a partir da faixa de referência do backend. */
function perKgRange(range?: [number, number]): string | null {
  if (!range) return null;
  return `${range[0]}–${range[1]} g/kg`;
}

/** Soma os macros das refeições em edição, pro painel de alvos refletir
 * cada alteração do nutricionista na hora, sem precisar salvar antes. */
function sumMeals(meals: EditMeal[]): Totals {
  const t: Totals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  for (const meal of meals) {
    for (const f of meal.foods) {
      t.calories += f.calories;
      t.protein_g += f.protein_g;
      t.carbs_g += f.carbs_g;
      t.fat_g += f.fat_g;
    }
  }
  return t;
}

/**
 * Uma linha da tabela alvo/atual.
 *
 * Proteína e gordura têm FAIXA de referência (g/kg de peso), não um número
 * único: o alvo mostrado é a faixa e a diferença é medida a partir da borda
 * mais próxima, zero enquanto o valor está dentro dela. Assim "168g numa
 * faixa de 128–160g" aparece como +8 (o quanto passou do teto), que é o que
 * o nutricionista precisa tirar, e não +24 sobre um ponto médio arbitrário.
 * Calorias e carboidrato têm alvo único e usam a tolerância de 10%.
 */
function MacroRow({
  label, unit, target, current, min, max, perKg,
}: {
  label: string; unit: string; target?: number | null; current: number;
  min?: number | null; max?: number | null; perKg?: string | null;
}) {
  const hasRange = min != null && max != null;
  const rounded = Math.round(current);

  let delta: number | null = null;
  if (hasRange) {
    delta = rounded > max ? rounded - max : rounded < min ? rounded - min : 0;
  } else if (target != null) {
    delta = rounded - target;
  }

  const outOfRange = hasRange
    ? delta !== 0
    : delta != null && target ? Math.abs(delta) / target > 0.1 : false;

  return (
    <tr className="border-t border-nootr-line/60">
      <td className="py-1.5 pr-3 text-nootr-muted">
        {label}
        {perKg && <span className="ml-1 text-[10px] text-nootr-faint">{perKg}</span>}
      </td>
      <td className="py-1.5 pr-3 text-right tabular-nums text-nootr-muted">
        {hasRange ? `${min}–${max}${unit}` : target != null ? `${target}${unit}` : "—"}
      </td>
      <td className={`py-1.5 pr-3 text-right tabular-nums font-medium ${outOfRange ? "text-nootr-bordoSoft" : "text-nootr-cream"}`}>
        {rounded}{unit}
      </td>
      {/* A seta repete o que a cor diz, pra diferença continuar legível em
          preto e branco ou pra quem não distingue o bordô do cinza. */}
      <td className={`py-1.5 text-right tabular-nums ${outOfRange ? "text-nootr-bordoSoft" : "text-nootr-faint"}`}>
        {delta == null ? "—" : delta === 0 ? "✓ 0" : `${delta > 0 ? "↑ +" : "↓ "}${delta}`}
      </td>
    </tr>
  );
}

/**
 * Painel de contexto do paciente + alvo vs. atual, ao lado da dieta pendente.
 * As metas vêm do backend calculadas por g/kg de peso (ver
 * admin._with_user_context e energy.macro_targets_from_weight); a coluna
 * "atual" é recalculada no cliente a cada edição (ver sumMeals), porque o
 * nutricionista precisa ver o efeito de cada troca antes de salvar.
 */
function DietTargetsPanel({ ctx, current }: { ctx?: AdminUserContext; current: Totals }) {
  const m = ctx?.macro_targets;
  const corpo = [
    ctx?.weight_kg ? `${ctx.weight_kg} kg` : null,
    ctx?.height_cm ? `${ctx.height_cm} cm` : null,
    ctx?.age ? `${ctx.age} anos` : null,
    ctx?.sex === "m" ? "masculino" : ctx?.sex === "f" ? "feminino" : null,
    ctx?.activity_level ? ACTIVITY_LABELS[ctx.activity_level] ?? ctx.activity_level : null,
    ctx?.country,
  ].filter(Boolean) as string[];

  return (
    <div className="mt-3 rounded-lg border border-nootr-line bg-nootr-card/60 p-3">
      {corpo.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {corpo.map((item) => (
            <span
              key={item}
              className="rounded-full border border-nootr-line bg-nootr-black px-2 py-0.5 text-[11px] text-nootr-muted"
            >
              {item}
            </span>
          ))}
        </div>
      )}

      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-caps text-nootr-faint">
            <th className="pb-1 text-left font-normal">macro</th>
            <th className="pb-1 pr-3 text-right font-normal">
              alvo
              {ctx?.formula === "manual" && <span className="ml-1 normal-case tracking-normal">(à mão)</span>}
            </th>
            <th className="pb-1 pr-3 text-right font-normal">atual</th>
            <th className="pb-1 text-right font-normal">dif.</th>
          </tr>
        </thead>
        <tbody>
          <MacroRow label="Calorias" unit="" target={ctx?.target_calories} current={current.calories} />
          <MacroRow
            label="Proteína" unit="g" target={m?.protein_g} current={current.protein_g}
            min={m?.protein_min_g} max={m?.protein_max_g}
            perKg={perKgRange(m?.protein_per_kg_range)}
          />
          <MacroRow label="Carboidrato" unit="g" target={m?.carbs_g} current={current.carbs_g} />
          <MacroRow
            label="Gordura" unit="g" target={m?.fat_g} current={current.fat_g}
            min={m?.fat_min_g} max={m?.fat_max_g}
            perKg={perKgRange(m?.fat_per_kg_range)}
          />
        </tbody>
      </table>
    </div>
  );
}

/**
 * Fila de aprovação global, só o admin acessa (checagem real é no backend,
 * ver routes/nootr/admin.py; aqui só tratamos o 403 com uma tela própria).
 * Receitas e alimentos customizados nascem "pending" e ficam invisíveis pra
 * outros usuários até serem aprovados aqui (ver repository.py).
 */
export default function AprovarPage() {
  return <RequireAuth>{(token) => <AprovarContent token={token} />}</RequireAuth>;
}

function AprovarContent({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [deniedAccess, setDeniedAccess] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [foods, setFoods] = useState<CustomFood[]>([]);
  const [diets, setDiets] = useState<AdminPendingDiet[]>([]);
  const [expandedDietId, setExpandedDietId] = useState<string | null>(null);
  const [editMeals, setEditMeals] = useState<EditMeal[]>([]);
  const [savingDiet, setSavingDiet] = useState(false);
  const [regeneratingDietId, setRegeneratingDietId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [r, f, d] = await Promise.all([
        nootrApi.admin.listPendingRecipes(token),
        nootrApi.admin.listPendingCustomFoods(token),
        nootrApi.admin.listPendingDiets(token),
      ]);
      setRecipes(r.results);
      setFoods(f.results);
      setDiets(d.results);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("403") || msg.toLowerCase().includes("restrito")) {
        setDeniedAccess(true);
      } else {
        setError(msg || "Não foi possível carregar a fila de aprovação.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleRecipeDecision(id: string, decision: "approve" | "reject") {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    try {
      await (decision === "approve" ? nootrApi.admin.approveRecipe(token, id) : nootrApi.admin.rejectRecipe(token, id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao decidir receita");
      load();
    }
  }

  async function handleFoodDecision(id: string, decision: "approve" | "reject") {
    setFoods((prev) => prev.filter((f) => f.id !== id));
    try {
      await (decision === "approve" ? nootrApi.admin.approveCustomFood(token, id) : nootrApi.admin.rejectCustomFood(token, id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao decidir alimento");
      load();
    }
  }

  function toggleExpandDiet(diet: AdminPendingDiet) {
    if (expandedDietId === diet.id) {
      setExpandedDietId(null);
      return;
    }
    setExpandedDietId(diet.id);
    setEditMeals(diet.meals.map((m) => ({ id: m.id, name: m.name, time: m.time, foods: m.foods.map(mealFoodToAdded) })));
  }

  async function handleSaveDietEdits(dietId: string) {
    setSavingDiet(true);
    setError("");
    try {
      const mealsPayload = editMeals.map((m) => ({ name: m.name, time: m.time, foods: m.foods.map(addedFoodToInput) }));
      const updated = await nootrApi.admin.updateDiet(token, dietId, mealsPayload);
      setDiets((prev) => prev.map((d) => (d.id === dietId ? { ...d, ...updated } : d)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar alterações da dieta");
    } finally {
      setSavingDiet(false);
    }
  }

  async function handleRegenerateDiet(diet: AdminPendingDiet) {
    setRegeneratingDietId(diet.id);
    setError("");
    try {
      const updated = await nootrApi.admin.regenerateDiet(token, diet.id);
      setDiets((prev) => prev.map((d) => (d.id === diet.id ? { ...d, ...updated } : d)));
      // Se estava aberta pra edição, refaz o editor com as novas refeições,
      // senão o admin veria a versão antiga até fechar e reabrir.
      if (expandedDietId === diet.id) {
        setEditMeals(updated.meals.map((m) => ({ id: m.id, name: m.name, time: m.time, foods: m.foods.map(mealFoodToAdded) })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao refazer a dieta");
    } finally {
      setRegeneratingDietId(null);
    }
  }

  async function handleDietDecision(id: string, decision: "approve" | "reject") {
    setDiets((prev) => prev.filter((d) => d.id !== id));
    if (expandedDietId === id) setExpandedDietId(null);
    try {
      await (decision === "approve" ? nootrApi.admin.approveDiet(token, id) : nootrApi.admin.rejectDiet(token, id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao decidir dieta");
      load();
    }
  }

  if (loading) return <SkeletonPage cards={3} />;

  if (deniedAccess) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="font-display text-2xl text-nootr-cream">Sem acesso</p>
        <p className="mt-2 text-sm text-nootr-muted">Essa página é restrita ao admin do Nootr.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon="sliders"
        title="Fila de revisão"
        subtitle="Dietas geradas pelo Nootr aguardando sua revisão, mais receitas e alimentos enviados pelos usuários. O que você aprovar passa a valer para todo mundo."
      />

      {error && <p className="mt-4 text-sm text-nootr-bordoSoft">{error}</p>}

      <section className="card mt-6 space-y-4">
        <p className="label-caps">Dietas pendentes ({diets.length})</p>
        {diets.length === 0 ? (
          <p className="text-sm text-nootr-faint">Nada pendente.</p>
        ) : (
          <ul className="space-y-3">
            {diets.map((d) => (
              <li key={d.id} className="rounded-lg border border-nootr-line bg-nootr-black px-3.5 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-nootr-cream">{d.name}</p>
                    <p className="text-xs text-nootr-faint">{d.user_email ?? d.user_id}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2 text-xs">
                    <button type="button" onClick={() => toggleExpandDiet(d)} className="btn-secondary px-3 py-1.5">
                      {expandedDietId === d.id ? "fechar" : "revisar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRegenerateDiet(d)}
                      disabled={regeneratingDietId === d.id}
                      className="btn-secondary px-3 py-1.5 disabled:opacity-60"
                      title="Descarta os alimentos atuais e gera a dieta de novo do zero com o gerador atual"
                    >
                      {regeneratingDietId === d.id ? "refazendo…" : "refazer"}
                    </button>
                    <button type="button" onClick={() => handleDietDecision(d.id, "approve")} className="btn-primary px-3 py-1.5">
                      aprovar
                    </button>
                    <button type="button" onClick={() => handleDietDecision(d.id, "reject")} className="btn-secondary px-3 py-1.5">
                      rejeitar
                    </button>
                  </div>
                </div>

                {/* Enquanto a dieta está aberta pra edição, a coluna "atual"
                    sai do rascunho local, não do que está salvo, pra refletir
                    cada alteração na hora. */}
                <DietTargetsPanel
                  ctx={d.user_context}
                  current={
                    expandedDietId === d.id
                      ? sumMeals(editMeals)
                      : {
                          calories: d.daily_calories,
                          protein_g: d.daily_protein_g,
                          carbs_g: d.daily_carbs_g,
                          fat_g: d.daily_fat_g,
                        }
                  }
                />

                {expandedDietId === d.id && (
                  <div className="mt-4 space-y-5 border-t border-nootr-line pt-4">
                    {editMeals.map((meal, mi) => {
                      const sub = sumMeals([meal]);
                      return (
                      <div key={meal.id} className="space-y-2">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-caps text-nootr-cream">
                            {meal.name} · {meal.time}
                          </p>
                          <p className="text-[11px] tabular-nums text-nootr-faint">
                            {Math.round(sub.calories)} kcal · P {Math.round(sub.protein_g)}g
                            {" · "}C {Math.round(sub.carbs_g)}g · G {Math.round(sub.fat_g)}g
                          </p>
                        </div>
                        <AddedFoodList
                          foods={meal.foods}
                          onRemove={(fi) =>
                            setEditMeals((prev) =>
                              prev.map((m, j) => (j === mi ? { ...m, foods: m.foods.filter((_, k) => k !== fi) } : m))
                            )
                          }
                          onEdit={(fi, f) =>
                            setEditMeals((prev) =>
                              prev.map((m, j) => (j === mi ? { ...m, foods: m.foods.map((x, k) => (k === fi ? f : x)) } : m))
                            )
                          }
                        />
                        <FoodAdder
                          token={token}
                          onAdd={(f) =>
                            setEditMeals((prev) => prev.map((m, j) => (j === mi ? { ...m, foods: [...m.foods, f] } : m)))
                          }
                        />
                      </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => handleSaveDietEdits(d.id)}
                      disabled={savingDiet}
                      className="btn-primary w-full text-sm disabled:opacity-60"
                    >
                      {savingDiet ? "Salvando…" : "Salvar alterações"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mt-6 space-y-4">
        <p className="label-caps">Receitas pendentes ({recipes.length})</p>
        {recipes.length === 0 ? (
          <p className="text-sm text-nootr-faint">Nada pendente.</p>
        ) : (
          <ul className="space-y-2">
            {recipes.map((r) => (
              <li key={r.id} className="rounded-lg border border-nootr-line bg-nootr-black px-3.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-nootr-cream">{r.name}</p>
                    <p className="text-xs text-nootr-faint">usuário: {r.user_email ?? r.user_id}</p>
                    <p className="mt-1 truncate text-xs text-nootr-muted">
                      {r.ingredients.map((i) => i.name).join(", ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2 text-xs">
                    <button type="button" onClick={() => handleRecipeDecision(r.id, "approve")} className="btn-primary px-3 py-1.5">
                      aprovar
                    </button>
                    <button type="button" onClick={() => handleRecipeDecision(r.id, "reject")} className="btn-secondary px-3 py-1.5">
                      rejeitar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mt-6 space-y-4">
        <p className="label-caps">Alimentos customizados pendentes ({foods.length})</p>
        {foods.length === 0 ? (
          <p className="text-sm text-nootr-faint">Nada pendente.</p>
        ) : (
          <ul className="space-y-2">
            {foods.map((f) => (
              <li key={f.id} className="rounded-lg border border-nootr-line bg-nootr-black px-3.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-nootr-cream">{f.name}</p>
                    <p className="text-xs text-nootr-faint">usuário: {f.user_email ?? f.user_id}</p>
                    <p className="mt-1 text-xs text-nootr-muted">
                      {f.kcal_100g} kcal · P {f.protein_100g}g · C {f.carbs_100g}g · G {f.fat_100g}g (por 100g)
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2 text-xs">
                    <button type="button" onClick={() => handleFoodDecision(f.id, "approve")} className="btn-primary px-3 py-1.5">
                      aprovar
                    </button>
                    <button type="button" onClick={() => handleFoodDecision(f.id, "reject")} className="btn-secondary px-3 py-1.5">
                      rejeitar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
