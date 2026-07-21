"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AddedFoodList, FoodAdder, addedFoodToInput, type AddedFood } from "@/components/FoodAdder";
import { mealFoodToAdded } from "@/components/DietBuilder";
import { nootrApi } from "@/lib/api";
import type { AdminPendingDiet, CustomFood, Recipe } from "@/lib/types";

interface EditMeal {
  id: string;
  name: string;
  time: string;
  foods: AddedFood[];
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

  if (loading) return <p className="p-8 text-sm text-nootr-muted">Carregando…</p>;

  if (deniedAccess) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="font-display text-2xl text-nootr-cream">Sem acesso</p>
        <p className="mt-2 text-sm text-nootr-muted">Essa página é restrita ao admin do Nootr.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl text-nootr-cream">Aprovar para uso global</h1>
      <p className="mt-2 text-sm text-nootr-muted">
        Receitas e alimentos customizados enviados por qualquer usuário, aprovados passam a ser sugeridos
        para todo mundo.
      </p>

      {error && <p className="mt-4 text-sm text-nootr-bordoSoft">{error}</p>}

      <section className="card mt-8 space-y-4">
        <p className="label-caps">Dietas pendentes ({diets.length})</p>
        {diets.length === 0 ? (
          <p className="text-sm text-nootr-faint">Nada pendente.</p>
        ) : (
          <ul className="space-y-3">
            {diets.map((d) => (
              <li key={d.id} className="rounded-lg border border-nootr-line bg-nootr-black px-3.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-nootr-cream">{d.name}</p>
                    <p className="text-xs text-nootr-faint">usuário: {d.user_id}</p>
                    <p className="mt-1 text-xs text-nootr-muted">
                      {d.daily_calories} kcal · P {d.daily_protein_g}g · C {d.daily_carbs_g}g · G {d.daily_fat_g}g
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2 text-xs">
                    <button type="button" onClick={() => toggleExpandDiet(d)} className="btn-secondary px-3 py-1.5">
                      {expandedDietId === d.id ? "fechar" : "revisar"}
                    </button>
                    <button type="button" onClick={() => handleDietDecision(d.id, "approve")} className="btn-primary px-3 py-1.5">
                      aprovar
                    </button>
                    <button type="button" onClick={() => handleDietDecision(d.id, "reject")} className="btn-secondary px-3 py-1.5">
                      rejeitar
                    </button>
                  </div>
                </div>

                {expandedDietId === d.id && (
                  <div className="mt-4 space-y-5 border-t border-nootr-line pt-4">
                    {editMeals.map((meal, mi) => (
                      <div key={meal.id} className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-caps text-nootr-cream">
                          {meal.name} · {meal.time}
                        </p>
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
                    ))}
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
                    <p className="text-xs text-nootr-faint">usuário: {r.user_id}</p>
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
                    <p className="text-xs text-nootr-faint">usuário: {f.user_id}</p>
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
