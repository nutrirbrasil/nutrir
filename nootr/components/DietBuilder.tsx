"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FoodAdder, AddedFoodList, addedFoodToInput, type AddedFood } from "@/components/FoodAdder";
import { DishReviewModal, detectDishes, applyDishDecisions, type DetectedDish, type DishDecision } from "@/components/DishReviewModal";
import { nootrApi } from "@/lib/api";
import {
  PRO_DIET_DISCLAIMER,
  GENERATE_DIET_WARNING,
  GENERATE_DIET_STEPS,
  NOOTRICIONISTA_PATH,
} from "@/lib/plan";
import type { DietImportPreview, DietSummary, Meal, Plan, Profile } from "@/lib/types";

interface MealDraft {
  name: string;
  time: string;
  foods: AddedFood[];
}

type DietMode = "dias" | "unico";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const EMPTY_MEAL: MealDraft = { name: "", time: "12:00", foods: [] };

// JS getDay(): 0=domingo..6=sábado. Convenção do backend: 0=segunda..6=domingo.
function todayWeekday(): number {
  return (new Date().getDay() + 6) % 7;
}

export function mealFoodToAdded(f: Meal["foods"][number]): AddedFood {
  const grams = f.grams ?? 0;
  const r = grams > 0 ? 100 / grams : 1;
  return {
    taco_id: f.taco_id ?? null,
    name: f.name,
    grams,
    quantity_label: f.quantity,
    calories: f.calories,
    protein_g: f.protein_g,
    carbs_g: f.carbs_g,
    fat_g: f.fat_g,
    kcal_100g: Math.round(f.calories * r * 10) / 10,
    protein_100g: Math.round(f.protein_g * r * 10) / 10,
    carbs_100g: Math.round(f.carbs_g * r * 10) / 10,
    fat_100g: Math.round(f.fat_g * r * 10) / 10,
  };
}

function dietToDrafts(diet: DietSummary): MealDraft[] {
  return diet.meals.map((meal) => ({
    name: meal.name,
    time: meal.time,
    foods: meal.foods.map(mealFoodToAdded),
  }));
}

