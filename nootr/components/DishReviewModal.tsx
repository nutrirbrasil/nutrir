"use client";

import { useState } from "react";
import { AddedFoodList, FoodAdder, addedFoodToInput, type AddedFood } from "@/components/FoodAdder";
import { mealFoodToAdded } from "@/components/DietBuilder";
import type { DietImportMenu, Food, RecipeToSaveInput } from "@/lib/types";

/**
 * Antes de gravar um import de dieta, cada prato composto que a IA decompôs
 * (ver Food.dish_name, agrupado aqui) passa por essa revisão: o usuário
 * escolhe destrinchar (comportamento antigo, itens separados), salvar como
 * receita (vira 1 item na dieta + receita reaproveitável) ou alterar os
 * ingredientes antes de salvar.
 */
export interface DetectedDish {
  key: string;
  menuIndex: number;
  mealIndex: number;
  startIdx: number;
  endIdx: number; // exclusivo
  name: string;
  foods: Food[];
}

export type DishDecision =
  | { action: "destrinchar" }
  | {
      action: "salvar";
      ingredients: RecipeToSaveInput["ingredients"];
      summary: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
    };

export function detectDishes(menus: DietImportMenu[]): DetectedDish[] {
  const dishes: DetectedDish[] = [];
  menus.forEach((menu, menuIndex) => {
    menu.meals.forEach((meal, mealIndex) => {
      let i = 0;
      while (i < meal.foods.length) {
        const name = meal.foods[i].dish_name;
        if (!name) {
          i++;
          continue;
        }
        let j = i + 1;
        while (j < meal.foods.length && meal.foods[j].dish_name === name) j++;
        dishes.push({
          key: `${menuIndex}-${mealIndex}-${i}`,
          menuIndex,
          mealIndex,
          startIdx: i,
          endIdx: j,
          name,
          foods: meal.foods.slice(i, j),
        });
        i = j;
      }
    });
  });
  return dishes;
}

/** Aplica as decisões (mesma ordem de `dishes`) e devolve os menus finais + as receitas a salvar. */
export function applyDishDecisions(
  menus: DietImportMenu[],
  dishes: DetectedDish[],
  decisions: DishDecision[]
): { menus: DietImportMenu[]; recipesToSave: RecipeToSaveInput[] } {
  const nextMenus: DietImportMenu[] = menus.map((m) => ({
    ...m,
    meals: m.meals.map((meal) => ({ ...meal, foods: [...meal.foods] })),
  }));
  const recipesToSave: RecipeToSaveInput[] = [];

  const byMeal = new Map<string, { dish: DetectedDish; decision: DishDecision }[]>();
  dishes.forEach((dish, i) => {
    const mkey = `${dish.menuIndex}-${dish.mealIndex}`;
    const list = byMeal.get(mkey) ?? [];
    list.push({ dish, decision: decisions[i] });
    byMeal.set(mkey, list);
  });

  byMeal.forEach((entries, mkey) => {
    const [menuIndex, mealIndex] = mkey.split("-").map(Number);
    const foods = nextMenus[menuIndex].meals[mealIndex].foods;
    // Aplica do maior startIdx pro menor, pra remover/substituir sem invalidar
    // os índices dos grupos anteriores na mesma refeição.
    const sorted = [...entries].sort((a, b) => b.dish.startIdx - a.dish.startIdx);
    for (const { dish, decision } of sorted) {
      if (decision.action === "destrinchar") {
        for (let k = dish.startIdx; k < dish.endIdx; k++) {
          foods[k] = { ...foods[k], dish_name: undefined };
        }
        continue;
      }
      const summaryFood: Food = {
        name: dish.name,
        quantity: "1 porção",
        calories: decision.summary.calories,
        protein_g: decision.summary.protein_g,
        carbs_g: decision.summary.carbs_g,
        fat_g: decision.summary.fat_g,
      };
      foods.splice(dish.startIdx, dish.endIdx - dish.startIdx, summaryFood);
      recipesToSave.push({ name: dish.name, ingredients: decision.ingredients });
    }
  });

  return { menus: nextMenus, recipesToSave };
}

