import type { MarmitaSize } from "./menu-data";

/** Ingrediente do catálogo (nutrir_foods) — editável via /admin/fichas-tecnicas. */
export interface Food {
  id: string;
  display_name: string;
  reference_label: string;
  source: string | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
  saturated_fat_g: number | null;
  contains_gluten: boolean;
  contains_lactose: boolean;
  /** peso_pronto = peso_cru × cooking_factor. 1 = não muda de peso ao preparar. */
  cooking_factor: number;
  /** true = não entra no cálculo nutricional nem na lista de ingredientes do rótulo (ex: água usada pra cozinhar). */
  is_reference_only: boolean;
}

/** Payload para criar/editar um ingrediente do catálogo via /admin/fichas-tecnicas. */
export interface FoodInput {
  display_name: string;
  reference_label: string;
  source?: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
  saturated_fat_g?: number;
  contains_gluten?: boolean;
  contains_lactose?: boolean;
  cooking_factor?: number;
  is_reference_only?: boolean;
}

/**
 * Ingrediente de uma receita. Pode ter subitens (ex: "cebola" e "sal" dentro
 * de "peito de frango") — o total exibido do ingrediente principal é ele
 * mesmo + a soma dos subitens (rolledUpGrams). Só um nível de profundidade.
 */
export interface RecipeIngredient {
  id: string;
  food: Food;
  /** Peso pronto/como consumido (g) deste item — não inclui os subitens. */
  grams: number;
  /** Observação específica deste ingrediente nesta receita (ex: "1% do peso cru do frango"). */
  note: string | null;
  children: RecipeIngredient[];
}

/** Ficha técnica de uma marmita (item_id + tamanho) — nutrir_recipes. */
export interface Recipe {
  item_id: string;
  size: MarmitaSize;
  observations: string | null;
  ingredients: RecipeIngredient[];
}

/** Peso cru necessário para render o peso pronto informado, usando o cooking_factor do alimento. */
export function rawGramsForFood(food: Food, preparedGrams: number): number {
  const factor = food.cooking_factor || 1;
  return preparedGrams / factor;
}

/**
 * Total exibido de um ingrediente principal: ele mesmo + todos os subitens
 * que não são só-de-referência (água não conta, evapora no preparo).
 */
export function rolledUpGrams(ingredient: RecipeIngredient): number {
  return (
    ingredient.grams +
    ingredient.children
      .filter((c) => !c.food.is_reference_only)
      .reduce((s, c) => s + rolledUpGrams(c), 0)
  );
}

/** Achata a árvore (item + subitens de todos os níveis) numa lista só, para cálculo/soma. */
export function flattenIngredients(ingredients: RecipeIngredient[]): RecipeIngredient[] {
  const out: RecipeIngredient[] = [];
  for (const ing of ingredients) {
    out.push(ing);
    if (ing.children.length > 0) out.push(...flattenIngredients(ing.children));
  }
  return out;
}

export interface MergedIngredientTotal {
  food: Food;
  /** Soma das gramas prontas de todas as ocorrências desse alimento na receita (item principal + subitens). */
  totalGrams: number;
}

/**
 * Ingredientes únicos por alimento, gramas somadas, ordenados decrescente —
 * para o rótulo e a lista final. Ingredientes só-de-referência (água) ficam
 * de fora, já que não vão pra lista de ingredientes impressa.
 */
export function getMergedIngredientTotals(recipe: Recipe): MergedIngredientTotal[] {
  const byFood = new Map<string, MergedIngredientTotal>();
  for (const ing of flattenIngredients(recipe.ingredients)) {
    if (ing.food.is_reference_only) continue;
    const existing = byFood.get(ing.food.id);
    if (existing) {
      existing.totalGrams += ing.grams;
    } else {
      byFood.set(ing.food.id, { food: ing.food, totalGrams: ing.grams });
    }
  }
  return Array.from(byFood.values()).sort((a, b) => b.totalGrams - a.totalGrams);
}

