"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { nootrApi } from "@/lib/api";
import { FoodAdder, AddedFoodList, addedFoodToInput, type AddedFood } from "@/components/FoodAdder";
import type { ConverseTurn, Meal, PantryMatch, Preferences, SubstitutionAction, SubstitutionResult } from "@/lib/types";

function pantryMatchToAdded(m: PantryMatch): AddedFood {
  const grams = m.grams || 100;
  const r = grams > 0 ? 100 / grams : 1;
  return {
    taco_id: m.taco_id,
    name: m.name,
    grams,
    quantity_label: `${Math.round(grams)}g`,
    calories: m.calories,
    protein_g: m.protein_g,
    carbs_g: m.carbs_g,
    fat_g: m.fat_g,
    kcal_100g: Math.round(m.calories * r * 10) / 10,
    protein_100g: Math.round(m.protein_g * r * 10) / 10,
    carbs_100g: Math.round(m.carbs_g * r * 10) / 10,
    fat_100g: Math.round(m.fat_g * r * 10) / 10,
  };
}

function PantryMatchCard({ match, onAdd }: { match: PantryMatch; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="rounded-lg border border-nootr-line bg-nootr-black px-3 py-2.5 text-left transition-colors hover:border-nootr-bordo/60 hover:bg-nootr-wine/30"
    >
      <p className="text-sm text-nootr-cream">{match.name}</p>
      <p className="mt-0.5 text-xs text-nootr-faint">
        {Math.round(match.calories)} kcal · P{Math.round(match.protein_g)}g · C{Math.round(match.carbs_g)}g · G{Math.round(match.fat_g)}g
      </p>
    </button>
  );
}

const ACTION_LABELS: Record<SubstitutionAction, string> = {
  ate_different: "Comi algo diferente",
  will_eat_different: "Vou comer algo diferente",
  missing_food: "Estou em falta",
};

const ACTION_HINTS: Record<SubstitutionAction, string> = {
  ate_different: "Adicione o que você comeu e ajustamos o resto do dia.",
  will_eat_different: "Adicione o que você vai comer e planejamos em volta.",
  missing_food: "Escolha o alimento que falta e adicione o que você tem no lugar.",
};

