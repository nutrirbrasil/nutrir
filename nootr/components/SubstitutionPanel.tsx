"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { nootrApi } from "@/lib/api";
import { FoodAdder, AddedFoodList, type AddedFood } from "@/components/FoodAdder";
import type { Meal, SubstitutionAction, SubstitutionResult } from "@/lib/types";

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

  const selectedMeal = useMemo(() => meals.find((m) => m.id === mealId) ?? null, [meals, mealId]);

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
    if (action === "missing_food" && (!mealId || !missingFoodName)) {
      setError("Escolha a refeição e o alimento que está em falta.");
      return;
    }
    setLoading(true);
    try {
      const data = await nootrApi.suggestSubstitution(token, {
        action,
        meal_id: mealId || null,
        foods: foods.map((f) => ({
          taco_id: f.taco_id,
          grams: f.grams,
          quantity_label: f.quantity_label,
        })),
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
        <Link href="/montar-dieta" className="btn-primary mt-6">
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
            <option value="">{action === "missing_food" ? "Escolha a refeição…" : "Detectar pelo horário"}</option>
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
          <AddedFoodList foods={foods} onRemove={(i) => setFoods((prev) => prev.filter((_, j) => j !== i))} />
          <FoodAdder token={token} onAdd={(f) => setFoods((prev) => [...prev, f])} />
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
            <p className="text-sm leading-relaxed text-nootr-cream">{result.suggestion}</p>

            <div className="rounded-xl border border-nootr-bordo/30 bg-nootr-wine/40 p-4">
              <p className="text-xs uppercase tracking-caps text-nootr-muted">Restante do dia</p>
              <p className="mt-1 font-display text-3xl text-nootr-cream">
                {Math.round(result.remaining_calories)} <span className="text-base text-nootr-muted">kcal</span>
                <span className="mx-3 text-nootr-line">·</span>
                {Math.round(result.remaining_protein_g)}
                <span className="text-base text-nootr-muted">g proteína</span>
              </p>
            </div>

            <div>
              <p className="label-caps">Refeições ajustadas</p>
              <div className="mt-2 space-y-2">
                {result.adjusted_meals.map((meal) => (
                  <div key={meal.id} className="rounded-lg border border-nootr-line px-3.5 py-2.5">
                    <div className="flex justify-between text-sm">
                      <p className="font-medium text-nootr-cream">{meal.name}</p>
                      <p className="text-nootr-faint">{meal.time}</p>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-nootr-muted">
                      {meal.foods.map((f) => f.name).join(" · ")}
                    </p>
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

export function SubstitutionPanel({ token, meals }: { token: string; meals: Meal[] }) {
  return (
    <Suspense fallback={<p className="text-sm text-nootr-muted">Carregando…</p>}>
      <SubstituirForm token={token} meals={meals} />
    </Suspense>
  );
}
