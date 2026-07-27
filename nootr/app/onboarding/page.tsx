"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";
import { PlanCard } from "@/components/PlanCard";
import { TagListInput } from "@/components/TagListInput";
import { TacoTagListInput } from "@/components/TacoTagListInput";
import {
  CalorieCalculator, CALORIE_CALCULATOR_DEFAULT, calorieCalculatorPayload, type CalorieCalculatorState,
} from "@/components/CalorieCalculator";
import { nootrApi } from "@/lib/api";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import {
  PRO_SOON, BASIC_FEATURES, PRO_FEATURES, PRO_BONUS, PRO_ANNUAL_BILLING_NOTE, formatPlanPrice,
  type BillingCycle,
} from "@/lib/plan";
import type { Plan } from "@/lib/types";

type Step = "country" | "plan" | "allergies" | "medical" | "preferences" | "calories" | "meals";

// Espelha backend/app/services/meal_planning.MEAL_TEMPLATES (mantido em
// sincronia à mão), só pra sugerir nome/horário padrão de cada refeição
// aqui, quem decide de fato o template na geração é o backend.
const MEAL_NAME_TEMPLATES: Record<number, { name: string; time: string }[]> = {
  3: [
    { name: "Café da manhã", time: "07:00" },
    { name: "Almoço", time: "12:00" },
    { name: "Jantar", time: "20:00" },
  ],
  4: [
    { name: "Café da manhã", time: "07:00" },
    { name: "Almoço", time: "12:00" },
    { name: "Lanche da tarde", time: "16:00" },
    { name: "Jantar", time: "20:00" },
  ],
  5: [
    { name: "Café da manhã", time: "07:00" },
    { name: "Lanche da manhã", time: "10:00" },
    { name: "Almoço", time: "12:30" },
    { name: "Lanche da tarde", time: "16:00" },
    { name: "Jantar", time: "20:00" },
  ],
  6: [
    { name: "Café da manhã", time: "07:00" },
    { name: "Lanche da manhã", time: "10:00" },
    { name: "Almoço", time: "12:30" },
    { name: "Lanche da tarde", time: "16:00" },
    { name: "Jantar", time: "20:00" },
    { name: "Ceia", time: "22:00" },
  ],
};

/**
 * Conta nova (sem has_profile ainda, ver GET /nootr/profile): país, plano,
 * alergias, condições médicas, gosto/despensa e meta calórica antes de
 * entrar no app, ver redirecionamento em app/dieta/page.tsx. Alergias vão
 * pra preferences.allergies (checagem determinística em
 * food_matcher.matches_allergen, nunca só a IA), condições médicas viram
 * texto em preferences.notes e gosto/despensa em preferences.likes/pantry,
 * tudo contexto pra IA em todas as sugestões automáticas (coringa, ajuste de
 * fim de dia, alternativas, geração de dieta). A etapa de calorias deixa o
 * perfil pronto pra já poder gerar uma dieta pronta (Pro) assim que entra no
 * app, sem precisar passar por Perfil antes. Escolher um plano aqui só grava
 * profile.plan, sem cobrança nenhuma por enquanto, é só um clique.
 */
