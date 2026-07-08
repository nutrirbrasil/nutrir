"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { nootrApi } from "@/lib/api";
import { PRO_SOON } from "@/lib/plan";
import type { ActivityLevel, Formula, Plan, Profile } from "@/lib/types";

function mergeUnique(a: string[], b: string[]): string[] {
  const merged = [...a];
  for (const item of b) {
    if (!merged.some((m) => m.toLowerCase() === item.toLowerCase())) merged.push(item);
  }
  return merged;
}

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
  const [proteinPct, setProteinPct] = useState(30);
  const [carbsPct, setCarbsPct] = useState(40);
  const [fatPct, setFatPct] = useState(30);

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
        setProteinPct(p.protein_pct ?? 30);
        setCarbsPct(p.carbs_pct ?? 40);
        setFatPct(p.fat_pct ?? 30);
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
    if (proteinPct + carbsPct + fatPct !== 100) {
      setError("A distribuição de macros precisa somar 100% antes de salvar.");
      return;
    }
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
      body.protein_pct = proteinPct;
      body.carbs_pct = carbsPct;
      body.fat_pct = fatPct;
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

        {/* Distribuição de macros (%) */}
        <div className="border-t border-nootr-line pt-6">
          <p className="label-caps">Distribuição de macros (% das calorias)</p>
          <p className="mb-4 mt-1 text-xs text-nootr-muted">
            Usada para redefinir os alimentos na substituição (busca bater a proteína, mantendo carbo/gordura perto do original) e como alvo no montar dieta.
          </p>
          <div className="flex flex-wrap items-center gap-8">
            <MacroDonut protein={proteinPct} carbs={carbsPct} fat={fatPct} />
            <div className="min-w-[220px] flex-1 space-y-3">
              <MacroPctInput label="Proteína" color="#8A1E32" value={proteinPct} onChange={setProteinPct} calories={profile?.target_calories} kcalPerG={4} />
              <MacroPctInput label="Carboidrato" color="#B04A5C" value={carbsPct} onChange={setCarbsPct} calories={profile?.target_calories} kcalPerG={4} />
              <MacroPctInput label="Gordura" color="#EDE8E2" value={fatPct} onChange={setFatPct} calories={profile?.target_calories} kcalPerG={9} />
            </div>
          </div>
          <p className={`mt-3 text-xs ${proteinPct + carbsPct + fatPct === 100 ? "text-nootr-faint" : "text-nootr-bordoSoft"}`}>
            Soma: {proteinPct + carbsPct + fatPct}% {proteinPct + carbsPct + fatPct !== 100 && "— o ideal é somar 100%"}
          </p>
        </div>

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

      <PreferencesSection token={token} />
    </div>
  );
}

function TagListInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const items = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length) onChange([...value, ...items]);
    setDraft("");
  }

  return (
    <div>
      <label className="label-caps">{label}</label>
      <p className="mb-1.5 text-xs text-nootr-faint">{hint}</p>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="flex items-center gap-1.5 rounded-full border border-nootr-line bg-nootr-black px-3 py-1 text-xs text-nootr-cream"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="text-nootr-faint hover:text-nootr-bordoSoft"
                aria-label={`Remover ${item}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        className="input-field"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commitDraft();
          }
        }}
        onBlur={commitDraft}
        placeholder="Digite e pressione Enter (separe vários por vírgula)"
      />
    </div>
  );
}

function PreferencesSection({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");

  const [avoid, setAvoid] = useState<string[]>([]);
  const [likesPantry, setLikesPantry] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let active = true;
    nootrApi
      .getPreferences(token)
      .then((p) => {
        if (!active) return;
        setAvoid(mergeUnique(p.allergies, p.dislikes));
        setLikesPantry(mergeUnique(p.likes, p.pantry));
        setNotes(p.notes);
      })
      .catch(() => active && setError("Não foi possível carregar suas preferências."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSavedMsg("");
    try {
      await nootrApi.updatePreferences(token, {
        allergies: avoid,
        dislikes: avoid,
        likes: likesPantry,
        pantry: likesPantry,
        notes,
      });
      setSavedMsg("Preferências salvas.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card mt-10 space-y-6">
      <div>
        <p className="label-caps">Preferências alimentares</p>
        <p className="mt-1 text-xs text-nootr-muted">
          Usamos isso para a IA sugerir substituições realistas — nunca com o que você não pode ou
          não gosta de comer, e de preferência com o que você já costuma ter em casa.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-nootr-muted">Carregando…</p>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            <TagListInput
              label="Alergias / Não gosto"
              hint="Evitados pela IA — nunca sugeridos."
              value={avoid}
              onChange={setAvoid}
            />
            <TagListInput
              label="Gosto / Costumo ter em casa"
              hint="Priorizados nas sugestões e usados em 'Estou em falta' e nas trocas da IA."
              value={likesPantry}
              onChange={setLikesPantry}
            />
          </div>

          <div>
            <label className="label-caps">Observações</label>
            <textarea
              className="input-field min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: prefiro refeições rápidas de preparar, evito frituras à noite..."
            />
          </div>

          {error && <p className="text-sm text-nootr-bordoSoft">{error}</p>}
          {savedMsg && <p className="text-sm text-emerald-400/90">{savedMsg}</p>}

          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? "Salvando…" : "Salvar preferências"}
          </button>
        </>
      )}
    </section>
  );
}

function MacroDonut({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein + carbs + fat;
  const pEnd = protein * 3.6;
  const cEnd = pEnd + carbs * 3.6;
  const fEnd = cEnd + fat * 3.6;
  const gradient = `conic-gradient(#8A1E32 0deg ${pEnd}deg, #B04A5C ${pEnd}deg ${cEnd}deg, #EDE8E2 ${cEnd}deg ${fEnd}deg, #2A0E15 ${fEnd}deg 360deg)`;
  return (
    <div className="relative h-32 w-32 shrink-0 rounded-full" style={{ background: gradient }}>
      <div className="absolute inset-[12px] flex items-center justify-center rounded-full bg-nootr-black">
        <span className={`font-display text-xl ${total === 100 ? "text-nootr-cream" : "text-nootr-bordoSoft"}`}>
          {total}%
        </span>
      </div>
    </div>
  );
}

function MacroPctInput({
  label,
  color,
  value,
  onChange,
  calories,
  kcalPerG,
}: {
  label: string;
  color: string;
  value: number;
  onChange: (v: number) => void;
  calories: number | null | undefined;
  kcalPerG: number;
}) {
  const grams = calories ? Math.round((calories * (value / 100)) / kcalPerG) : null;

  function commit(raw: string) {
    const n = parseInt(raw, 10);
    onChange(Number.isNaN(n) ? 0 : Math.max(0, Math.min(100, n)));
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm text-nootr-cream">{label}</span>
        {grams != null && <span className="text-xs text-nootr-faint">~{grams}g/dia</span>}
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => commit(e.target.value)}
          className="input-field w-16 py-1 text-right tabular-nums"
        />
        <span className="text-sm text-nootr-muted">%</span>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  return <RequireAuth>{(token) => <PerfilContent token={token} />}</RequireAuth>;
}
