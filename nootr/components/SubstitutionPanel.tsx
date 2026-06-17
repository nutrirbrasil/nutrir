"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { nootrApi } from "@/lib/api";
import type { SubstitutionAction, SubstitutionResult } from "@/lib/types";

const ACTION_LABELS: Record<SubstitutionAction, string> = {
  ate_different: "Comi algo diferente",
  will_eat_different: "Vou comer algo diferente",
  missing_food: "Estou em falta",
};

function SubstituirForm() {
  const searchParams = useSearchParams();
  const initialAction = (searchParams.get("acao") as SubstitutionAction) || "ate_different";

  const [action, setAction] = useState<SubstitutionAction>(initialAction);
  const [description, setDescription] = useState("");
  const [availableFoods, setAvailableFoods] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubstitutionResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await nootrApi.suggestSubstitution({
        action,
        description,
        available_foods:
          action === "missing_food" && availableFoods
            ? availableFoods.split(",").map((s) => s.trim())
            : undefined,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={handleSubmit} className="card space-y-4">
        <h2 className="text-lg font-bold">{ACTION_LABELS[action]}</h2>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(ACTION_LABELS) as SubstitutionAction[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setAction(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                action === key
                  ? "bg-nootr-blue text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {ACTION_LABELS[key]}
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            {action === "missing_food"
              ? "O que está em falta?"
              : "Descreva o alimento ou refeição"}
          </label>
          <textarea
            required
            className="input-field min-h-[100px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              action === "ate_different"
                ? "Ex: Comi um hambúrguer no almoço"
                : action === "will_eat_different"
                  ? "Ex: Vou jantar pizza hoje"
                  : "Ex: Não tenho frango, só tenho atum"
            }
          />
        </div>

        {action === "missing_food" && (
          <div>
            <label className="mb-1 block text-sm font-medium">
              O que você tem disponível? (separado por vírgula)
            </label>
            <input
              className="input-field"
              value={availableFoods}
              onChange={(e) => setAvailableFoods(e.target.value)}
              placeholder="Ex: atum, arroz, salada"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Adaptando dieta..." : "Adaptar dieta do dia"}
        </button>
      </form>

      <div className="card h-fit">
        <h3 className="font-bold text-nootr-dark">Resultado</h3>
        {!result ? (
          <p className="mt-2 text-sm text-gray-500">
            Preencha o formulário para ver sugestões de ajuste na dieta.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-sm">{result.suggestion}</p>
            <div className="rounded-xl bg-nootr-light p-4 text-sm">
              <p>
                Restante do dia: <strong>{result.remaining_calories} kcal</strong> ·{" "}
                <strong>{result.remaining_protein_g}g proteína</strong>
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
                Refeições ajustadas (preview)
              </p>
              {result.adjusted_meals.map((meal) => (
                <div key={meal.id} className="mb-2 rounded-lg border p-3 text-sm">
                  <p className="font-medium">{meal.name}</p>
                  <p className="text-gray-500">{meal.foods.map((f) => f.name).join(", ")}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SubstitutionPanel() {
  return (
    <Suspense fallback={<p>Carregando...</p>}>
      <SubstituirForm />
    </Suspense>
  );
}
