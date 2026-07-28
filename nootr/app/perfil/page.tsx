"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SkeletonPage } from "@/components/Skeleton";
import { RequireAuth } from "@/components/RequireAuth";
import { TagListInput } from "@/components/TagListInput";
import { TacoTagListInput } from "@/components/TacoTagListInput";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { MealRemindersToggle } from "@/components/MealReminders";
import { Icon } from "@/components/Icon";
import {
  CalorieCalculator, CALORIE_CALCULATOR_DEFAULT, calorieCalculatorPayload, type CalorieCalculatorState,
} from "@/components/CalorieCalculator";
import { nootrApi } from "@/lib/api";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import type { Profile } from "@/lib/types";

function mergeUnique(a: string[], b: string[]): string[] {
  const merged = [...a];
  for (const item of b) {
    if (!merged.some((m) => m.toLowerCase() === item.toLowerCase())) merged.push(item);
  }
  return merged;
}

function PerfilContent({ token }: { token: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const [calState, setCalState] = useState<CalorieCalculatorState>(CALORIE_CALCULATOR_DEFAULT);
  const [macroMode, setMacroMode] = useState<"percent" | "per_kg">("percent");
  const [proteinPct, setProteinPct] = useState(30);
  const [carbsPct, setCarbsPct] = useState(40);
  const [fatPct, setFatPct] = useState(30);
  const [proteinGPerKg, setProteinGPerKg] = useState(1.8);
  const [fatGPerKg, setFatGPerKg] = useState(0.85);

  function patchCal(patch: Partial<CalorieCalculatorState>) {
    setCalState((s) => ({ ...s, ...patch }));
  }

  useEffect(() => {
    let active = true;
    nootrApi
      .getProfile(token)
      .then((p) => {
        if (!active) return;
        setProfile(p);
        setCalState({
          formula: p.formula,
          objective: p.formula === "harris_benedict" ? "muscle_gain" : "weight_loss",
          sex: p.sex ?? "",
          age: p.age ? String(p.age) : "",
          weight: p.weight_kg ? String(p.weight_kg) : "",
          height: p.height_cm ? String(p.height_cm) : "",
          activity: p.activity_level ?? "",
          manualCalories: p.formula === "manual" && p.target_calories ? String(Math.round(p.target_calories)) : "",
        });
        setMacroMode(p.macro_mode ?? "percent");
        setProteinPct(p.protein_pct ?? 30);
        setCarbsPct(p.carbs_pct ?? 40);
        setFatPct(p.fat_pct ?? 30);
        // Sem ajuste salvo, começa no meio da faixa de referência (a mesma
        // que o Nootr usa por padrão pra montar a dieta, ver energy.py).
        setProteinGPerKg(p.protein_g_per_kg ?? 1.8);
        setFatGPerKg(p.fat_g_per_kg ?? 0.85);
      })
      .catch(() => active && setError("Não foi possível carregar o perfil."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  async function switchCountry(country: string) {
    setError("");
    try {
      const updated = await nootrApi.updateProfile(token, { country });
      setProfile(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao trocar o país");
    }
  }

  async function handleSave() {
    setError("");
    setSavedMsg("");
    if (macroMode === "percent" && proteinPct + carbsPct + fatPct !== 100) {
      setError("A distribuição de macros precisa somar 100% antes de salvar.");
      return;
    }
    setSaving(true);
    try {
      const body = calorieCalculatorPayload(calState);
      body.macro_mode = macroMode;
      body.protein_pct = proteinPct;
      body.carbs_pct = carbsPct;
      body.fat_pct = fatPct;
      if (macroMode === "per_kg") {
        body.protein_g_per_kg = proteinGPerKg;
        body.fat_g_per_kg = fatGPerKg;
      }
      const updated = await nootrApi.updateProfile(token, body);
      setProfile(updated);
      setSavedMsg(
        updated.target_calories
          ? `Salvo, alvo diário: ${Math.round(updated.target_calories)} kcal.`
          : "Salvo."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <SkeletonPage cards={3} />;

  const currentPlan = profile?.plan ?? "basic";
  const currentCountry = profile?.country ?? "BR";

  // No modo g/kg os percentuais não governam nada, então não faz sentido
  // exigir que somem 100 pra salvar.
  const macrosOk = macroMode === "per_kg" || proteinPct + carbsPct + fatPct === 100;

  return (
    <div className="mx-auto max-w-3xl pb-4">
      <PageHeader
        icon="user"
        title="Perfil"
        subtitle="Seu plano e os dados usados para calcular suas calorias diárias."
        right={
          <div className="w-40">
            <label className="label-caps flex items-center gap-1.5">
              <Icon name="globe" size={12} /> País
            </label>
            <select
              className="input-field"
              value={currentCountry}
              onChange={(e) => switchCountry(e.target.value)}
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* Plano */}
      <section
        className="card card-sheen rise-in mt-8 flex flex-wrap items-center justify-between gap-4 transition-all duration-300 hover:border-nootr-bordo/40"
        style={{ animationDelay: "0.05s" }}
      >
        <div className="flex items-center gap-3">
          <span className="icon-badge">
            <Icon name="crown" size={18} />
          </span>
          <div>
            <p className="text-sm text-nootr-cream">
              Plano <span className="font-semibold text-nootr-bordoSoft">{currentPlan === "pro" ? "Pro" : "Basic"}</span>
            </p>
            <p className="text-xs text-nootr-muted">
              {currentPlan === "pro"
                ? "Todos os recursos liberados."
                : "Desbloqueie dietas por dia, geração por IA e importação."}
            </p>
          </div>
        </div>
        {currentPlan === "basic" ? (
          <Link href="/plano" className="btn-primary px-4 py-1.5 text-xs">
            <Icon name="sparkle" size={14} /> Fazer upgrade
          </Link>
        ) : (
          <Link href="/plano" className="btn-ghost text-xs">
            Alterar plano →
          </Link>
        )}
      </section>

      {/* Dados corporais + fórmula */}
      <section className="card card-sheen rise-in mt-6 space-y-6" style={{ animationDelay: "0.1s" }}>
        <SectionHeader
          icon="flame"
          title="Calorias e metabolismo"
          subtitle="Defina sua meta manualmente ou deixe o Nootr calcular a partir dos seus dados."
        />
        <CalorieCalculator state={calState} onChange={patchCal} />

        {/* Distribuição de macros (%) */}
        <div className="border-t border-nootr-line pt-6">
          <SectionHeader
            icon="pie"
            title="Distribuição de macros"
            subtitle="Usada como alvo ao montar a dieta e para equilibrar as substituições (busca bater a proteína, mantendo carbo e gordura perto do original)."
          />

          {/* g/kg é do Pro: no Basic a opção aparece com cadeado (convite pro
              upgrade) em vez de sumir, e o backend também força percent nesse
              caso (ver routes/nootr/profile.py). */}
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { id: "percent" as const, label: "Por percentual" },
              { id: "per_kg" as const, label: "Por g/kg de peso" },
            ].map((opt) => {
              const locked = opt.id === "per_kg" && profile?.plan !== "pro";
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => !locked && setMacroMode(opt.id)}
                  disabled={locked}
                  title={locked ? "Disponível no Pro" : undefined}
                  className={`chip inline-flex items-center gap-1.5 ${macroMode === opt.id ? "chip-active" : ""} ${locked ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  {opt.label}
                  {locked && <Icon name="lock" size={11} />}
                </button>
              );
            })}
          </div>

          {macroMode === "per_kg" && profile?.plan === "pro" ? (
            <div className="mt-5 rounded-xl border border-nootr-line bg-nootr-black/40 p-4">
              {profile?.weight_kg ? (
                <>
                  <p className="text-sm text-nootr-cream">
                    Proteína e gordura por grama por quilo do seu peso ({profile.weight_kg} kg), carboidrato fecha
                    as calorias que sobram.
                  </p>
                  <MacroPerKgEditor
                    weightKg={profile.weight_kg}
                    calories={profile.target_calories}
                    proteinGPerKg={proteinGPerKg}
                    fatGPerKg={fatGPerKg}
                    onProteinChange={setProteinGPerKg}
                    onFatChange={setFatGPerKg}
                  />
                  <p className="mt-3 text-xs text-nootr-faint">
                    É assim que o Nootr monta a dieta quando você cria pelo app. Pra ajustar à mão, troque para
                    &ldquo;Por percentual&rdquo;.
                  </p>
                </>
              ) : (
                <p className="text-sm text-nootr-muted">
                  Cadastre seu peso acima pra usar as metas por grama por quilo.
                </p>
              )}
            </div>
          ) : (
          <>
          <div className="mt-6 flex flex-wrap items-center gap-8">
            <MacroDonut protein={proteinPct} carbs={carbsPct} fat={fatPct} />
            <div className="min-w-[220px] flex-1 space-y-1.5">
              <MacroPctInput label="Proteína" color="#8A1E32" value={proteinPct} onChange={setProteinPct} calories={profile?.target_calories} kcalPerG={4} />
              <MacroPctInput label="Carboidrato" color="#B04A5C" value={carbsPct} onChange={setCarbsPct} calories={profile?.target_calories} kcalPerG={4} />
              <MacroPctInput label="Gordura" color="#EDE8E2" value={fatPct} onChange={setFatPct} calories={profile?.target_calories} kcalPerG={9} />
            </div>
          </div>
          <p className={`mt-4 flex items-center gap-1.5 text-xs ${macrosOk ? "text-nootr-faint" : "text-nootr-bordoSoft"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${macrosOk ? "bg-emerald-400/70" : "bg-nootr-bordoSoft"}`} />
            Soma: {proteinPct + carbsPct + fatPct}%{!macrosOk && ", o ideal é somar 100%"}
          </p>
          </>
          )}
        </div>

        {error && <p className="text-sm text-nootr-bordoSoft">{error}</p>}
        {savedMsg && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-400/90">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
            {savedMsg}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-nootr-line pt-5">
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

function PreferencesSection({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");

  const [avoid, setAvoid] = useState<string[]>([]);
  const [likesPantry, setLikesPantry] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [mealTimes, setMealTimes] = useState<string[]>([]);
  const [reminders, setReminders] = useState(false);

  useEffect(() => {
    let active = true;
    nootrApi
      .getPreferences(token)
      .then((p) => {
        if (!active) return;
        setAvoid(mergeUnique(p.allergies, p.dislikes));
        setLikesPantry(mergeUnique(p.likes, p.pantry));
        setMealTimes(p.meal_times ?? []);
        setReminders(Boolean(p.meal_reminders));
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
    <section className="card card-sheen rise-in mt-6 space-y-6" style={{ animationDelay: "0.15s" }}>
      <SectionHeader
        icon="heart"
        title="Preferências alimentares"
        subtitle="Ajudam o Nootr a buscar substituições próximas da sua realidade. Quanto mais informações, melhor o resultado."
      />

      {loading ? (
        <p className="text-sm text-nootr-muted">Carregando…</p>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            <TagListInput
              label="Alergias / Não gosto"
              hint="Esses itens serão evitados pelo Nootr"
              value={avoid}
              onChange={setAvoid}
            />
            <TacoTagListInput
              token={token}
              label="Gosto / Costumo ter em casa"
              hint="Esses itens escolhidos serão priorizados nas escolhas do Nootr"
              value={likesPantry}
              onChange={setLikesPantry}
            />
          </div>

          <div>
            <label className="label-caps">Observações</label>
            <p className="mb-1.5 text-xs text-nootr-faint">Escreva aqui detalhes para ajudar o Nootr a fazer as melhores escolhas de substituições</p>
            <textarea
              className="input-field min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: prefiro refeições rápidas de preparar, evito frituras à noite..."
            />
          </div>

          <div className="border-t border-nootr-line pt-5">
            <MealRemindersToggle
              token={token}
              enabled={reminders}
              times={mealTimes}
              onChange={setReminders}
            />
          </div>

          {error && <p className="text-sm text-nootr-bordoSoft">{error}</p>}
          {savedMsg && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-400/90">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
              {savedMsg}
            </p>
          )}

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
  const complete = total === 100;
  const pEnd = protein * 3.6;
  const cEnd = pEnd + carbs * 3.6;
  const fEnd = cEnd + fat * 3.6;
  const gradient = `conic-gradient(#8A1E32 0deg ${pEnd}deg, #B04A5C ${pEnd}deg ${cEnd}deg, #EDE8E2 ${cEnd}deg ${fEnd}deg, #2A0E15 ${fEnd}deg 360deg)`;
  return (
    <div
      className="relative h-32 w-32 shrink-0 rounded-full transition-shadow duration-500"
      style={{
        background: gradient,
        boxShadow: complete ? "0 0 34px rgba(138,30,50,0.32)" : "0 0 0 rgba(0,0,0,0)",
      }}
    >
      <div className="absolute inset-[11px] flex flex-col items-center justify-center rounded-full border border-nootr-line/60 bg-nootr-black">
        <span className={`font-display text-2xl leading-none transition-colors ${complete ? "text-nootr-cream" : "text-nootr-bordoSoft"}`}>
          {total}%
        </span>
        <span className="mt-0.5 text-[10px] uppercase tracking-caps text-nootr-faint">macros</span>
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
    <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-nootr-wine/15">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}66` }} />
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
          className="input-field w-20 px-2.5 py-1 text-right tabular-nums"
        />
        <span className="text-sm text-nootr-muted">%</span>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  return <RequireAuth>{(token) => <PerfilContent token={token} />}</RequireAuth>;
}

// Espelha energy.macro_targets_from_weight (backend) pra atualizar os
// valores na hora enquanto a pessoa digita, sem ida e volta ao servidor. O
// piso de segurança (10% mínimo de carboidrato) usa a faixa de referência
// fixa, igual ao backend, mesmo quando o g/kg é um valor ajustado à mão.
const _PROTEIN_FLOOR_G_PER_KG = 1.6;
const _FAT_FLOOR_G_PER_KG = 0.7;

function macroTargetsFromWeightPreview(
  calories: number, weightKg: number, proteinGPerKg: number, fatGPerKg: number
) {
  let proteinG = Math.round(weightKg * proteinGPerKg);
  let fatG = Math.round(weightKg * fatGPerKg);
  const minCarbsKcal = calories * 0.1;
  const usedKcal = proteinG * 4 + fatG * 9;
  if (calories > 0 && usedKcal > calories - minCarbsKcal) {
    const shrink = (calories - minCarbsKcal) / usedKcal;
    proteinG = Math.max(Math.round(weightKg * _PROTEIN_FLOOR_G_PER_KG * shrink), 1);
    fatG = Math.max(Math.round(weightKg * _FAT_FLOOR_G_PER_KG * shrink), 1);
  }
  const carbsG = Math.max(Math.round((calories - proteinG * 4 - fatG * 9) / 4), 0);
  return { proteinG, carbsG, fatG };
}

/** Proteína e gordura editáveis em g/kg, carboidrato fecha as calorias, os três com o % correspondente ao lado. */
function MacroPerKgEditor({
  weightKg,
  calories,
  proteinGPerKg,
  fatGPerKg,
  onProteinChange,
  onFatChange,
}: {
  weightKg: number;
  calories: number | null | undefined;
  proteinGPerKg: number;
  fatGPerKg: number;
  onProteinChange: (v: number) => void;
  onFatChange: (v: number) => void;
}) {
  const cals = calories || 0;
  const { proteinG, carbsG, fatG } = macroTargetsFromWeightPreview(cals, weightKg, proteinGPerKg, fatGPerKg);
  const pPct = cals ? Math.round(((proteinG * 4) / cals) * 100) : 0;
  const cPct = cals ? Math.round(((carbsG * 4) / cals) * 100) : 0;
  const fPct = cals ? Math.round(((fatG * 9) / cals) * 100) : 0;

  function commit(onChange: (v: number) => void, raw: string) {
    const n = parseFloat(raw.replace(",", "."));
    onChange(Number.isNaN(n) ? 0 : Math.max(0, Math.min(10, n)));
  }

  return (
    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
      <div className="rounded-lg border border-nootr-line bg-nootr-black px-3 py-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-caps text-nootr-faint">Proteína</p>
          <p className="text-[10px] tabular-nums text-nootr-bordoSoft">{pPct}%</p>
        </div>
        <p className="mt-0.5 tabular-nums text-nootr-cream">{proteinG}g</p>
        <div className="mt-1.5 flex items-center gap-1">
          <input
            type="number"
            inputMode="decimal"
            min={0.1}
            max={10}
            step={0.1}
            value={proteinGPerKg}
            onChange={(e) => commit(onProteinChange, e.target.value)}
            className="input-field w-16 px-1.5 py-0.5 text-right text-xs tabular-nums"
          />
          <span className="text-[10px] text-nootr-faint">g/kg</span>
        </div>
      </div>

      <div className="rounded-lg border border-nootr-line bg-nootr-black px-3 py-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-caps text-nootr-faint">Carboidrato</p>
          <p className="text-[10px] tabular-nums text-nootr-bordoSoft">{cPct}%</p>
        </div>
        <p className="mt-0.5 tabular-nums text-nootr-cream">{carbsG}g</p>
        <p className="mt-1.5 text-[10px] text-nootr-faint">o que sobra das calorias</p>
      </div>

      <div className="rounded-lg border border-nootr-line bg-nootr-black px-3 py-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-caps text-nootr-faint">Gordura</p>
          <p className="text-[10px] tabular-nums text-nootr-bordoSoft">{fPct}%</p>
        </div>
        <p className="mt-0.5 tabular-nums text-nootr-cream">{fatG}g</p>
        <div className="mt-1.5 flex items-center gap-1">
          <input
            type="number"
            inputMode="decimal"
            min={0.1}
            max={10}
            step={0.1}
            value={fatGPerKg}
            onChange={(e) => commit(onFatChange, e.target.value)}
            className="input-field w-16 px-1.5 py-0.5 text-right text-xs tabular-nums"
          />
          <span className="text-[10px] text-nootr-faint">g/kg</span>
        </div>
      </div>
    </div>
  );
}
