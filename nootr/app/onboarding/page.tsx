"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";
import { PlanCard } from "@/components/PlanCard";
import { TagListInput } from "@/components/TagListInput";
import { nootrApi } from "@/lib/api";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import {
  PRO_SOON, BASIC_FEATURES, PRO_FEATURES, PRO_BONUS, PRO_ANNUAL_BILLING_NOTE, formatPlanPrice,
  type BillingCycle,
} from "@/lib/plan";
import type { Plan } from "@/lib/types";

type Step = "country" | "plan" | "allergies" | "medical";

/**
 * Conta nova (sem has_profile ainda, ver GET /nootr/profile): país, plano,
 * alergias e condições médicas antes de entrar no app, ver redirecionamento
 * em app/dieta/page.tsx. Alergias vão pra preferences.allergies (checagem
 * determinística em food_matcher.matches_allergen, nunca só a IA) e condições
 * médicas viram texto em preferences.notes (contexto pra IA em todas as
 * sugestões automáticas, coringa, ajuste de fim de dia, alternativas).
 * Escolher um plano aqui só grava profile.plan, sem cobrança nenhuma por
 * enquanto, é só um clique.
 */
function OnboardingContent({ token }: { token: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("country");
  const [country, setCountry] = useState("BR");
  const [plan, setPlan] = useState<Plan>("basic");
  // Ciclo do Pro (Basic não tem opção anual, ver lib/plan.ts PLAN_PRICES),
  // pré-selecionado no anual pra destacar a economia por padrão.
  const [proCycle, setProCycle] = useState<BillingCycle>("anual");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [medicalConditions, setMedicalConditions] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function finish() {
    setError("");
    setSaving(true);
    try {
      await nootrApi.updateProfile(token, { country, plan, billing_cycle: plan === "pro" ? proCycle : "mensal" });
      if (allergies.length > 0 || medicalConditions.trim()) {
        await nootrApi.updatePreferences(token, {
          allergies,
          notes: medicalConditions.trim() ? `Condições médicas: ${medicalConditions.trim()}` : undefined,
        });
      }
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
          <h1 className="font-display text-4xl text-nootr-cream">De onde você é?</h1>
          <p className="mt-2 text-sm text-nootr-muted">
            Usamos isso pra ajustar substituições à sua realidade.
          </p>
          <div className="mt-6">
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
          <h1 className="font-display text-4xl text-nootr-cream">Escolha seu plano</h1>
          <p className="mt-2 text-sm text-nootr-muted">
            Você pode trocar de plano a qualquer momento em Perfil.
          </p>

          <div className="mt-6 grid items-stretch gap-4 sm:grid-cols-2">
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
          <h1 className="font-display text-4xl text-nootr-cream">Você possui alergia a algum alimento?</h1>
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
          <h1 className="font-display text-4xl text-nootr-cream">Possui alguma condição médica?</h1>
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

          {error && <p className="mt-4 text-sm text-nootr-bordoSoft">{error}</p>}

          <button type="button" onClick={finish} disabled={saving} className="btn-primary mt-8 w-full py-3 disabled:opacity-60">
            {saving ? "Salvando…" : "Concluir"}
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
    </div>
  );
}

export default function OnboardingPage() {
  return <RequireAuth>{(token) => <OnboardingContent token={token} />}</RequireAuth>;
}
