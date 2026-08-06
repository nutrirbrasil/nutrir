"use client";

import type { ActivityLevel, Formula } from "@/lib/types";

export interface CalorieCalculatorState {
  formula: Formula;
  objective: "weight_loss" | "muscle_gain";
  sex: "m" | "f" | "";
  age: string;
  weight: string;
  height: string;
  activity: ActivityLevel | "";
  manualCalories: string;
}

export const CALORIE_CALCULATOR_DEFAULT: CalorieCalculatorState = {
  formula: "manual",
  objective: "weight_loss",
  sex: "",
  age: "",
  weight: "",
  height: "",
  activity: "",
  manualCalories: "",
};

const ACTIVITY_OPTIONS: { id: ActivityLevel; label: string; hint: string }[] = [
  { id: "sedentario", label: "Sedentário", hint: "pouco ou nenhum exercício" },
  { id: "leve", label: "Leve", hint: "1–3x por semana" },
  { id: "moderado", label: "Moderado", hint: "3–5x por semana" },
  { id: "intenso", label: "Intenso", hint: "6–7x por semana" },
  { id: "atleta", label: "Atleta", hint: "2x por dia" },
];

const OBJECTIVE_OPTIONS = [
  { id: "weight_loss", label: "Perda de Peso", formula: "mifflin_st_jeor" as Formula },
  { id: "muscle_gain", label: "Ganho de Massa", formula: "harris_benedict" as Formula },
];

/** Monta o patch de PUT /nootr/profile a partir do estado da calculadora. */
export function calorieCalculatorPayload(state: CalorieCalculatorState): Record<string, unknown> {
  const body: Record<string, unknown> = { formula: state.formula };
  if (state.sex) body.sex = state.sex;
  if (state.age) body.age = parseInt(state.age, 10);
  if (state.weight) body.weight_kg = parseFloat(state.weight.replace(",", "."));
  if (state.height) body.height_cm = parseFloat(state.height.replace(",", "."));
  if (state.activity) body.activity_level = state.activity;
  if (state.formula === "manual" && state.manualCalories) {
    body.target_calories = parseFloat(state.manualCalories.replace(",", "."));
  } else if (state.formula !== "manual") {
    body.formula = state.objective === "weight_loss" ? "mifflin_st_jeor" : "harris_benedict";
  }
  return body;
}

/** Meta calórica definida manualmente ou por fórmula (dados corporais completos)
 * — usado em Perfil (upgrade opcional dos dados existentes) e no onboarding
 * (etapa final, pra já deixar o perfil pronto pra gerar dieta). */
export function CalorieCalculator({
  state,
  onChange,
}: {
  state: CalorieCalculatorState;
  onChange: (patch: Partial<CalorieCalculatorState>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange({ formula: "manual" })}
          className={`chip ${state.formula === "manual" ? "chip-active" : ""}`}
        >
          Definir manualmente
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({ formula: state.objective === "weight_loss" ? "mifflin_st_jeor" : "harris_benedict" })
          }
          className={`chip ${state.formula !== "manual" ? "chip-active" : ""}`}
        >
          Calcular
        </button>
      </div>

      {state.formula === "manual" ? (
        // Mesmo com as calorias definidas à mão, peso/sexo/altura continuam
        // sendo pedidos: as metas de proteína e gordura são calculadas por
        // grama por quilo de peso (ver backend energy.macro_targets_from_weight),
        // não por percentual das calorias, então sem o peso não dá pra montar
        // a dieta corretamente.
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 max-w-xs">
            <label className="label-caps" htmlFor="calorie-calc-manual-calories">Calorias diárias (kcal)</label>
            <input
              id="calorie-calc-manual-calories"
              className="input-field"
              inputMode="numeric"
              placeholder="Ex: 2000"
              value={state.manualCalories}
              onChange={(e) => onChange({ manualCalories: e.target.value })}
            />
          </div>
          <p className="sm:col-span-2 -mt-1 text-xs text-nootr-faint">
            Precisamos também dos seus dados corporais: as metas de proteína e gordura são
            calculadas por quilo de peso, não pela porcentagem das calorias.
          </p>
          <div>
            <p className="label-caps">Sexo</p>
            <div className="flex gap-2" role="group" aria-label="Sexo">
              {[
                { id: "m", label: "Masculino" },
                { id: "f", label: "Feminino" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChange({ sex: s.id as "m" | "f" })}
                  className={`chip flex-1 ${state.sex === s.id ? "chip-active" : ""}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-caps" htmlFor="calorie-calc-age">Idade</label>
            <input
              id="calorie-calc-age"
              className="input-field"
              inputMode="numeric"
              placeholder="anos"
              value={state.age}
              onChange={(e) => onChange({ age: e.target.value })}
            />
          </div>
          <div>
            <label className="label-caps" htmlFor="calorie-calc-weight">Peso (kg)</label>
            <input
              id="calorie-calc-weight"
              className="input-field"
              inputMode="decimal"
              placeholder="Ex: 72,5"
              value={state.weight}
              onChange={(e) => onChange({ weight: e.target.value })}
            />
          </div>
          <div>
            <label className="label-caps" htmlFor="calorie-calc-height">Altura (cm)</label>
            <input
              id="calorie-calc-height"
              className="input-field"
              inputMode="numeric"
              placeholder="Ex: 175"
              value={state.height}
              onChange={(e) => onChange({ height: e.target.value })}
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="label-caps">Objetivo</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Objetivo">
              {OBJECTIVE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    onChange({ objective: opt.id as "weight_loss" | "muscle_gain", formula: opt.formula })
                  }
                  className={`chip ${state.objective === opt.id ? "chip-active" : ""}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="label-caps">Sexo</p>
            <div className="flex gap-2" role="group" aria-label="Sexo">
              {[
                { id: "m", label: "Masculino" },
                { id: "f", label: "Feminino" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChange({ sex: s.id as "m" | "f" })}
                  className={`chip flex-1 ${state.sex === s.id ? "chip-active" : ""}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-caps" htmlFor="calorie-calc-age">Idade</label>
            <input
              id="calorie-calc-age"
              className="input-field"
              inputMode="numeric"
              placeholder="anos"
              value={state.age}
              onChange={(e) => onChange({ age: e.target.value })}
            />
          </div>
          <div>
            <label className="label-caps" htmlFor="calorie-calc-weight">Peso (kg)</label>
            <input
              id="calorie-calc-weight"
              className="input-field"
              inputMode="decimal"
              placeholder="Ex: 72,5"
              value={state.weight}
              onChange={(e) => onChange({ weight: e.target.value })}
            />
          </div>
          <div>
            <label className="label-caps" htmlFor="calorie-calc-height">Altura (cm)</label>
            <input
              id="calorie-calc-height"
              className="input-field"
              inputMode="numeric"
              placeholder="Ex: 175"
              value={state.height}
              onChange={(e) => onChange({ height: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <p className="label-caps">Nível de atividade</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Nível de atividade">
              {ACTIVITY_OPTIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onChange({ activity: a.id })}
                  className={`chip ${state.activity === a.id ? "chip-active" : ""}`}
                  title={a.hint}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
