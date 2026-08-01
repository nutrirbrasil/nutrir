import type { MarmitaSize } from "./menu-data";
import type { MarmitaNutritionFacts, NutrientTotals } from "./marmita-nutrition";

/**
 * Motor de cálculo do RÓTULO impresso (/admin/rotulos) — independente da
 * ficha técnica (lib/marmita-nutrition.ts + banco), que existe separadamente
 * como ferramenta de comparação/planejamento em /admin/fichas-tecnicas.
 * Ajustar as quantidades aqui manualmente quando a receita real mudar.
 */

interface TacoNutrientsPer100g {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
  saturated_fat_g?: number;
}

const TACO_FOODS: Record<string, TacoNutrientsPer100g> = {
  frango: { kcal: 163, protein_g: 31.5, carbs_g: 0, fat_g: 3.2, fiber_g: 0, sodium_mg: 4 },
  patinho: { kcal: 219, protein_g: 35.9, carbs_g: 0, fat_g: 7.3, fiber_g: 0, sodium_mg: 5 },
  arroz: { kcal: 128, protein_g: 2.5, carbs_g: 28.1, fat_g: 0.2, fiber_g: 1.6, sodium_mg: 1 },
  massa: { kcal: 148.4, protein_g: 4.0, carbs_g: 31.16, fat_g: 0.52, fiber_g: 1.16, sodium_mg: 6.8 },
  batata: { kcal: 52, protein_g: 1.2, carbs_g: 11.9, fat_g: 0, fiber_g: 1.3, sodium_mg: 2 },
  brocolis: { kcal: 25, protein_g: 2.1, carbs_g: 4.4, fat_g: 0.5, fiber_g: 3.4, sodium_mg: 1 },
  cenoura: { kcal: 30, protein_g: 0.8, carbs_g: 6.7, fat_g: 0.2, fiber_g: 2.6, sodium_mg: 26 },
  grao_de_bico: { kcal: 161.4, protein_g: 9.64, carbs_g: 26.32, fat_g: 2.45, fiber_g: 5.64, sodium_mg: 4.55 },
  ervilha: { kcal: 118, protein_g: 8.34, carbs_g: 21.1, fat_g: 0.39, fiber_g: 8.3, sodium_mg: 2 },
  queijo: { kcal: 330, protein_g: 22.6, carbs_g: 3, fat_g: 25.2, fiber_g: 0, sodium_mg: 875, saturated_fat_g: 14.2 },
  molho_de_tomate: { kcal: 29, protein_g: 1.4, carbs_g: 5.8, fat_g: 0.3, fiber_g: 1.4, sodium_mg: 380 },
  sal: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sodium_mg: 38700 },
};

type FoodId = keyof typeof TACO_FOODS;

interface LabelIngredient {
  food: FoodId;
  grams: number;
}

type RecipeBuilder = Record<MarmitaSize, LabelIngredient[]>;

/**
 * Sal automático: 0,75g por 100g de proteína (frango/patinho/ervilha/grão de
 * bico) + 0,4g por 100g de carboidrato (arroz/batata/massa). Calculado sobre
 * as gramas já ajustadas de cada receita (depois de tirar os 10g de proteína
 * pro molho de tomate). Não conta no peso líquido exibido — só no cálculo
 * nutricional (ver getLabelNutrition).
 */
const SALT_PCT_PROTEIN_FOODS = new Set<FoodId>(["frango", "patinho", "ervilha", "grao_de_bico"]);
const SALT_PCT_CARB_FOODS = new Set<FoodId>(["arroz", "batata", "massa"]);

function computeAutoSaltGrams(recipe: LabelIngredient[]): number {
  let salt = 0;
  for (const ing of recipe) {
    if (SALT_PCT_PROTEIN_FOODS.has(ing.food)) salt += ing.grams * 0.0075;
    else if (SALT_PCT_CARB_FOODS.has(ing.food)) salt += ing.grams * 0.004;
  }
  return salt;
}

