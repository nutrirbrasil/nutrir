/**
 * Valores por 100 g (parte comestível), TACO 4ª ed. revisada e ampliada (NEPA/UNICAMP).
 * Itens marcados como derivados seguem fator de cocção NEPA quando a forma cozida não consta na TACO.
 */

export interface TacoNutrientsPer100g {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
  saturated_fat_g?: number;
}

export interface TacoFood {
  id: string;
  label: string;
  /** Referência na TACO ou nota de derivação */
  source: string;
  per100g: TacoNutrientsPer100g;
}

/** Fator cru → cozido (grão-de-bico), rendimento ~2,2× */
const CHICKPEA_COOKED_FACTOR = 2.2;
/** Fator cru → cozido (macarrão de trigo), rendimento ~2,5× */
const PASTA_COOKED_FACTOR = 2.5;

const grãoDeBicoCru: TacoNutrientsPer100g = {
  kcal: 355,
  protein_g: 21.2,
  carbs_g: 57.9,
  fat_g: 5.4,
  fiber_g: 12.4,
  sodium_mg: 10,
};

const macarraoTrigoCru: TacoNutrientsPer100g = {
  kcal: 371,
  protein_g: 10,
  carbs_g: 77.9,
  fat_g: 1.3,
  fiber_g: 2.9,
  sodium_mg: 17,
};

function cookedFromDry(dry: TacoNutrientsPer100g, factor: number): TacoNutrientsPer100g {
  return {
    kcal: dry.kcal / factor,
    protein_g: dry.protein_g / factor,
    carbs_g: dry.carbs_g / factor,
    fat_g: dry.fat_g / factor,
    fiber_g: dry.fiber_g / factor,
    sodium_mg: dry.sodium_mg / factor,
  };
}

export const TACO_FOODS: Record<string, TacoFood> = {
  frango_peito_cozido: {
    id: "frango_peito_cozido",
    label: "Frango, peito, sem pele, cozido",
    source: "TACO #408",
    per100g: {
      kcal: 163,
      protein_g: 31.5,
      carbs_g: 0,
      fat_g: 3.2,
      fiber_g: 0,
      sodium_mg: 4,
    },
  },
  carne_patinho_grelhado: {
    id: "carne_patinho_grelhado",
    label: "Carne bovina, patinho, sem gordura, grelhado",
    source: "TACO #377",
    per100g: {
      kcal: 219,
      protein_g: 35.9,
      carbs_g: 0,
      fat_g: 7.3,
      fiber_g: 0,
      sodium_mg: 5,
    },
  },
  arroz_branco_cozido: {
    id: "arroz_branco_cozido",
    label: "Arroz, tipo 1, cozido",
    source: "TACO #3",
    per100g: {
      kcal: 128,
      protein_g: 2.5,
      carbs_g: 28.1,
      fat_g: 0.2,
      fiber_g: 1.6,
      sodium_mg: 1,
    },
  },
  massa_cozida: {
    id: "massa_cozida",
    label: "Macarrão, trigo, cozido",
    source: `Derivado de TACO #40 (cru), fator ${PASTA_COOKED_FACTOR}×`,
    per100g: cookedFromDry(macarraoTrigoCru, PASTA_COOKED_FACTOR),
  },
  batata_cozida: {
    id: "batata_cozida",
    label: "Batata, inglesa, cozida",
    source: "TACO #91",
    per100g: {
      kcal: 52,
      protein_g: 1.2,
      carbs_g: 11.9,
      fat_g: 0,
      fiber_g: 1.3,
      sodium_mg: 2,
    },
  },
  brocolis_cozido: {
    id: "brocolis_cozido",
    label: "Brócolis, cozido",
    source: "TACO #100",
    per100g: {
      kcal: 25,
      protein_g: 2.1,
      carbs_g: 4.4,
      fat_g: 0.5,
      fiber_g: 3.4,
      sodium_mg: 1,
    },
  },
  cenoura_cozida: {
    id: "cenoura_cozida",
    label: "Cenoura, cozida",
    source: "TACO #109",
    per100g: {
      kcal: 30,
      protein_g: 0.8,
      carbs_g: 6.7,
      fat_g: 0.2,
      fiber_g: 2.6,
      sodium_mg: 26,
    },
  },
  grao_de_bico_cozido: {
    id: "grao_de_bico_cozido",
    label: "Grão-de-bico, cozido",
    source: `Derivado de TACO #575 (cru), fator ${CHICKPEA_COOKED_FACTOR}×`,
    per100g: cookedFromDry(grãoDeBicoCru, CHICKPEA_COOKED_FACTOR),
  },
  ervilha_seca_cozida: {
    id: "ervilha_seca_cozida",
    label: "Ervilha, seca, cozida",
    /** Ausente na TACO 4ª ed.; composição IBGE/TBCA (EPM-UNIFESP) */
    source: "TBCA — ervilha seca cozida (ausente na TACO 4ª ed.)",
    per100g: {
      kcal: 118,
      protein_g: 8.34,
      carbs_g: 21.1,
      fat_g: 0.39,
      fiber_g: 8.3,
      sodium_mg: 2,
    },
  },
  queijo_mussarela: {
    id: "queijo_mussarela",
    label: "Queijo, mozarela",
    source: "TACO #463",
    per100g: {
      kcal: 330,
      protein_g: 22.6,
      carbs_g: 3,
      fat_g: 25.2,
      fiber_g: 0,
      sodium_mg: 875,
      saturated_fat_g: 14.2,
    },
  },
};

export function nutrientsForGrams(food: TacoFood, grams: number): TacoNutrientsPer100g {
  const f = grams / 100;
  const p = food.per100g;
  return {
    kcal: p.kcal * f,
    protein_g: p.protein_g * f,
    carbs_g: p.carbs_g * f,
    fat_g: p.fat_g * f,
    fiber_g: p.fiber_g * f,
    sodium_mg: p.sodium_mg * f,
    saturated_fat_g: p.saturated_fat_g != null ? p.saturated_fat_g * f : undefined,
  };
}

export function sumNutrients(parts: TacoNutrientsPer100g[]): TacoNutrientsPer100g {
  return parts.reduce(
    (acc, p) => ({
      kcal: acc.kcal + p.kcal,
      protein_g: acc.protein_g + p.protein_g,
      carbs_g: acc.carbs_g + p.carbs_g,
      fat_g: acc.fat_g + p.fat_g,
      fiber_g: acc.fiber_g + p.fiber_g,
      sodium_mg: acc.sodium_mg + p.sodium_mg,
      saturated_fat_g: (acc.saturated_fat_g ?? 0) + (p.saturated_fat_g ?? 0),
    }),
    {
      kcal: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      sodium_mg: 0,
      saturated_fat_g: 0,
    }
  );
}
