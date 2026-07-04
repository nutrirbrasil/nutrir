"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";
import { FoodAdder, AddedFoodList, type AddedFood } from "@/components/FoodAdder";
import { nootrApi } from "@/lib/api";
import type { DietSummary, Plan, Profile } from "@/lib/types";

interface MealDraft {
  name: string;
  time: string;
  foods: AddedFood[];
}

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const EMPTY_MEAL: MealDraft = { name: "", time: "12:00", foods: [] };

function dietToDrafts(diet: DietSummary): MealDraft[] {
  return diet.meals.map((meal) => ({
    name: meal.name,
    time: meal.time,
    foods: meal.foods.map((f) => ({
      taco_id: f.taco_id ?? 0,
      name: f.name,
      grams: f.grams ?? 0,
      quantity_label: f.quantity,
      calories: f.calories,
      protein_g: f.protein_g,
      carbs_g: f.carbs_g,
      fat_g: f.fat_g,
    })),
  }));
}

function BuilderContent({ token }: { token: string }) {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan>("basic");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [diets, setDiets] = useState<DietSummary[]>([]);
  const [slot, setSlot] = useState<number | null>(null); // null = dieta base
  const [name, setName] = useState("Minha dieta");
  const [targetCalories, setTargetCalories] = useState("");
  const [meals, setMeals] = useState<MealDraft[]>([{ ...EMPTY_MEAL, name: "Café da manhã", time: "07:30" }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const loadSlot = useCallback(
    (weekday: number | null, existing: DietSummary[]) => {
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
    },
    []
  );

  useEffect(() => {
    let active = true;
    Promise.all([nootrApi.listDiets(token), nootrApi.getProfile(token)])
      .then(([dietsData, profileData]) => {
        if (!active) return;
        setPlan(dietsData.plan);
        setDiets(dietsData.diets);
        setProfile(profileData);
        loadSlot(null, dietsData.diets);
      })
      .catch(() => active && setError("Não foi possível carregar seus dados."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token, loadSlot]);

  const totals = useMemo(() => {
    const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (const meal of meals)
      for (const f of meal.foods) {
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
  }, [meals]);

  function switchSlot(weekday: number | null) {
    setSlot(weekday);
    setSavedMsg("");
    setError("");
    loadSlot(weekday, diets);
  }

  function updateMeal(index: number, patch: Partial<MealDraft>) {
    setMeals((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
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
          foods: m.foods.map((f) => ({
            taco_id: f.taco_id,
            grams: f.grams,
            quantity_label: f.quantity_label,
          })),
        })),
      });
      const refreshed = await nootrApi.listDiets(token);
      setDiets(refreshed.diets);
      setSavedMsg("Dieta salva.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-nootr-muted">Carregando…</p>;

  return (
    <div>
      <div className="divider-bordo mb-4" />
      <h1 className="font-display text-4xl text-nootr-cream">Montar dieta</h1>
      <p className="mt-2 max-w-xl text-sm text-nootr-muted">
        Monte suas refeições com alimentos da tabela TACO. As calorias e macros são calculados
        automaticamente.
      </p>

      {plan === "pro" ? (
        <div className="mt-8 flex flex-wrap gap-2">
          <button
            onClick={() => switchSlot(null)}
            className={`chip ${slot === null ? "chip-active" : ""}`}
          >
            Base
          </button>
          {WEEKDAYS.map((label, i) => (
            <button
              key={label}
              onClick={() => switchSlot(i)}
              className={`chip ${slot === i ? "chip-active" : ""} ${
                diets.some((d) => d.weekday === i) ? "border-nootr-bordo/50" : ""
              }`}
            >
              {label}
              {diets.some((d) => d.weekday === i) && <span className="ml-1 text-nootr-bordoSoft">•</span>}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-8 rounded-xl border border-nootr-line bg-nootr-wine/30 px-4 py-3 text-xs text-nootr-muted">
          Plano <strong className="text-nootr-cream">Basic</strong> — você tem 1 dieta base para
          todos os dias. No <strong className="text-nootr-bordoSoft">Pro</strong>, monte até 7
          dietas, uma para cada dia da semana.
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
                    placeholder={`automático (${totals.calories || "—"})`}
                    value={targetCalories}
                    onChange={(e) => setTargetCalories(e.target.value)}
                  />
                  {profile?.target_calories ? (
                    <button
                      type="button"
                      onClick={() => setTargetCalories(String(Math.round(profile.target_calories!)))}
                      className="btn-secondary shrink-0 whitespace-nowrap px-3 text-xs"
                      title="Usar o alvo calculado no seu perfil"
                    >
                      {Math.round(profile.target_calories)} do perfil
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push("/perfil")}
                      className="btn-secondary shrink-0 whitespace-nowrap px-3 text-xs"
                    >
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
                    <input
                      className="input-field"
                      placeholder="Ex: Café da manhã"
                      value={meal.name}
                      onChange={(e) => updateMeal(i, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label-caps">Horário</label>
                    <input
                      type="time"
                      className="input-field"
                      value={meal.time}
                      onChange={(e) => updateMeal(i, { time: e.target.value })}
                    />
                  </div>
                </div>
                {meals.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setMeals((prev) => prev.filter((_, j) => j !== i))}
                    className="pb-2.5 text-xs text-nootr-muted transition-colors hover:text-nootr-bordoSoft"
                  >
                    remover
                  </button>
                )}
              </div>

              <AddedFoodList
                foods={meal.foods}
                onRemove={(fi) => updateMeal(i, { foods: meal.foods.filter((_, j) => j !== fi) })}
              />
              <FoodAdder token={token} onAdd={(f) => updateMeal(i, { foods: [...meal.foods, f] })} />
            </div>
          ))}

          <button
            type="button"
            onClick={() => setMeals((prev) => [...prev, { ...EMPTY_MEAL }])}
            className="btn-secondary w-full"
          >
            + Adicionar refeição
          </button>
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <div className="card">
            <p className="label-caps">Resumo do dia</p>
            <p className="mt-1 font-display text-5xl text-nootr-cream">
              {totals.calories}
              <span className="ml-1 text-lg text-nootr-muted">kcal</span>
            </p>
            <dl className="mt-5 space-y-2.5 border-t border-nootr-line pt-5 text-sm">
              {[
                ["Proteína", `${totals.protein}g`],
                ["Carboidratos", `${totals.carbs}g`],
                ["Gorduras", `${totals.fat}g`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-nootr-muted">{k}</dt>
                  <dd className="font-medium text-nootr-cream">{v}</dd>
                </div>
              ))}
            </dl>

            {error && <p className="mt-4 text-sm text-nootr-bordoSoft">{error}</p>}
            {savedMsg && <p className="mt-4 text-sm text-emerald-400/90">{savedMsg}</p>}

            <button onClick={handleSave} disabled={saving} className="btn-primary mt-5 w-full">
              {saving ? "Salvando…" : "Salvar dieta"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function MontarDietaPage() {
  return <RequireAuth>{(token) => <BuilderContent token={token} />}</RequireAuth>;
}