function SubstituirForm({ token, meals }: { token: string; meals: Meal[] }) {
  const searchParams = useSearchParams();
  const initialAction = (searchParams.get("acao") as SubstitutionAction) || "ate_different";

  const [action, setAction] = useState<SubstitutionAction>(initialAction);
  const [mealId, setMealId] = useState<string>("");
  const [missingFoodName, setMissingFoodName] = useState("");
  const [foods, setFoods] = useState<AddedFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubstitutionResult | null>(null);
  const [error, setError] = useState("");

  // IA conversacional: pode perguntar de volta (ex: quantidade, caseiro/marca/local)
  const [conversation, setConversation] = useState<ConverseTurn[]>([]);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState("");

  // "Estou em falta": opções da despensa (mesmo perfil), sugestões da IA e
  // atalho pra cadastrar um alimento novo na despensa na hora.
  const [pantryMatches, setPantryMatches] = useState<PantryMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [alternatives, setAlternatives] = useState<PantryMatch[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [alternativesFetched, setAlternativesFetched] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [preferences, setPreferences] = useState<Preferences | null>(null);

  const selectedMeal = useMemo(() => meals.find((m) => m.id === mealId) ?? null, [meals, mealId]);

  useEffect(() => {
    nootrApi.getPreferences(token).then(setPreferences).catch(() => {});
  }, [token]);

  useEffect(() => {
    setPantryMatches([]);
    setAlternatives([]);
    setAlternativesFetched(false);
    setShowAddNew(false);
    if (action !== "missing_food" || !missingFoodName) return;
    let active = true;
    setLoadingMatches(true);
    nootrApi
      .missingFoodOptions(token, missingFoodName)
      .then((data) => active && setPantryMatches(data.pantry_matches))
      .catch(() => {})
      .finally(() => active && setLoadingMatches(false));
    return () => {
      active = false;
    };
  }, [action, missingFoodName, token]);

  function addMatch(m: PantryMatch) {
    setFoods((prev) => [...prev, pantryMatchToAdded(m)]);
  }

  async function handleShowAlternatives() {
    if (alternativesFetched) return;
    setLoadingAlternatives(true);
    setError("");
    try {
      const data = await nootrApi.suggestAlternatives(token, missingFoodName);
      setAlternatives(data.suggestions);
      setAlternativesFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar alternativas");
    } finally {
      setLoadingAlternatives(false);
    }
  }

  async function handleAddNewFood(f: AddedFood) {
    setFoods((prev) => [...prev, f]);
    if (preferences && !preferences.pantry.some((p) => p.toLowerCase() === f.name.toLowerCase())) {
      const updatedPantry = [...preferences.pantry, f.name];
      setPreferences({ ...preferences, pantry: updatedPantry });
      try {
        await nootrApi.updatePreferences(token, { pantry: updatedPantry });
      } catch {
        // não bloqueia o fluxo de substituição por causa disso
      }
    }
  }

  async function handleAiParse() {
    if (aiText.trim().length < 2) return;
    setAiLoading(true);
    setAiNote("");
    setError("");
    try {
      const data = await nootrApi.parseMeal(token, aiText.trim(), conversation);
      if (data.status === "question") {
        setConversation(data.history);
        setAiText("");
        return;
      }
      const parsed: AddedFood[] = data.foods.map((f) => {
        const r = f.grams > 0 ? 100 / f.grams : 1;
        return {
          taco_id: f.taco_id,
          name: f.name,
          grams: f.grams,
          quantity_label: f.quantity,
          calories: f.calories,
          protein_g: f.protein_g,
          carbs_g: f.carbs_g,
          fat_g: f.fat_g,
          kcal_100g: Math.round(f.calories * r * 10) / 10,
          protein_100g: Math.round(f.protein_g * r * 10) / 10,
          carbs_100g: Math.round(f.carbs_g * r * 10) / 10,
          fat_100g: Math.round(f.fat_g * r * 10) / 10,
        };
      });
      setFoods((prev) => [...prev, ...parsed]);
      setConversation([]);
      setAiText("");
      const parts: string[] = [];
      if (parsed.length) parts.push(`${parsed.length} alimento(s) adicionado(s)`);
      if (data.unmatched.length) parts.push(`não reconhecidos: ${data.unmatched.join(", ")}`);
      setAiNote(parts.join(" · ") || "Nada reconhecido no texto.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao interpretar com IA");
    } finally {
      setAiLoading(false);
    }
  }

  function cancelAiConversation() {
    setConversation([]);
    setAiText("");
    setAiNote("");
  }

  function switchAction(next: SubstitutionAction) {
    setAction(next);
    setMissingFoodName("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (foods.length === 0) {
      setError("Adicione pelo menos um alimento.");
      return;
    }
    if (!mealId) {
      setError("Escolha a refeição.");
      return;
    }
    if (action === "missing_food" && !missingFoodName) {
      setError("Escolha o alimento que está em falta.");
      return;
    }
    setLoading(true);
    try {
      const data = await nootrApi.suggestSubstitution(token, {
        action,
        meal_id: mealId || null,
        foods: foods.map(addedFoodToInput),
        missing_food_name: action === "missing_food" ? missingFoodName : undefined,
      });
      setResult(data);
      setFoods([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar");
    } finally {
      setLoading(false);
    }
  }

  if (meals.length === 0) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <p className="font-display text-2xl text-nootr-cream">Sua dieta ainda está vazia</p>
        <p className="mt-2 text-sm text-nootr-muted">
          Para registrar substituições, primeiro monte sua dieta base.
        </p>
        <Link href="/dieta" className="btn-primary mt-6">
          Montar minha dieta
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={handleSubmit} className="card space-y-5">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ACTION_LABELS) as SubstitutionAction[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => switchAction(key)}
              className={`chip ${action === key ? "chip-active" : ""}`}
            >
              {ACTION_LABELS[key]}
            </button>
          ))}
        </div>
        <p className="text-xs text-nootr-faint">{ACTION_HINTS[action]}</p>

        <div>
          <label className="label-caps">Refeição</label>
          <select className="input-field" value={mealId} onChange={(e) => { setMealId(e.target.value); setMissingFoodName(""); }}>
            <option value="">Escolha a refeição…</option>
            {meals.map((meal) => (
              <option key={meal.id} value={meal.id}>
                {meal.name} ({meal.time})
              </option>
            ))}
          </select>
        </div>

        {action === "missing_food" && selectedMeal && (
          <div>
            <label className="label-caps">O que está em falta?</label>
            <select
              className="input-field"
              value={missingFoodName}
              onChange={(e) => setMissingFoodName(e.target.value)}
            >
              <option value="">Escolha o alimento…</option>
              {selectedMeal.foods.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name} — {f.quantity}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-3">
          <label className="label-caps">
            {action === "missing_food" ? "O que você tem no lugar" : "Alimentos e quantidades"}
          </label>

          {action === "missing_food" ? (
            <>
              {!missingFoodName && (
                <p className="text-xs text-nootr-faint">Escolha acima o alimento que está em falta.</p>
              )}

              {missingFoodName && (
                <>
                  {loadingMatches && <p className="text-xs text-nootr-faint">Olhando sua despensa…</p>}

                  {!loadingMatches && pantryMatches.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs text-nootr-muted">
                        Da sua despensa (mesmo perfil nutricional):
                      </p>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {pantryMatches.map((m, i) => (
                          <PantryMatchCard key={`${m.taco_id ?? "c"}-${i}`} match={m} onAdd={() => addMatch(m)} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-dashed border-nootr-line px-3 py-3 text-center">
                    <p className="text-xs text-nootr-muted">
                      Esses itens não estão disponíveis também ou não gostou de nenhuma opção?
                    </p>
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleShowAlternatives}
                        disabled={loadingAlternatives}
                        className="btn-secondary px-3 py-1.5 text-xs"
                      >
                        {loadingAlternatives ? "Pensando…" : "Buscar outros alimentos"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddNew((v) => !v)}
                        className={`chip ${showAddNew ? "chip-active" : ""}`}
                      >
                        Adicionar novo alimento
                      </button>
                    </div>
                  </div>

                  {alternatives.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs text-nootr-muted">Sugestões da IA:</p>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {alternatives.map((m, i) => (
                          <PantryMatchCard key={`${m.taco_id ?? "c"}-${i}`} match={m} onAdd={() => addMatch(m)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {showAddNew && (
                    <div className="rounded-xl border border-nootr-line bg-nootr-black/40 p-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
                        Adicionar à despensa
                      </p>
                      <FoodAdder token={token} onAdd={handleAddNewFood} />
                    </div>
                  )}
                </>
              )}

              <AddedFoodList
                foods={foods}
                onRemove={(i) => setFoods((prev) => prev.filter((_, j) => j !== i))}
                onEdit={(i, f) => setFoods((prev) => prev.map((x, j) => (j === i ? f : x)))}
              />
            </>
          ) : (
            <>
              {/* Interpretação por IA (conversa — ela pode perguntar de volta) */}
              <div className="rounded-xl border border-nootr-line bg-nootr-black/40 p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
                    Descrever com IA
                    <span className="rounded bg-nootr-wine px-1.5 py-0.5 text-[9px] normal-case tracking-normal text-nootr-muted">
                      beta
                    </span>
                  </label>
                  {conversation.length > 0 && (
                    <button type="button" onClick={cancelAiConversation} className="text-xs text-nootr-muted hover:text-nootr-bordoSoft">
                      cancelar
                    </button>
                  )}
                </div>

                {conversation.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {conversation.map((turn, i) => (
                      <div
                        key={i}
                        className={`flex ${turn.role === "assistant" ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                            turn.role === "assistant"
                              ? "rounded-bl-sm bg-nootr-wine/50 text-nootr-cream"
                              : "rounded-br-sm bg-nootr-bordo/70 text-nootr-cream"
                          }`}
                        >
                          <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-caps text-nootr-bordoSoft/80">
                            {turn.role === "assistant" ? "Nootr" : "Você"}
                          </p>
                          {turn.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <textarea
                  className="input-field min-h-[60px]"
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  placeholder={
                    conversation.length > 0
                      ? "Responda aqui…"
                      : "Ex: comi dois ovos, um pão francês e uma banana"
                  }
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-nootr-faint">{aiNote}</p>
                  <button
                    type="button"
                    onClick={handleAiParse}
                    disabled={aiLoading || aiText.trim().length < 2}
                    className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
                  >
                    {aiLoading ? "Pensando…" : conversation.length > 0 ? "Responder" : "Interpretar"}
                  </button>
                </div>
              </div>

              <AddedFoodList
                foods={foods}
                onRemove={(i) => setFoods((prev) => prev.filter((_, j) => j !== i))}
                onEdit={(i, f) => setFoods((prev) => prev.map((x, j) => (j === i ? f : x)))}
              />
              <FoodAdder token={token} onAdd={(f) => setFoods((prev) => [...prev, f])} />
            </>
          )}
        </div>

        {error && <p className="text-sm text-nootr-bordoSoft">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Adaptando dieta…" : "Adaptar dieta do dia"}
        </button>
      </form>

      <div className="card h-fit lg:sticky lg:top-24">
        <p className="label-caps">Resultado</p>
        {!result ? (
          <p className="mt-3 text-sm text-nootr-faint">
            Adicione os alimentos ao lado para ver o ajuste do seu dia.
          </p>
        ) : (
          <div className="rise-in mt-4 space-y-5">
            {result.wildcard_added && (
              <div className="rounded-xl border border-nootr-bordo/30 bg-nootr-wine/40 p-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
                  Coringa da despensa
                </p>
                <p className="text-sm leading-relaxed text-nootr-cream">
                  Também adicionamos <strong>{result.wildcard_added}</strong> — estava faltando na refeição e você
                  tem esse item em casa.
                </p>
              </div>
            )}

            {/* Explicação da IA */}
            {result.ai_explanation ? (
              <div className="rounded-xl border border-nootr-bordo/30 bg-nootr-wine/40 p-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
                  Explicação
                </p>
                <p className="text-sm leading-relaxed text-nootr-cream">{result.ai_explanation}</p>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-nootr-cream">{result.suggestion}</p>
            )}

            {/* Macros antes -> depois + meta */}
            <div>
              <p className="label-caps">Macros do dia</p>
              <div className="mt-2 overflow-hidden rounded-xl border border-nootr-line">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-nootr-line text-[11px] uppercase tracking-caps text-nootr-faint">
                      <th className="px-3 py-2 text-left font-semibold"> </th>
                      <th className="px-2 py-2 text-right font-semibold">Antes</th>
                      <th className="px-2 py-2 text-right font-semibold">Depois</th>
                      <th className="px-3 py-2 text-right font-semibold">Meta</th>
                    </tr>
                  </thead>
                  <tbody className="text-nootr-cream">
                    <MacroRow label="Calorias" unit="kcal" before={result.macros_before.calories} after={result.macros_after.calories} target={result.targets.calories} />
                    <MacroRow label="Proteína" unit="g" before={result.macros_before.protein_g} after={result.macros_after.protein_g} target={result.targets.protein_g} pctBefore={result.macros_before.protein_pct} pctAfter={result.macros_after.protein_pct} />
                    <MacroRow label="Carboidrato" unit="g" before={result.macros_before.carbs_g} after={result.macros_after.carbs_g} target={result.targets.carbs_g} pctBefore={result.macros_before.carbs_pct} pctAfter={result.macros_after.carbs_pct} />
                    <MacroRow label="Gordura" unit="g" before={result.macros_before.fat_g} after={result.macros_after.fat_g} target={result.targets.fat_g} pctBefore={result.macros_before.fat_pct} pctAfter={result.macros_after.fat_pct} />
                  </tbody>
                </table>
              </div>
              <p className="mt-1.5 text-xs text-nootr-faint">% é a fração das calorias vinda de cada macro.</p>
            </div>

            {/* Todas as refeições com quantidades (a mudança principal é aqui) */}
            <div>
              <p className="label-caps">Dia ajustado — quantidades</p>
              <div className="mt-2 space-y-2">
                {result.adjusted_meals.map((meal) => (
                  <div key={meal.id} className="rounded-lg border border-nootr-line px-3.5 py-2.5">
                    <div className="flex justify-between text-sm">
                      <p className="font-medium text-nootr-cream">{meal.name}</p>
                      <p className="text-nootr-faint">{meal.time}</p>
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {meal.foods.map((f, j) => (
                        <li key={`${f.name}-${j}`} className="flex items-baseline justify-between gap-3 text-xs">
                          <span className="text-nootr-cream">{f.name}</span>
                          <span className="shrink-0 tabular-nums text-nootr-muted">
                            {f.quantity} · {Math.round(f.calories)} kcal
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MacroRow({
  label,
  unit,
  before,
  after,
  target,
  pctBefore,
  pctAfter,
}: {
  label: string;
  unit: string;
  before: number;
  after: number;
  target: number;
  pctBefore?: number;
  pctAfter?: number;
}) {
  const changed = Math.round(before) !== Math.round(after);
  return (
    <tr className="border-b border-nootr-line/60 last:border-0">
      <td className="px-3 py-2 text-nootr-muted">{label}</td>
      <td className="px-2 py-2 text-right tabular-nums text-nootr-faint">
        {Math.round(before)}
        {unit}
        {pctBefore != null && <span className="ml-1 text-[10px]">({pctBefore}%)</span>}
      </td>
      <td className={`px-2 py-2 text-right tabular-nums ${changed ? "text-nootr-bordoSoft" : "text-nootr-cream"}`}>
        {Math.round(after)}
        {unit}
        {pctAfter != null && <span className="ml-1 text-[10px]">({pctAfter}%)</span>}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-nootr-muted">
        {Math.round(target)}
        {unit}
      </td>
    </tr>
  );
}

export function SubstitutionPanel({ token, meals }: { token: string; meals: Meal[] }) {
  return (
    <Suspense fallback={<p className="text-sm text-nootr-muted">Carregando…</p>}>
      <SubstituirForm token={token} meals={meals} />
    </Suspense>
  );
}
