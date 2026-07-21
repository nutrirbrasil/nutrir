"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { PlanCard } from "@/components/PlanCard";
import { nootrApi } from "@/lib/api";
import {
  BASIC_FEATURES, PRO_FEATURES, PRO_SOON, PRO_BONUS, PRO_ANNUAL_BILLING_NOTE, formatPlanPrice,
  type BillingCycle,
} from "@/lib/plan";
import type { Plan, Profile } from "@/lib/types";

/** Troca de plano (acessível pelo menu "Alterar Plano"), mesmo visual de cards do onboarding. */
function PlanoContent({ token }: { token: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Plan | null>(null);
  const [error, setError] = useState("");
  const [proCycle, setProCycle] = useState<BillingCycle>("anual");

  useEffect(() => {
    let active = true;
    nootrApi
      .getProfile(token)
      .then((p) => {
        if (!active) return;
        setProfile(p);
        if (p.plan === "pro") setProCycle(p.billing_cycle);
      })
      .catch(() => active && setError("Não foi possível carregar seu plano."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  async function choosePlan(plan: Plan, billingCycle: BillingCycle = "mensal") {
    setError("");
    setSaving(plan);
    try {
      const updated = await nootrApi.updateProfile(token, { plan, billing_cycle: billingCycle });
      setProfile(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao trocar de plano");
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <p className="text-sm text-nootr-muted">Carregando…</p>;

  const currentPlan = profile?.plan ?? "basic";
  const isCurrentPro = currentPlan === "pro" && profile?.billing_cycle === proCycle;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="divider-bordo mb-4" />
      <h1 className="font-display text-4xl text-nootr-cream">Alterar plano</h1>
      <p className="mt-2 text-sm text-nootr-muted">Troque de plano quando quiser, sem multa, sem burocracia.</p>

      {error && <p className="mt-4 text-sm text-nootr-bordoSoft">{error}</p>}

      <div className="mt-8 grid items-stretch gap-4 sm:grid-cols-2">
        <PlanCard
          name="Basic"
          price={formatPlanPrice("basic")}
          features={BASIC_FEATURES}
          cta={
            currentPlan === "basic" ? (
              <p className="rounded-lg border border-nootr-line py-2.5 text-center text-xs text-nootr-faint">
                Seu plano atual
              </p>
            ) : (
              <button
                type="button"
                onClick={() => choosePlan("basic")}
                disabled={saving !== null}
                className="btn-secondary w-full disabled:opacity-60"
              >
                {saving === "basic" ? "Salvando…" : "Voltar para o Basic"}
              </button>
            )
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
            isCurrentPro ? (
              <p className="rounded-lg border border-nootr-bordo/40 py-2.5 text-center text-xs text-nootr-bordoSoft">
                Seu plano atual
              </p>
            ) : (
              <button
                type="button"
                onClick={() => choosePlan("pro", proCycle)}
                disabled={saving !== null}
                className="btn-primary w-full disabled:opacity-60"
              >
                {saving === "pro"
                  ? "Salvando…"
                  : currentPlan === "pro"
                  ? `Trocar para ${proCycle}`
                  : "Migrar para o Pro"}
              </button>
            )
          }
        />
      </div>
    </div>
  );
}

export default function PlanoPage() {
  return <RequireAuth>{(token) => <PlanoContent token={token} />}</RequireAuth>;
}