export function DietBuilder({ token, onSaved }: { token: string; onSaved?: () => void }) {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan>("basic");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [diets, setDiets] = useState<DietSummary[]>([]);
  const [dietMode, setDietMode] = useState<DietMode>("dias");
  const [slot, setSlot] = useState<number | null>(null);
  const [name, setName] = useState("Minha dieta");
  const [targetCalories, setTargetCalories] = useState("");
  const [meals, setMeals] = useState<MealDraft[]>([{ ...EMPTY_MEAL, name: "Café da manhã", time: "07:30" }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  // Import (Pro), PDF/Word/Excel da dieta, lido pela IA
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState("");
  // Gerar dieta pronta (Pro), IA monta batendo a meta do perfil, revisada
  // por nutricionista parceiro antes de aparecer (ver app/dieta/page.tsx).
  const [showGenerate, setShowGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState("");
  // Revisão de pratos compostos (ver DishReviewModal), preenchido entre o
  // preview e a confirmação, só quando o documento tem algum prato detectado.
  const [importPreview, setImportPreview] = useState<DietImportPreview | null>(null);
  const [reviewDishes, setReviewDishes] = useState<DetectedDish[]>([]);

  const loadSlot = useCallback((weekday: number | null, existing: DietSummary[]) => {
    const diet = existing.find((d) => d.weekday === weekday);
    if (diet) {
      setName(diet.name);
      setTargetCalories(String(Math.round(diet.daily_calories)));
      setMeals(dietToDrafts(diet));
    } else {
      setName(weekday === null ? "Minha dieta" : `Dieta de ${WEEKDAYS[weekday]}`);
      setTargetCalories("");
      setMeals([{ ...EMPTY_MEAL, name: "Café da manhã", time: "07:30" }]);
    }
  }, []);

  const reload = useCallback(async () => {
    const [dietsData, profileData] = await Promise.all([nootrApi.listDiets(token), nootrApi.getProfile(token)]);
    setPlan(dietsData.plan);
    setDiets(dietsData.diets);
    setProfile(profileData);
    return dietsData;
  }, [token]);

  useEffect(() => {
    let active = true;
    reload()
      .then((d) => {
        if (!active) return;
        // Detecta o modo pelo que já existe: se só tem uma dieta sem dia
        // (weekday=null) e nenhuma por dia da semana, ela está no "plano único".
        const hasWeekdaySpecific = d.diets.some((x) => x.weekday !== null);
        const hasOnlyNull = d.diets.length > 0 && !hasWeekdaySpecific;
        const initialMode: DietMode = d.plan === "pro" && hasOnlyNull ? "unico" : "dias";
        setDietMode(initialMode);
        const initialSlot = d.plan === "pro" && initialMode === "dias" ? todayWeekday() : null;
        setSlot(initialSlot);
        loadSlot(initialSlot, d.diets);
      })
      .catch(() => active && setError("Não foi possível carregar seus dados."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [reload, loadSlot]);

  const totals = useMemo(() => {
    const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (const meal of meals)
      for (const f of meal.foods) {
        t.calories += f.calories;
        t.protein += f.protein_g;
        t.carbs += f.carbs_g;
        t.fat += f.fat_g;
      }
    const cals = t.calories || 1;
    return {
      calories: Math.round(t.calories),
      protein: Math.round(t.protein),
      carbs: Math.round(t.carbs),
      fat: Math.round(t.fat),
      protein_pct: Math.round((t.protein * 4) / cals * 100),
      carbs_pct: Math.round((t.carbs * 4) / cals * 100),
      fat_pct: Math.round((t.fat * 9) / cals * 100),
    };
  }, [meals]);

  const targets = profile?.macro_targets_g ?? null;

  function mealTotals(foods: AddedFood[]) {
    const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (const f of foods) {
      t.calories += f.calories;
      t.protein += f.protein_g;
      t.carbs += f.carbs_g;
      t.fat += f.fat_g;
    }
    return {
      calories: Math.round(t.calories),
      protein: Math.round(t.protein),
      carbs: Math.round(t.carbs),
      fat: Math.round(t.fat),
    };
  }

  function switchSlot(weekday: number | null) {
    setSlot(weekday);
    setSavedMsg("");
    setError("");
    loadSlot(weekday, diets);
  }

  function switchDietMode(mode: DietMode) {
    if (mode === dietMode) return;
    setDietMode(mode);
    setSavedMsg("");
    setError("");
    const nextSlot = mode === "unico" ? null : todayWeekday();
    setSlot(nextSlot);
    loadSlot(nextSlot, diets);
  }

  function copyFromDiet(sourceWeekday: number | null) {
    const source = diets.find((d) => d.weekday === sourceWeekday);
    if (!source) return;
    if (meals.some((m) => m.foods.length > 0)) {
      const ok = window.confirm("Isso substitui as refeições que você já montou aqui. Continuar?");
      if (!ok) return;
    }
    setTargetCalories(String(Math.round(source.daily_calories)));
    setMeals(dietToDrafts(source));
    setError("");
    setSavedMsg(`Copiado de "${source.name}", edite o que precisar e salve.`);
  }

  function updateMeal(index: number, patch: Partial<MealDraft>) {
    setMeals((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }

  function duplicateMeal(i: number) {
    setMeals((prev) => {
      const copy: MealDraft = { ...prev[i], name: `${prev[i].name} (cópia)`, foods: prev[i].foods.map((f) => ({ ...f })) };
      return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)];
    });
  }

  function moveMeal(i: number, dir: -1 | 1) {
    setMeals((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    setImportNote("");
    setError("");
    try {
      const preview = await nootrApi.previewDietImport(token, importFile);
      const dishes = detectDishes(preview.menus);
      if (dishes.length > 0) {
        // Pausa aqui, DishReviewModal decide prato a prato antes de confirmar.
        setImportPreview(preview);
        setReviewDishes(dishes);
        setImporting(false);
      } else {
        await finishImport(preview, [], []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar");
      setImporting(false);
    }
  }

  async function finishImport(preview: DietImportPreview, dishes: DetectedDish[], decisions: DishDecision[]) {
    setImporting(true);
    setError("");
    try {
      const { menus, recipesToSave } = applyDishDecisions(preview.menus, dishes, decisions);
      const res = await nootrApi.confirmDietImport(token, {
        name: "Dieta importada",
        menus,
        preferences: preview.preferences,
        targets: preview.targets,
        recipes_to_save: recipesToSave,
      });
      const refreshed = await reload();
      setDietMode("dias");
      const todaySlot = todayWeekday();
      setSlot(todaySlot);
      loadSlot(todaySlot, refreshed.diets);
      setImportFile(null);
      setShowImport(false);
      setImportPreview(null);
      setReviewDishes([]);
      setSavedMsg(
        res.menus_found > 1
          ? `Dieta importada, ${res.menus_found} cardápios distribuídos pelos 7 dias.`
          : "Dieta importada e salva para os 7 dias da semana."
      );
      const notes: string[] = [];
      if (preview.unmatched.length) notes.push(`não casei com a TACO: ${preview.unmatched.join(", ")}`);
      const p = res.preferences;
      const learned: string[] = [];
      if (p?.allergies?.length) learned.push(`alergias: ${p.allergies.join(", ")}`);
      if (p?.notes) learned.push("observações da nutricionista salvas no seu perfil");
      const prof = res.profile;
      if (prof?.target_calories) learned.push(`alvo diário: ${Math.round(prof.target_calories)} kcal`);
      if (prof?.protein_pct != null && prof?.carbs_pct != null && prof?.fat_pct != null) {
        learned.push(`macros: ${prof.protein_pct}% proteína / ${prof.carbs_pct}% carbo / ${prof.fat_pct}% gordura`);
      }
      if (recipesToSave.length) learned.push(`${recipesToSave.length} receita(s) salva(s), pendente(s) de aprovação`);
      if (learned.length) notes.push(`aprendi do PDF, ${learned.join("; ")}`);
      setImportNote(notes.join(" · "));
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar");
    } finally {
      setImporting(false);
    }
  }

  function handleDishReviewFinish(decisions: DishDecision[]) {
    if (!importPreview) return;
    finishImport(importPreview, reviewDishes, decisions);
  }

  function handleDishReviewCancel() {
    setImportPreview(null);
    setReviewDishes([]);
    setImporting(false);
  }

  async function handleGenerate() {
    setError("");
    setGenerateMsg("");
    setGenerating(true);
    try {
      await nootrApi.generateDiet(token);
      setShowGenerate(false);
      setGenerateMsg("Pedido enviado, sua dieta chega em até 24h, após revisão de um nutricionista parceiro.");
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar dieta");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setError("");
    setSavedMsg("");
    const validMeals = meals.filter((m) => m.name.trim() && m.foods.length > 0);
    if (validMeals.length === 0) {
      setError("Adicione pelo menos uma refeição com alimentos.");
      return;
    }
    setSaving(true);
    try {
      const target = parseFloat(targetCalories.replace(",", "."));
      await nootrApi.saveDiet(token, {
        name: name.trim() || "Minha dieta",
        weekday: slot,
        target_calories: Number.isFinite(target) && target > 0 ? target : undefined,
        meals: validMeals.map((m) => ({
          name: m.name.trim(),
          time: m.time,
          foods: m.foods.map(addedFoodToInput),
        })),
      });
      // Plano único: remove dietas por dia da semana que possam ter sobrado de
      // um uso anterior de "Dias diferentes", pra não haver ambiguidade sobre
      // qual dieta vale (o motor sempre prioriza a específica do dia).
      if (dietMode === "unico" && plan === "pro") {
        const stale = diets.filter((d) => d.weekday !== null);
        await Promise.all(stale.map((d) => nootrApi.deleteDiet(token, d.id)));
      }
      await reload();
      setSavedMsg("Dieta salva.");
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-nootr-muted">Carregando…</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {plan === "pro" && (
          <button onClick={() => setShowGenerate((v) => !v)} className="btn-secondary text-xs">
            {showGenerate ? "Fechar" : "Gerar dieta pronta (IA)"}
          </button>
        )}
        {plan === "pro" && (
          <button onClick={() => setShowImport((v) => !v)} className="btn-secondary text-xs">
            {showImport ? "Fechar importação" : "Importar dieta (IA)"}
          </button>
        )}
      </div>

      {plan === "pro" && showGenerate && (
        <div className="card mt-5">
          <p className="label-caps">Gerar Dieta (Receba em até 24h)</p>
          {profile?.ai_diet_generated_at ? (
            <p className="mt-2 text-xs text-nootr-faint">
              Você já utilizou sua geração gratuita de dieta, esse recurso vale uma única vez por conta.
            </p>
          ) : (
            <>
              <p className="mt-2 text-xs text-nootr-bordoSoft">
                <strong>{GENERATE_DIET_WARNING.split("! ")[0]}!</strong> {GENERATE_DIET_WARNING.split("! ")[1]}
              </p>

              <ol className="mt-4 space-y-2 text-xs text-nootr-muted">
                {GENERATE_DIET_STEPS.map((step, i) => (
                  <li key={step} className="flex gap-2">
                    <span className="shrink-0 font-semibold text-nootr-bordoSoft">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              <p className="mt-4 text-xs text-nootr-faint">
                <span className="font-semibold">Obs:</span> {PRO_DIET_DISCLAIMER} Se você quiser um
                acompanhamento nutricional e um desconto exclusivo para usuários do Nootr Pro, acesse{" "}
                <Link
                  href={NOOTRICIONISTA_PATH}
                  className="text-nootr-bordoSoft underline decoration-nootr-bordo/50 hover:text-nootr-cream"
                >
                  &quot;Nootricionista&quot;
                </Link>
                .
              </p>

              {!profile?.target_calories && (
                <p className="mt-4 text-xs text-nootr-bordoSoft">
                  Defina sua meta calórica em Perfil antes de gerar.
                </p>
              )}
              {generateMsg && <p className="mt-3 text-xs text-emerald-400/90">{generateMsg}</p>}
              <button
                onClick={handleGenerate}
                disabled={generating || !profile?.target_calories}
                className="btn-primary mt-4 text-xs disabled:opacity-60"
              >
                {generating ? "Enviando…" : "Gerar minha dieta"}
              </button>
            </>
          )}
        </div>
      )}

      {plan === "pro" && showImport && (
        <div className="card mt-5">
          <p className="label-caps">Importar dieta (Pro)</p>
          <p className="mb-3 mt-1 text-xs text-nootr-muted">
            Envie o arquivo da dieta montada pela nutricionista, PDF, Word (.docx) ou Excel (.xlsx). A IA
            lê o documento, monta as refeições e também guarda alergias, gostos e substituições que ela já
            tenha sugerido.
          </p>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-nootr-line px-4 py-8 text-center transition-colors hover:border-nootr-bordo/60">
            <input
              type="file"
              accept=".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
            <span className="text-2xl">📄</span>
            <span className="text-sm text-nootr-cream">
              {importFile ? importFile.name : "Clique para escolher o arquivo (PDF, Word ou Excel)"}
            </span>
            {!importFile && <span className="text-xs text-nootr-faint">Máximo 15MB</span>}
          </label>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-nootr-faint">{importNote}</p>
            <button onClick={handleImport} disabled={importing || !importFile} className="btn-primary text-xs">
              {importing ? "Lendo o documento…" : "Importar e salvar"}
            </button>
          </div>
        </div>
      )}

      {plan === "pro" ? (
        <>
          <div className="mt-8 flex flex-wrap gap-2">
            <button onClick={() => switchDietMode("dias")} className={`chip ${dietMode === "dias" ? "chip-active" : ""}`}>
              Dias diferentes
            </button>
            <button onClick={() => switchDietMode("unico")} className={`chip ${dietMode === "unico" ? "chip-active" : ""}`}>
              Plano único
            </button>
          </div>

          {dietMode === "dias" ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((label, i) => (
                  <button
                    key={label}
                    onClick={() => switchSlot(i)}
                    className={`chip ${slot === i ? "chip-active" : ""} ${diets.some((d) => d.weekday === i) ? "border-nootr-bordo/50" : ""}`}
                  >
                    {label}
                    {diets.some((d) => d.weekday === i) && <span className="ml-1 text-nootr-bordoSoft">•</span>}
                  </button>
                ))}
              </div>

              {diets.some((d) => d.weekday !== slot && d.weekday !== null) && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-nootr-muted">Copiar de:</label>
                  <select
                    className="input-field w-auto py-1.5 text-xs"
                    value=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) return;
                      copyFromDiet(parseInt(v, 10));
                      e.target.value = "";
                    }}
                  >
                    <option value="">Escolher dia…</option>
                    {diets
                      .filter((d) => d.weekday !== slot && d.weekday !== null)
                      .map((d) => (
                        <option key={d.weekday} value={d.weekday as number}>
                          {WEEKDAYS[d.weekday as number]}, {d.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs text-nootr-muted">
              Uma única dieta vale para todos os dias da semana, como no plano Basic.
            </p>
          )}
        </>
      ) : (
        <p className="mt-8 rounded-xl border border-nootr-line bg-nootr-wine/30 px-4 py-3 text-xs text-nootr-muted">
          Plano <strong className="text-nootr-cream">Basic</strong>, 1 dieta base para todos os dias. No{" "}
          <strong className="text-nootr-bordoSoft">Pro</strong>: uma dieta por dia da semana (ou um plano único,
          se preferir) e importação por IA.
        </p>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="card space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label-caps">Nome da dieta</label>
                <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="label-caps">Calorias alvo (kcal/dia)</label>
                <div className="flex gap-2">
                  <input
                    className="input-field"
                    inputMode="numeric"
                    placeholder={`automático (${totals.calories || "0"})`}
                    value={targetCalories}
                    onChange={(e) => setTargetCalories(e.target.value)}
                  />
                  {profile?.target_calories ? (
                    <button
                      type="button"
                      onClick={() => setTargetCalories(String(Math.round(profile.target_calories!)))}
                      className="btn-secondary shrink-0 whitespace-nowrap px-3 text-xs"
                    >
                      {Math.round(profile.target_calories)} do perfil
                    </button>
                  ) : (
                    <button type="button" onClick={() => router.push("/perfil")} className="btn-secondary shrink-0 whitespace-nowrap px-3 text-xs">
                      Calcular no perfil
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {meals.map((meal, i) => (
            <div key={i} className="card space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_120px]">
                  <div>
                    <label className="label-caps">Refeição</label>
                    <input className="input-field" placeholder="Ex: Café da manhã" value={meal.name} onChange={(e) => updateMeal(i, { name: e.target.value })} />
                  </div>
                  <div>
                    <label className="label-caps">Horário</label>
                    <input type="time" className="input-field" value={meal.time} onChange={(e) => updateMeal(i, { time: e.target.value })} />
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 pb-2.5 text-xs text-nootr-muted">
                  <button type="button" title="Mover para cima" disabled={i === 0} onClick={() => moveMeal(i, -1)} className="transition-colors hover:text-nootr-cream disabled:opacity-30">↑</button>
                  <button type="button" title="Mover para baixo" disabled={i === meals.length - 1} onClick={() => moveMeal(i, 1)} className="transition-colors hover:text-nootr-cream disabled:opacity-30">↓</button>
                  <button type="button" title="Duplicar" onClick={() => duplicateMeal(i)} className="transition-colors hover:text-nootr-bordoSoft">duplicar</button>
                  {meals.length > 1 && (
                    <button type="button" onClick={() => setMeals((prev) => prev.filter((_, j) => j !== i))} className="transition-colors hover:text-nootr-bordoSoft">remover</button>
                  )}
                </div>
              </div>

              <AddedFoodList
                foods={meal.foods}
                onRemove={(fi) => updateMeal(i, { foods: meal.foods.filter((_, j) => j !== fi) })}
                onEdit={(fi, f) => updateMeal(i, { foods: meal.foods.map((x, j) => (j === fi ? f : x)) })}
              />
              {meal.foods.length > 0 && (() => {
                const mt = mealTotals(meal.foods);
                return (
                  <p className="text-xs text-nootr-faint">
                    {mt.calories} kcal · P {mt.protein}g · C {mt.carbs}g · G {mt.fat}g
                  </p>
                );
              })()}
              <FoodAdder token={token} onAdd={(f) => updateMeal(i, { foods: [...meal.foods, f] })} />
            </div>
          ))}

          <button type="button" onClick={() => setMeals((prev) => [...prev, { ...EMPTY_MEAL }])} className="btn-secondary w-full">
            + Adicionar refeição
          </button>
          {meals.some((m) => m.foods.length > 0) && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Remover todos os alimentos de todas as refeições desta dieta?")) {
                  setMeals((prev) => prev.map((m) => ({ ...m, foods: [] })));
                }
              }}
              className="mt-2 w-full text-center text-xs text-nootr-faint transition-colors hover:text-nootr-bordoSoft"
            >
              Limpar dieta (remover todos os alimentos)
            </button>
          )}
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <div className="card">
            <p className="label-caps">Resumo do dia</p>
            <p className="mt-1 font-display text-5xl text-nootr-cream">
              {totals.calories}
              <span className="ml-1 text-lg text-nootr-muted">kcal</span>
              {profile?.target_calories && (
                <span className="ml-2 text-sm text-nootr-faint">/ {Math.round(profile.target_calories)} meta</span>
              )}
            </p>
            {profile?.target_calories && totals.calories > profile.target_calories && (
              <p className="mt-1 text-xs font-semibold text-nootr-bordoSoft">
                +{Math.round(totals.calories - profile.target_calories)} kcal acima da meta
              </p>
            )}

            <div className="mt-5 space-y-3 border-t border-nootr-line pt-5 text-sm">
              <MacroLine label="Proteína" grams={totals.protein} pct={totals.protein_pct} targetG={targets?.protein_g} targetPct={profile?.protein_pct} />
              <MacroLine label="Carboidrato" grams={totals.carbs} pct={totals.carbs_pct} targetG={targets?.carbs_g} targetPct={profile?.carbs_pct} />
              <MacroLine label="Gordura" grams={totals.fat} pct={totals.fat_pct} targetG={targets?.fat_g} targetPct={profile?.fat_pct} />
            </div>

            {!targets && (
              <p className="mt-3 text-xs text-nootr-faint">
                Defina suas metas de macro no{" "}
                <button onClick={() => router.push("/perfil")} className="text-nootr-bordoSoft hover:underline">perfil</button>{" "}
                para comparar aqui.
              </p>
            )}

            {error && <p className="mt-4 text-sm text-nootr-bordoSoft">{error}</p>}
            {savedMsg && <p className="mt-4 text-sm text-emerald-400/90">{savedMsg}</p>}

            <button onClick={handleSave} disabled={saving} className="btn-primary mt-5 w-full">
              {saving ? "Salvando…" : "Salvar dieta"}
            </button>
          </div>
        </aside>
      </div>

      {importPreview && reviewDishes.length > 0 && (
        <DishReviewModal
          token={token}
          dishes={reviewDishes}
          onFinish={handleDishReviewFinish}
          onCancel={handleDishReviewCancel}
        />
      )}
    </div>
  );
}

function MacroLine({
  label,
  grams,
  pct,
  targetG,
  targetPct,
}: {
  label: string;
  grams: number;
  pct: number;
  targetG?: number;
  targetPct?: number;
}) {
  const excess = targetG != null ? grams - targetG : 0;
  const isOver = targetG != null && excess > 0;
  const pctOfTarget = targetG ? Math.min(100, Math.round((grams / targetG) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-nootr-muted">{label}</span>
        <span className="tabular-nums text-nootr-cream">
          {grams}g <span className="text-xs text-nootr-faint">({pct}%)</span>
          {targetG != null && (
            <span className="text-xs text-nootr-faint">
              {" "}
              / {targetG}g{targetPct != null ? ` (${targetPct}%)` : ""}
            </span>
          )}
        </span>
      </div>
      {isOver && (
        <p className="mt-0.5 text-right text-xs font-semibold text-nootr-bordoSoft">
          +{Math.round(excess)}g acima da meta
        </p>
      )}
      {targetG != null && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-nootr-line">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${
              isOver ? "from-nootr-bordoSoft to-nootr-bordoSoft" : "from-nootr-bordoDeep to-nootr-bordo"
            }`}
            style={{ width: `${pctOfTarget}%` }}
          />
        </div>
      )}
    </div>
  );
}