const RECIPES: Record<string, RecipeBuilder> = {
  "frg-arroz": {
    P: [
      { food: "frango", grams: 65 },
      { food: "molho_de_tomate", grams: 10 },
      { food: "arroz", grams: 125 },
      { food: "brocolis", grams: 10 },
      { food: "cenoura", grams: 10 },
    ],
    G: [
      { food: "frango", grams: 90 },
      { food: "molho_de_tomate", grams: 10 },
      { food: "arroz", grams: 260 },
      { food: "cenoura", grams: 20 },
    ],
  },
  "frg-massa": {
    P: [
      { food: "frango", grams: 65 },
      { food: "molho_de_tomate", grams: 10 },
      { food: "massa", grams: 125 },
      { food: "brocolis", grams: 10 },
      { food: "cenoura", grams: 10 },
    ],
    G: [
      { food: "frango", grams: 90 },
      { food: "molho_de_tomate", grams: 10 },
      { food: "massa", grams: 260 },
      { food: "cenoura", grams: 20 },
    ],
  },
  "frg-batata": {
    P: [
      { food: "frango", grams: 80 },
      { food: "molho_de_tomate", grams: 10 },
      { food: "batata", grams: 120 },
      { food: "queijo", grams: 10 },
    ],
    G: [
      { food: "frango", grams: 110 },
      { food: "molho_de_tomate", grams: 10 },
      { food: "batata", grams: 250 },
      { food: "queijo", grams: 10 },
    ],
  },
  "car-arroz": {
    P: [
      { food: "patinho", grams: 65 },
      { food: "molho_de_tomate", grams: 10 },
      { food: "arroz", grams: 125 },
      { food: "brocolis", grams: 10 },
      { food: "cenoura", grams: 10 },
    ],
    G: [
      { food: "patinho", grams: 90 },
      { food: "molho_de_tomate", grams: 10 },
      { food: "arroz", grams: 260 },
      { food: "cenoura", grams: 20 },
    ],
  },
  "car-massa": {
    P: [
      { food: "patinho", grams: 65 },
      { food: "molho_de_tomate", grams: 10 },
      { food: "massa", grams: 125 },
      { food: "brocolis", grams: 10 },
      { food: "cenoura", grams: 10 },
    ],
    G: [
      { food: "patinho", grams: 90 },
      { food: "molho_de_tomate", grams: 10 },
      { food: "massa", grams: 260 },
      { food: "cenoura", grams: 20 },
    ],
  },
  "car-batata": {
    P: [
      { food: "patinho", grams: 80 },
      { food: "molho_de_tomate", grams: 10 },
      { food: "batata", grams: 120 },
      { food: "queijo", grams: 10 },
    ],
    G: [
      { food: "patinho", grams: 110 },
      { food: "molho_de_tomate", grams: 10 },
      { food: "batata", grams: 250 },
      { food: "queijo", grams: 10 },
    ],
  },
  "veg-ervilha": {
    P: [
      { food: "ervilha", grams: 100 },
      { food: "arroz", grams: 100 },
      { food: "brocolis", grams: 10 },
      { food: "cenoura", grams: 10 },
    ],
    G: [
      { food: "ervilha", grams: 150 },
      { food: "arroz", grams: 210 },
      { food: "cenoura", grams: 20 },
    ],
  },
  "veg-grao": {
    P: [
      { food: "grao_de_bico", grams: 100 },
      { food: "arroz", grams: 100 },
      { food: "brocolis", grams: 10 },
      { food: "cenoura", grams: 10 },
    ],
    G: [
      { food: "grao_de_bico", grams: 150 },
      { food: "arroz", grams: 210 },
      { food: "cenoura", grams: 20 },
    ],
  },
};

