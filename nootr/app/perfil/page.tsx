"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { nootrApi } from "@/lib/api";
import { PRO_SOON } from "@/lib/plan";
import type { ActivityLevel, Formula, Plan, Profile } from "@/lib/types";

const ACTIVITY_OPTIONS: { id: ActivityLevel; label: string; hint: string }[] = [
  { id: "sedentario", label: "Sedentário", hint: "pouco ou nenhum exercício" },
  { id: "leve", label: "Leve", hint: "1–3x por semana" },
  { id: "moderado", label: "Moderado", hint: "3–5x por semana" },
  { id: "intenso", label: "Intenso", hint: "6–7x por semana" },
  { id: "atleta", label: "Atleta", hint: "2x por dia" },
];

const FORMULA_OPTIONS: { id: Formula; label: string; hint: string }[] = [
  { id: "manual", label: "Definir manualmente", hint: "você informa as calorias" },
  { id: "mifflin_st_jeor", label: "Mifflin-St Jeor", hint: "recomendada pela ADA" },
  { id: "harris_benedict", label: "Harris-Benedict", hint: "revisada, 1984" },
];

function PerfilContent({ token }: { token: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const [sex, setSex] = useState<"m" | "f" | "">("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [activity, setActivity] = useState<ActivityLevel | "">("");
  const [formula, setFormula] = useState<Formula>("manual");
  const [manualCalories, setManualCalories] = useState("");

  useEffect(() => {
    let active = true;
    nootrApi
      .getProfile(token)
      .then((p) => {
        if (!active) return;
        setProfile(p);
        setSex(p.sex ?? "");
        setAge(p.age ? String(p.age) : "");
        setWeight(p.weight_kg ? String(p.weight_kg) : "");
        setHeight(p.height_cm ? String(p.height_cm) : "");
        setActivity(p.activity_level ?? "");
        setFormula(p.formula);
        setManualCalories(p.formula === "manual" && p.target_calories ? String(Math.round(p.target_calories)) : "");
      })
      .catch(() => active && setError("Não foi possível carregar o perfil."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  async function switchPlan(plan: Plan) {
    setError("");
    try {
      const updated = await nootrApi.updateProfile(token, { plan });
      setProfile(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao trocar de plano");
    }
  }

  async function handleSave() {
    setError("");
    setSavedMsg("");
    setSaving(true);
    try {
      const body: Record<string, unknown> = { formula };
      if (sex) body.sex = sex;
      if (age) body.age = parseInt(age, 10);
      if (weight) body.weight_kg = parseFloat(weight.replace(",", "."));
      if (height) body.height_cm = parseFloat(height.replace(",", "."));
      if (activity) body.activity_level = activity;
      if (formula === "manual" && manualCalories)
        body.target_calories = parseFloat(manualCalories.replace(",", "."));
      const updated = await nootrApi.updateProfile(token, body);
      setProfile(updated);
      setSavedMsg(
        updated.target_calories
          ? `Salvo — alvo diário: ${Math.round(updated.target_calories)} kcal.`
          : "Salvo."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-nootr-muted">Carregando…</p>;

  const currentPlan = profile?.plan ?? "basic";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="divider-bordo mb-4" />
      <h1 className="font-display text-4xl text-nootr-cream">Perfil</h1>
      <p className="mt-2 text-sm text-nootr-muted">
        Seu plano e os dados usados para calcular suas calorias diárias.
      </p>

      {/* Plano */}
      <section className="mt-10">
        <p className="label-caps">Plano</p>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          {(
            [
              {
                id: "basic" as Plan,
                nome: "Basic",
                preco: "Gratuito",
                itens: ["1 dieta base para todos os dias", "Substituições ilimitadas", "Base TACO completa"],
                soon: [] as string[],
              },
              {
                id: "pro" as Plan,
                nome: "Pro",
                preco: "Em breve",
                itens: ["Até 7 dietas — uma por dia da semana", "Tudo do Basic"],
                soon: PRO_SOON,
              },
            ]
          ).map((p) => {
            const active = currentPlan === p.id;
            return (
              <div
                key={p.id}
                className={`card card-hover relative ${active ? "border-nootr-bordo" : ""}`}
              >
                {active && (
                  <span className="absolute right-4 top-4 rounded-full bg-nootr-bordo px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-caps text-nootr-cream">
                    Atual
                  </span>
                )}
                <p className="font-display text-2xl text-nootr-cream">{p.nome}</p>
                <p className="mt-0.5 text-xs text-nootr-bordoSoft">{p.preco}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-nootr-muted">
                  {p.itens.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-nootr-bordo">—</span>
                      {item}
                    </li>
                  ))}
                </ul>
                {p.soon.length > 0 && (
                  <>
                    <p className="mt-5 text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
                      Em breve no Pro
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm text-nootr-faint">
                      {p.soon.map((item) => (
                        <li key={item}>· {item}</li>
                      ))}
                    </ul>
                  </>
                )}
                {!active && (
                  <button onClick={() => switchPlan(p.id)} className="btn-secondary mt-5 w-full text-xs">
                    {p.id === "pro" ? "Ativar Pro" : "Voltar para o Basic"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-nootr-faint">
          Pagamento ainda não integrado — a troca de plano é liberada durante o período de testes.
        </p>
      </section>

      {/* Dados corporais + fórmula */}
      <section className="card mt-10 space-y-6">
        <div>
          <p className="label-caps">Cálculo de calorias</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {FORMULA_OPTIONS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormula(f.id)}
                className={`chip ${formula === f.id ? "chip-active" : ""}`}
                title={f.hint}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {formula === "manual" ? (
          <div className="max-w-xs">
            <label className="label-caps">Calorias diárias (kcal)</label>
            <input
              className="input-field"
              inputMode="numeric"
              placeholder="Ex: 2000"
              value={manualCalories}
              onChange={(e) => setManualCalories(e.target.value)}
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-caps">Sexo</label>
              <div className="flex gap-2">
                {[
                  { id: "m", label: "Masculino" },
                  { id: "f", label: "Feminino" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSex(s.id as "m" | "f")}
                    className={`chip flex-1 ${sex === s.id ? "chip-active" : ""}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label-caps">Idade</label>
              <input className="input-field" inputMode="numeric" placeholder="anos" value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <div>
              <label className="label-caps">Peso (kg)</label>
              <input className="input-field" inputMode="decimal" placeholder="Ex: 72,5" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div>
              <label className="label-caps">Altura (cm)</label>
              <input className="input-field" inputMode="numeric" placeholder="Ex: 175" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps">Nível de atividade</label>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_OPTIONS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setActivity(a.id)}
                    className={`chip ${activity === a.id ? "chip-active" : ""}`}
                    title={a.hint}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-nootr-bordoSoft">{error}</p>}
        {savedMsg && <p className="text-sm text-emerald-400/90">{savedMsg}</p>}

        <div className="flex items-center justify-between border-t border-nootr-line pt-5">
          {profile?.target_calories ? (
            <p className="text-sm text-nootr-muted">
              Alvo atual:{" "}
              <span className="font-display text-2xl text-nootr-cream">
                {Math.round(profile.target_calories)}
              </span>{" "}
              kcal/dia
            </p>
          ) : (
            <p className="text-sm text-nootr-faint">Nenhum alvo definido ainda.</p>
          )}
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? "Salvando…" : "Salvar perfil"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function PerfilPage() {
  return <RequireAuth>{(token) => <PerfilContent token={token} />}</RequireAuth>;
}