export interface NutrientTotals {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
  saturated_fat_g?: number;
}

export interface MarmitaNutritionFacts {
  item_id: string;
  size: MarmitaSize;
  portion_g: number;
  /** Medida caseira (RDC 429) */
  household_measure: string;
  servings_per_package: number;
  /** Totais da porção (marmita inteira) */
  totals: NutrientTotals;
  /** Valores recalculados para 100 g da preparação */
  per_100g: NutrientTotals;
  /** Açúcares e gordura trans (porção) — sem adição de açúcar nas receitas */
  total_sugars_g: number;
  added_sugars_g: number;
  trans_fat_g: number;
  /** % do valor diário de referência (RDC 429/2020, 2 000 kcal) — referente à porção */
  daily_values_pct: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sodium_mg: number;
    saturated_fat_g?: number;
    added_sugars_g?: number;
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
  added_sugars_g: 50,
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

/** Nutrientes de `grams` gramas de um alimento. */
function nutrientsForFoodGrams(food: Food, grams: number): NutrientTotals {
  const f = grams / 100;
  return {
    kcal: food.kcal * f,
    protein_g: food.protein_g * f,
    carbs_g: food.carbs_g * f,
    fat_g: food.fat_g * f,
    fiber_g: food.fiber_g * f,
    sodium_mg: food.sodium_mg * f,
    saturated_fat_g: food.saturated_fat_g != null ? food.saturated_fat_g * f : 0,
  };
}

/**
 * Soma os nutrientes usando só o perfil de cada item PRINCIPAL, escalado pelo
 * seu total somado (ele mesmo + subitens não-referência). Os subitens (ex:
 * molho de tomate, cebola, sal dentro do frango) contam o peso deles no total
 * do item principal, mas não entram com o próprio perfil nutricional — o
 * cálculo trata os 100 g resultantes como 100 g do item principal.
 */
function sumTopLevel(items: RecipeIngredient[]): { totals: NutrientTotals; portion_g: number } {
  let portion_g = 0;
  let totals: NutrientTotals = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sodium_mg: 0, saturated_fat_g: 0 };

  for (const item of items) {
    if (item.food.is_reference_only) continue;
    const grams = rolledUpGrams(item);
    portion_g += grams;
    const n = nutrientsForFoodGrams(item.food, grams);
    totals = {
      kcal: totals.kcal + n.kcal,
      protein_g: totals.protein_g + n.protein_g,
      carbs_g: totals.carbs_g + n.carbs_g,
      fat_g: totals.fat_g + n.fat_g,
      fiber_g: totals.fiber_g + n.fiber_g,
      sodium_mg: totals.sodium_mg + n.sodium_mg,
      saturated_fat_g: (totals.saturated_fat_g ?? 0) + (n.saturated_fat_g ?? 0),
    };
  }

  return { totals, portion_g };
}

/**
 * Calcula a tabela nutricional (kcal, macros, %VD) a partir da ficha técnica.
 * Cada item principal (nível superior) entra com seu peso total (ele mesmo +
 * subitens) usando o PRÓPRIO perfil nutricional — subitens (molho, temperos)
 * só contam o peso, não o valor nutricional deles. Água nunca entra.
 */
export function computeNutritionFacts(recipe: Recipe): MarmitaNutritionFacts | null {
  const { totals: raw, portion_g } = sumTopLevel(recipe.ingredients);
  if (portion_g <= 0) return null;

  const totals = roundNutrients(raw);
  const per_100g = scaleToPer100g(totals, portion_g);

  return {
    item_id: recipe.item_id,
    size: recipe.size,
    portion_g,
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
        totals.saturated_fat_g != null
          ? pct(totals.saturated_fat_g, DV.saturated_fat_g)
          : undefined,
      added_sugars_g: 0,
    },
  };
}

