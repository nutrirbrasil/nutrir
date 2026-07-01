import type { MarmitaSize } from "./menu-data";
import {
  nutrientsForGrams,
  sumNutrients,
  TACO_FOODS,
  type TacoFood,
  type TacoNutrientsPer100g,
} from "./taco-foods";

export interface MarmitaIngredient {
  food: TacoFood;
  grams: number;
}

export interface MarmitaNutritionFacts {
  item_id: string;
  size: MarmitaSize;
  portion_g: number;
  ingredients: MarmitaIngredient[];
  totals: TacoNutrientsPer100g;
  /** % do valor diário de referência (RDC 429/2020, 2 000 kcal) */
  daily_values_pct: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sodium_mg: number;
    saturated_fat_g?: number;
  };
}

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

function veggiesP(): MarmitaIngredient[] {
  return [
    { food: TACO_FOODS.brocolis_cozido, grams: 10 },
    { food: TACO_FOODS.cenoura_cozida, grams: 10 },
  ];
}

function veggiesG(): MarmitaIngredient[] {
  return [
    { food: TACO_FOODS.brocolis_cozido, grams: 10 },
    { food: TACO_FOODS.cenoura_cozida, grams: 10 },
  ];
}

function veggiesVegP(): MarmitaIngredient[] {
  return [
    { food: TACO_FOODS.brocolis_cozido, grams: 20 },
    { food: TACO_FOODS.cenoura_cozida, grams: 20 },
  ];
}

function veggiesVegG(): MarmitaIngredient[] {
  return [
    { food: TACO_FOODS.brocolis_cozido, grams: 20 },
    { food: TACO_FOODS.cenoura_cozida, grams: 20 },
  ];
}

type RecipeBuilder = (size: MarmitaSize) => MarmitaIngredient[];

const RECIPES: Record<string, RecipeBuilder> = {
  "frg-arroz": (size) => {
    const isP = size === "P";
    return [
      { food: TACO_FOODS.frango_peito_cozido, grams: isP ? 75 : 100 },
      { food: TACO_FOODS.arroz_branco_cozido, grams: isP ? 125 : 260 },
      ...(isP ? veggiesP() : veggiesG()),
    ];
  },
  "frg-massa": (size) => {
    const isP = size === "P";
    return [
      { food: TACO_FOODS.frango_peito_cozido, grams: isP ? 75 : 100 },
      { food: TACO_FOODS.massa_cozida, grams: isP ? 125 : 260 },
      ...(isP ? veggiesP() : veggiesG()),
    ];
  },
  "frg-batata": (size) => {
    const isP = size === "P";
    return [
      { food: TACO_FOODS.frango_peito_cozido, grams: isP ? 75 : 100 },
      { food: TACO_FOODS.batata_cozida, grams: isP ? 125 : 260 },
      { food: TACO_FOODS.queijo_mussarela, grams: 15 },
    ];
  },
  "car-arroz": (size) => {
    const isP = size === "P";
    return [
      { food: TACO_FOODS.carne_patinho_grelhado, grams: isP ? 75 : 100 },
      { food: TACO_FOODS.arroz_branco_cozido, grams: isP ? 125 : 260 },
      ...(isP ? veggiesP() : veggiesG()),
    ];
  },
  "car-massa": (size) => {
    const isP = size === "P";
    return [
      { food: TACO_FOODS.carne_patinho_grelhado, grams: isP ? 75 : 100 },
      { food: TACO_FOODS.massa_cozida, grams: isP ? 125 : 260 },
      ...(isP ? veggiesP() : veggiesG()),
    ];
  },
  "car-batata": (size) => {
    const isP = size === "P";
    return [
      { food: TACO_FOODS.carne_patinho_grelhado, grams: isP ? 75 : 100 },
      { food: TACO_FOODS.batata_cozida, grams: isP ? 125 : 260 },
      { food: TACO_FOODS.queijo_mussarela, grams: 15 },
    ];
  },
  "veg-ervilha": (size) => {
    const isP = size === "P";
    return [
      { food: TACO_FOODS.ervilha_seca_cozida, grams: isP ? 100 : 120 },
      { food: TACO_FOODS.arroz_branco_cozido, grams: isP ? 125 : 220 },
      ...(isP ? veggiesVegP() : veggiesVegG()),
    ];
  },
  "veg-grao": (size) => {
    const isP = size === "P";
    return [
      { food: TACO_FOODS.grao_de_bico_cozido, grams: isP ? 100 : 120 },
      { food: TACO_FOODS.arroz_branco_cozido, grams: isP ? 125 : 220 },
      ...(isP ? veggiesVegP() : veggiesVegG()),
    ];
  },
};

function roundNutrients(n: TacoNutrientsPer100g): TacoNutrientsPer100g {
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

export function getMarmitaNutrition(
  itemId: string,
  size: MarmitaSize
): MarmitaNutritionFacts | null {
  const build = RECIPES[itemId];
  if (!build) return null;

  const ingredients = build(size);
  const portion_g = ingredients.reduce((s, i) => s + i.grams, 0);
  const raw = sumNutrients(
    ingredients.map((i) => nutrientsForGrams(i.food, i.grams))
  );
  const totals = roundNutrients(raw);

  return {
    item_id: itemId,
    size,
    portion_g,
    ingredients,
    totals,
    daily_values_pct: {
      kcal: pct(totals.kcal, DV.kcal),
      protein_g: pct(totals.protein_g, DV.protein_g),
      carbs_g: pct(totals.carbs_g, DV.carbs_g),
      fat_g: pct(totals.fat_g, DV.fat_g),
      fiber_g: pct(totals.fiber_g, DV.fiber_g),
      sodium_mg: pct(totals.sodium_mg, DV.sodium_mg),
      saturated_fat_g:
        totals.saturated_fat_g != null
          ? pct(totals.saturated_fat_g, DV.saturated_fat_g)
          : undefined,
    },
  };
}

/** Todas as marmitas do cardápio com tabela calculada. */
export const MARMITA_IDS_WITH_NUTRITION = Object.keys(RECIPES);