function sumAdded(foods: AddedFood[]) {
  return foods.reduce(
    (acc, f) => ({
      calories: acc.calories + f.calories,
      protein_g: acc.protein_g + f.protein_g,
      carbs_g: acc.carbs_g + f.carbs_g,
      fat_g: acc.fat_g + f.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}

export function DishReviewModal({
  token,
  dishes,
  onFinish,
  onCancel,
}: {
  token: string;
  dishes: DetectedDish[];
  onFinish: (decisions: DishDecision[]) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [decisions, setDecisions] = useState<DishDecision[]>([]);
  const [editing, setEditing] = useState(false);
  const [editIngredients, setEditIngredients] = useState<AddedFood[]>([]);

  const dish = dishes[step];
  const isLast = step === dishes.length - 1;

  function startEditing() {
    setEditIngredients(dish.foods.map(mealFoodToAdded));
    setEditing(true);
  }

  function commit(decision: DishDecision) {
    const next = [...decisions, decision];
    setDecisions(next);
    setEditing(false);
    if (isLast) {
      onFinish(next);
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleDestrinchar() {
    commit({ action: "destrinchar" });
  }

  function handleSalvar() {
    const totals = dish.foods.reduce(
      (acc, f) => ({
        calories: acc.calories + f.calories,
        protein_g: acc.protein_g + f.protein_g,
        carbs_g: acc.carbs_g + f.carbs_g,
        fat_g: acc.fat_g + f.fat_g,
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );
    commit({
      action: "salvar",
      ingredients: dish.foods.map((f) => mealFoodToAdded(f)).map(addedFoodToInput),
      summary: totals,
    });
  }

  function handleConfirmEdit() {
    if (editIngredients.length === 0) return;
    commit({
      action: "salvar",
      ingredients: editIngredients.map(addedFoodToInput),
      summary: sumAdded(editIngredients),
    });
  }

  if (!dish) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="card w-full max-w-lg space-y-4">
        <div>
          <p className="label-caps">Prato {step + 1} de {dishes.length}</p>
          <p className="mt-1 font-display text-2xl text-nootr-cream">{dish.name}</p>
          <p className="text-xs text-nootr-muted">
            A IA identificou este prato composto e separou os ingredientes abaixo. Você deseja salvar como
            receita, alterar antes de salvar, ou destrinchar (manter os itens separados)?
          </p>
        </div>

        {editing ? (
          <div className="space-y-3">
            <AddedFoodList
              foods={editIngredients}
              onRemove={(i) => setEditIngredients((prev) => prev.filter((_, j) => j !== i))}
              onEdit={(i, f) => setEditIngredients((prev) => prev.map((x, j) => (j === i ? f : x)))}
            />
            <FoodAdder token={token} onAdd={(f) => setEditIngredients((prev) => [...prev, f])} />
            <div className="flex gap-2">
              <button type="button" onClick={handleConfirmEdit} className="btn-primary flex-1 text-sm">
                Salvar como receita
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary text-sm">
                cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <ul className="space-y-1.5">
              {dish.foods.map((f, i) => (
                <li key={i} className="rounded-lg border border-nootr-line bg-nootr-black px-3.5 py-2.5">
                  <p className="text-sm text-nootr-cream">{f.name}</p>
                  <p className="text-xs text-nootr-faint">{f.quantity} · {Math.round(f.calories)} kcal</p>
                </li>
              ))}
            </ul>
            <div className="grid gap-2 sm:grid-cols-3">
              <button type="button" onClick={handleSalvar} className="btn-primary text-sm">
                Salvar
              </button>
              <button type="button" onClick={startEditing} className="btn-secondary text-sm">
                Alterar
              </button>
              <button type="button" onClick={handleDestrinchar} className="btn-secondary text-sm">
                Destrinchar
              </button>
            </div>
          </>
        )}

        <button type="button" onClick={onCancel} className="w-full text-center text-xs text-nootr-faint transition-colors hover:text-nootr-bordoSoft">
          Cancelar importação
        </button>
      </div>
    </div>
  );
}