const DV = {
  kcal: 2000,
  protein_g: 75,
  carbs_g: 300,
  fat_g: 55,
  fiber_g: 25,
  sodium_mg: 2000,
  saturated_fat_g: 22,
} as const;

function pct(value: number, ref: number): number {
  return Math.round((value / ref) * 100);
}

function roundNutrients(n: NutrientTotals): NutrientTotals {
  return {
    kcal: Math.round(n.kcal),
    protein_g: Math.round(n.protein_g * 10) / 10,
    carbs_g: Math.round(n.carbs_g * 10) / 10,
    fat_g: Math.round(n.fat_g * 10) / 10,
    fiber_g: Math.round(n.fiber_g * 10) / 10,
    sodium_mg: Math.round(n.sodium_mg),
    saturated_fat_g:
      n.saturated_fat_g != null ? Math.round(n.saturated_fat_g * 10) / 10 : undefined,
  };
}

function scaleToPer100g(totals: NutrientTotals, portion_g: number): NutrientTotals {
  const f = 100 / portion_g;
  return roundNutrients({
    kcal: totals.kcal * f,
    protein_g: totals.protein_g * f,
    carbs_g: totals.carbs_g * f,
    fat_g: totals.fat_g * f,
    fiber_g: totals.fiber_g * f,
    sodium_mg: totals.sodium_mg * f,
    saturated_fat_g: totals.saturated_fat_g != null ? totals.saturated_fat_g * f : undefined,
  });
}

export function getLabelNutrition(itemId: string, size: MarmitaSize): MarmitaNutritionFacts | null {
  const baseRecipe = RECIPES[itemId]?.[size];
  if (!baseRecipe) return null;

  const saltGrams = computeAutoSaltGrams(baseRecipe);
  const recipe: LabelIngredient[] =
    saltGrams > 0 ? [...baseRecipe, { food: "sal", grams: saltGrams }] : baseRecipe;

  // Peso líquido exibido = só a receita base (220/380 g) — o sal entra no
  // cálculo nutricional mas não soma no peso do rótulo.
  const portion_g = baseRecipe.reduce((s, i) => s + i.grams, 0);
  const raw = recipe.reduce<NutrientTotals>(
    (acc, i) => {
      const food = TACO_FOODS[i.food];
      const f = i.grams / 100;
      return {
        kcal: acc.kcal + food.kcal * f,
        protein_g: acc.protein_g + food.protein_g * f,
        carbs_g: acc.carbs_g + food.carbs_g * f,
        fat_g: acc.fat_g + food.fat_g * f,
        fiber_g: acc.fiber_g + food.fiber_g * f,
        sodium_mg: acc.sodium_mg + food.sodium_mg * f,
        saturated_fat_g:
          (acc.saturated_fat_g ?? 0) + (food.saturated_fat_g != null ? food.saturated_fat_g * f : 0),
      };
    },
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sodium_mg: 0, saturated_fat_g: 0 }
  );

  const totals = roundNutrients(raw);
  const per_100g = scaleToPer100g(totals, portion_g);

  return {
    item_id: itemId,
    size,
    portion_g: Math.round(portion_g),
    household_measure: "1 unidade",
    servings_per_package: 1,
    totals,
    per_100g,
    total_sugars_g: 0,
    added_sugars_g: 0,
    trans_fat_g: 0,
    daily_values_pct: {
      kcal: pct(totals.kcal, DV.kcal),
      protein_g: pct(totals.protein_g, DV.protein_g),
      carbs_g: pct(totals.carbs_g, DV.carbs_g),
      fat_g: pct(totals.fat_g, DV.fat_g),
      fiber_g: pct(totals.fiber_g, DV.fiber_g),
      sodium_mg: pct(totals.sodium_mg, DV.sodium_mg),
      saturated_fat_g:
        totals.saturated_fat_g != null ? pct(totals.saturated_fat_g, DV.saturated_fat_g) : undefined,
      added_sugars_g: 0,
    },
  };
}
