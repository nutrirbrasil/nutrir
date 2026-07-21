"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { TagListInput } from "@/components/TagListInput";
import { nootrApi } from "@/lib/api";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import type { ActivityLevel, Formula, Profile, TacoFoodResult } from "@/lib/types";

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

const OBJECTIVE_OPTIONS = [
  { id: "weight_loss", label: "Perda de Peso", formula: "mifflin_st_jeor" as Formula },
  { id: "muscle_gain", label: "Ganho de Massa", formula: "harris_benedict" as Formula },
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
  const [objective, setObjective] = useState<"weight_loss" | "muscle_gain">("weight_loss");
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
        if (p.formula === "manual") {
          setManualCalories(p.target_calories ? String(Math.round(p.target_calories)) : "");
        } else if (p.formula === "harris_benedict") {
          setObjective("muscle_gain");
        } else {
          setObjective("weight_loss");
        }
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
      else if (formula !== "manual")
        body.formula = objective === "weight_loss" ? "mifflin_st_jeor" : "harris_benedict";
      body.protein_pct = proteinPct;
      body.carbs_pct = carbsPct;
      body.fat_pct = fatPct;
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

  if (loading) return <p className="text-sm text-nootr-muted">Carregando…</p>;

  const currentPlan = profile?.plan ?? "basic";
  const currentCountry = profile?.country ?? "BR";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="divider-bordo mb-4" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-nootr-cream">Perfil</h1>
          <p className="mt-2 text-sm text-nootr-muted">
            Seu plano e os dados usados para calcular suas calorias diárias.
          </p>
        </div>
        <div className="w-40">
          <label className="label-caps">País</label>
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
      </div>

      {/* Plano */}
      <section className="mt-10 flex items-center justify-between rounded-xl border border-nootr-line bg-nootr-black px-4 py-3.5">
        <p className="text-sm text-nootr-cream">
          Plano:{" "}
          <span className="font-semibold text-nootr-bordoSoft">
            {currentPlan === "pro" ? "Pro" : "Basic"}
          </span>
        </p>
        {currentPlan === "basic" ? (
          <Link href="/plano" className="btn-primary px-4 py-1.5 text-xs">
            Fazer upgrade
          </Link>
        ) : (
          <Link href="/plano" className="text-xs text-nootr-muted transition-colors hover:text-nootr-bordoSoft">
            Alterar
          </Link>
        )}
      </section>

      {/* Dados corporais + fórmula */}
      <section className="card mt-10 space-y-6">
        <div>
          <p className="label-caps">Cálculo de calorias</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => setFormula("manual")}
              className={`chip ${formula === "manual" ? "chip-active" : ""}`}
            >
              Definir manualmente
            </button>
            <button
              onClick={() =>
                setFormula(objective === "weight_loss" ? "mifflin_st_jeor" : "harris_benedict")
              }
              className={`chip ${formula !== "manual" ? "chip-active" : ""}`}
            >
              Calcular
            </button>
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
            <div className="sm:col-span-2">
              <label className="label-caps">Objetivo</label>
              <div className="flex flex-wrap gap-2">
                {OBJECTIVE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setObjective(opt.id as "weight_loss" | "muscle_gain");
                      setFormula(opt.formula);
                    }}
                    className={`chip ${objective === opt.id ? "chip-active" : ""}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
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
            Soma: {proteinPct + carbsPct + fatPct}%{proteinPct + carbsPct + fatPct !== 100 && ", o ideal é somar 100%"}
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

interface SelectedFood {
  full_name: string;
  display_name: string;
}

/** Igual ao TagListInput, mas os itens vêm de uma busca na base TACO (autocomplete)
 * em vez de texto livre, garante que a preferência é um alimento real, com id, que o
 * matching consegue usar como desempate (ex: "banana" na dieta + "Banana, nanica" aqui). */
function TacoTagListInput({
  token,
  label,
  hint,
  value,
  onChange,
}: {
  token: string;
  label: string;
  hint: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TacoFoodResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SelectedFood[]>([]);
  const [resolving, setResolving] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Sincronizar quando value muda (reload da página), resolve todos os
  // nomes em paralelo (não um de cada vez) pra não parecer que os itens
  // salvos sumiram enquanto carrega.
  useEffect(() => {
    let active = true;
    const syncFromProp = async () => {
      if (value.length === 0) {
        setSelected([]);
        return;
      }
      setResolving(true);
      const newSelected = await Promise.all(
        value.map(async (fullName) => {
          const existing = selected.find((s) => s.full_name === fullName);
          if (existing) return existing;
          try {
            const data = await nootrApi.searchFoods(token, fullName);
            const match = data.results.find((r) => r.full_name === fullName);
            return { full_name: fullName, display_name: match?.name || fullName };
          } catch {
            return { full_name: fullName, display_name: fullName };
          }
        })
      );
      if (active) {
        setSelected(newSelected);
        setResolving(false);
      }
    };
    syncFromProp();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, token]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await nootrApi.searchFoods(token, query.trim());
        // Preferência precisa referenciar um item estável da TACO (é o que o
        // desempate de matching usa), alimentos próprios do usuário ficam de
        // fora daqui, mesmo que a busca geral os traga.
        setResults(data.results.filter((r) => r.taco_id != null));
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, token]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function addItem(result: TacoFoodResult) {
    if (!selected.some((s) => s.full_name.toLowerCase() === result.full_name.toLowerCase())) {
      const newSelected = [...selected, { full_name: result.full_name, display_name: result.name }];
      setSelected(newSelected);
      onChange(newSelected.map((s) => s.full_name));
    }
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function removeItem(index: number) {
    const newSelected = selected.filter((_, j) => j !== index);
    setSelected(newSelected);
    onChange(newSelected.map((s) => s.full_name));
  }

  return (
    <div ref={boxRef} className="relative">
      <label className="label-caps">{label}</label>
      <p className="mb-1.5 text-xs text-nootr-faint">{hint}</p>
      <input
        className="input-field"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar alimento na TACO (ex: banana nanica)"
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-nootr-line bg-nootr-black shadow-lg">
          {searching && <p className="px-3 py-2 text-xs text-nootr-faint">Buscando…</p>}
          {!searching && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-nootr-faint">Nenhum alimento encontrado.</p>
          )}
          {results.map((r) => (
            <button
              key={r.taco_id ?? r.full_name}
              type="button"
              onClick={() => addItem(r)}
              className="block w-full px-3 py-2 text-left text-sm text-nootr-cream transition-colors hover:bg-nootr-line/40"
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
      {resolving && selected.length === 0 && (
        <p className="mt-2 text-xs text-nootr-faint">Carregando itens salvos…</p>
      )}
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((item, i) => (
            <span
              key={`${item.full_name}-${i}`}
              className="flex items-center gap-1.5 rounded-full border border-nootr-line bg-nootr-black px-3 py-1 text-xs text-nootr-cream"
            >
              {item.display_name}
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-nootr-faint hover:text-nootr-bordoSoft"
                aria-label={`Remover ${item.display_name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
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
          Usamos isso para ajudar a buscar substituições próximas da sua realidade, personalize da sua forma, quanto mais informações, melhor o resultado.
        </p>
      </div>

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