function OnboardingContent({ token }: { token: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("country");
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("BR");
  const [plan, setPlan] = useState<Plan>("basic");
  // Ciclo do Pro (Basic não tem opção anual, ver lib/plan.ts PLAN_PRICES),
  // pré-selecionado no anual pra destacar a economia por padrão.
  const [proCycle, setProCycle] = useState<BillingCycle>("anual");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [medicalConditions, setMedicalConditions] = useState("");
  const [likesPantry, setLikesPantry] = useState<string[]>([]);
  const [calState, setCalState] = useState<CalorieCalculatorState>(CALORIE_CALCULATOR_DEFAULT);
  const [mealCount, setMealCount] = useState(4);
  const [mealTimes, setMealTimes] = useState<string[]>(MEAL_NAME_TEMPLATES[4].map((m) => m.time));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function patchCal(patch: Partial<CalorieCalculatorState>) {
    setCalState((s) => ({ ...s, ...patch }));
  }

  function changeMealCount(count: number) {
    setMealCount(count);
    setMealTimes(MEAL_NAME_TEMPLATES[count].map((m) => m.time));
  }

  function changeMealTime(index: number, time: string) {
    setMealTimes((prev) => prev.map((t, i) => (i === index ? time : t)));
  }

  async function finish() {
    setError("");
    setSaving(true);
    try {
      const profileBody = {
        full_name: fullName.trim() || undefined,
        country, plan, billing_cycle: plan === "pro" ? proCycle : "mensal",
        ...calorieCalculatorPayload(calState),
      };
      await nootrApi.updateProfile(token, profileBody);
      await nootrApi.updatePreferences(token, {
        allergies,
        likes: likesPantry,
        pantry: likesPantry,
        notes: medicalConditions.trim() ? `Condições médicas: ${medicalConditions.trim()}` : undefined,
        meal_count: mealCount,
        meal_times: mealTimes,
      });
      router.replace("/dieta");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar seus dados");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg py-10">
      <div className="divider-bordo mb-6" />

      {step === "country" && (
        <>
          <h1 className="font-display text-2xl text-nootr-cream sm:text-4xl">Antes de começar</h1>
          <p className="mt-2 text-sm text-nootr-muted">
            Algumas informações básicas pra personalizar sua experiência.
          </p>
          <div className="mt-6">
            <label className="label-caps">Nome completo</label>
            <input
              className="input-field"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
            />
          </div>
          <div className="mt-4">
            <label className="label-caps">País</label>
            <select className="input-field" value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={() => setStep("plan")} className="btn-primary mt-8 w-full py-3">
            Continuar
          </button>
        </>
      )}

      {step === "plan" && (
        <>
          <h1 className="font-display text-2xl text-nootr-cream sm:text-4xl">Escolha seu plano</h1>
          <p className="mt-2 text-sm text-nootr-muted">
            Você pode trocar de plano a qualquer momento em Perfil.
          </p>

          <div className="mt-6 grid grid-cols-2 items-stretch gap-2.5 sm:gap-4">
            <PlanCard
              name="Basic"
              price={formatPlanPrice("basic")}
              features={BASIC_FEATURES}
              cta={
                <button
                  type="button"
                  onClick={() => {
                    setPlan("basic");
                    setStep("allergies");
                  }}
                  className="btn-secondary w-full"
                >
                  Escolher
                </button>
              }
            />

            <PlanCard
              name="Pro"
              price={formatPlanPrice("pro", proCycle)}
              billingNote={proCycle === "anual" ? PRO_ANNUAL_BILLING_NOTE : undefined}
              cycleToggle={{ value: proCycle, onChange: setProCycle }}
              badge="Mais escolhido"
              highlighted
              features={PRO_FEATURES}
              soon={PRO_SOON}
              bonus={PRO_BONUS}
              cta={
                <button
                  type="button"
                  onClick={() => {
                    setPlan("pro");
                    setStep("allergies");
                  }}
                  className="btn-primary w-full"
                >
                  Escolher
                </button>
              }
            />
          </div>

          <button
            type="button"
            onClick={() => setStep("country")}
            className="mt-6 text-xs text-nootr-faint transition-colors hover:text-nootr-bordoSoft"
          >
            ← voltar
          </button>
        </>
      )}

      {step === "allergies" && (
        <>
          <h1 className="font-display text-2xl text-nootr-cream sm:text-4xl">Você possui alergia a algum alimento?</h1>
          <p className="mt-2 text-sm text-nootr-muted">
            Nunca sugerimos esses alimentos em nenhuma substituição. Caso não tiver nenhuma, apenas
            clique em Continuar.
          </p>
          <div className="mt-6">
            <TagListInput
              label="Alergias"
              hint="Ex: lactose, amendoim, camarão, glúten..."
              value={allergies}
              onChange={setAllergies}
            />
          </div>
          <button type="button" onClick={() => setStep("medical")} className="btn-primary mt-8 w-full py-3">
            Continuar
          </button>
          <button
            type="button"
            onClick={() => setStep("plan")}
            className="mt-4 text-xs text-nootr-faint transition-colors hover:text-nootr-bordoSoft"
          >
            ← voltar
          </button>
        </>
      )}

      {step === "medical" && (
        <>
          <h1 className="font-display text-2xl text-nootr-cream sm:text-4xl">Possui alguma condição médica?</h1>
          <p className="mt-2 text-sm text-nootr-muted">
            Ex: diabetes, hipertensão, algum transtorno alimentar. Ajuda o Nootr a levar isso em conta nas
            sugestões, pode deixar em branco se não tiver nenhuma.
          </p>
          <div className="mt-6">
            <textarea
              className="input-field min-h-[100px]"
              value={medicalConditions}
              onChange={(e) => setMedicalConditions(e.target.value)}
              placeholder="Ex: diabetes tipo 2"
            />
          </div>

          <button type="button" onClick={() => setStep("preferences")} className="btn-primary mt-8 w-full py-3">
            Continuar
          </button>
          <button
            type="button"
            onClick={() => setStep("allergies")}
            className="mt-4 text-xs text-nootr-faint transition-colors hover:text-nootr-bordoSoft"
          >
            ← voltar
          </button>
        </>
      )}

      {step === "preferences" && (
        <>
          <h1 className="font-display text-2xl text-nootr-cream sm:text-4xl">O que você gosta ou costuma ter em casa?</h1>
          <p className="mt-2 text-sm text-nootr-muted">
            O Nootr prioriza esses alimentos nas substituições, sempre que fizerem sentido.
          </p>
          <div className="mt-6">
            <TacoTagListInput
              token={token}
              label="Gosto e Costumo ter em casa"
              hint="Escreva o nome do alimento e aparecerá uma lista de opções semelhantes. Em caso de não aparecer a sua opção, depois você poderá criar seus próprios alimentos, escanear código de barras, criar receitas..."
              value={likesPantry}
              onChange={setLikesPantry}
            />
          </div>
          <button type="button" onClick={() => setStep("calories")} className="btn-primary mt-8 w-full py-3">
            Continuar
          </button>
          <button
            type="button"
            onClick={() => setStep("medical")}
            className="mt-4 text-xs text-nootr-faint transition-colors hover:text-nootr-bordoSoft"
          >
            ← voltar
          </button>
        </>
      )}

      {step === "calories" && (
        <>
          <h1 className="font-display text-2xl text-nootr-cream sm:text-4xl">Qual sua meta calórica?</h1>
          <p className="mt-2 text-sm text-nootr-muted">
            Defina manualmente ou deixe o Nootr calcular a partir dos seus dados, isso já deixa seu perfil
            pronto pra gerar uma dieta completa assim que você entrar.
          </p>
          <div className="mt-6">
            <CalorieCalculator state={calState} onChange={patchCal} />
          </div>

          <button type="button" onClick={() => setStep("meals")} className="btn-primary mt-8 w-full py-3">
            Continuar
          </button>
          <button
            type="button"
            onClick={() => setStep("preferences")}
            className="mt-4 text-xs text-nootr-faint transition-colors hover:text-nootr-bordoSoft"
          >
            ← voltar
          </button>
        </>
      )}

      {step === "meals" && (
        <>
          <h1 className="font-display text-2xl text-nootr-cream sm:text-4xl">Quantas refeições você costuma fazer?</h1>
          <p className="mt-2 text-sm text-nootr-muted">
            Usamos isso pra montar sua dieta pronta (Pro) no formato que você já está acostumado.
            Menos de 4? Vamos usar 4 mesmo assim, pra manter as refeições balanceadas.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[3, 4, 5, 6].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => changeMealCount(count)}
                className={`chip ${mealCount === count ? "chip-active" : ""}`}
              >
                {count}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            {MEAL_NAME_TEMPLATES[mealCount].map((meal, i) => (
              <div key={meal.name} className="flex items-center gap-3">
                <label className="w-40 shrink-0 text-sm text-nootr-cream">{meal.name}</label>
                <input
                  type="time"
                  className="input-field"
                  value={mealTimes[i] ?? meal.time}
                  onChange={(e) => changeMealTime(i, e.target.value)}
                />
              </div>
            ))}
          </div>

          {error && <p className="mt-4 text-sm text-nootr-bordoSoft">{error}</p>}

          <button type="button" onClick={finish} disabled={saving} className="btn-primary mt-8 w-full py-3 disabled:opacity-60">
            {saving ? "Salvando…" : "Concluir"}
          </button>
          <button
            type="button"
            onClick={() => setStep("calories")}
            className="mt-4 text-xs text-nootr-faint transition-colors hover:text-nootr-bordoSoft"
          >
            ← voltar
          </button>
        </>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  return <RequireAuth>{(token) => <OnboardingContent token={token} />}</RequireAuth>;
}
