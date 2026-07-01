import {
  CHICKPEA_COOKED_FACTOR,
  LENTIL_COOKED_FACTOR,
  PASTA_COOKED_FACTOR,
  RICE_COOKED_FACTOR,
} from "./taco-foods";

/** mg de sódio por grama de sal de cozinha (NaCl, ~39,3% Na). */
const MG_SODIUM_PER_G_SALT = 393.4;

/** Sal sobre peso cru — arroz, grão-de-bico e ervilha (1%). */
const LEGUME_GRAIN_SALT_PCT_RAW = 0.01;

/** Peso cozido ÷ peso cru (batata inglesa cozida / purê). */
const POTATO_COOKED_PER_RAW = 1.25;

/** Sal sobre peso cru — frango, carne e batata (0,6%). */
const MEAT_POTATO_SALT_PCT_RAW = 0.006;

/** Sal na água de cozimento da massa (2%). */
const PASTA_WATER_SALT_PCT = 0.02;

/** Relação água : massa seca no cozimento (3:1). */
const PASTA_WATER_TO_DRY_RATIO = 3;

/** ~90% do sal da água escorre; permanecem 10% na massa. */
const PASTA_SALT_ABSORPTION_FRACTION = 0.1;

/** Peso cozido ÷ peso cru (peito de frango). */
const CHICKEN_COOKED_TO_RAW = 0.72;

/** Peso cozido ÷ peso cru (patinho). */
const BEEF_COOKED_TO_RAW = 0.7;

const SEASONED_FOOD_IDS = new Set([
  "arroz_branco_cozido",
  "grao_de_bico_cozido",
  "ervilha_seca_cozida",
  "batata_cozida",
  "frango_peito_cozido",
  "carne_patinho_grelhado",
  "massa_cozida",
]);

function saltGramsToSodiumMg(saltG: number): number {
  return saltG * MG_SODIUM_PER_G_SALT;
}

function sodiumFromSalOnRawWeight(
  cookedGrams: number,
  cookedFactor: number,
  saltPctRaw: number
): number {
  const dryG = cookedGrams / cookedFactor;
  return saltGramsToSodiumMg(dryG * saltPctRaw);
}

function sodiumFromSeasonedMeat(foodId: string, cookedGrams: number): number {
  const cookedToRaw =
    foodId === "frango_peito_cozido" ? CHICKEN_COOKED_TO_RAW : BEEF_COOKED_TO_RAW;
  const rawG = cookedGrams / cookedToRaw;
  return saltGramsToSodiumMg(rawG * MEAT_POTATO_SALT_PCT_RAW);
}

function sodiumFromSeasonedPotato(cookedGrams: number): number {
  const rawG = cookedGrams / POTATO_COOKED_PER_RAW;
  return saltGramsToSodiumMg(rawG * MEAT_POTATO_SALT_PCT_RAW);
}

function sodiumFromSeasonedPasta(cookedGrams: number): number {
  const dryG = cookedGrams / PASTA_COOKED_FACTOR;
  const waterG = dryG * PASTA_WATER_TO_DRY_RATIO;
  const saltInWaterG = waterG * PASTA_WATER_SALT_PCT;
  const absorbedSaltG = saltInWaterG * PASTA_SALT_ABSORPTION_FRACTION;
  return saltGramsToSodiumMg(absorbedSaltG);
}

/** Sódio do tempero (sal) para um ingrediente da marmita. */
export function seasoningSodiumMg(foodId: string, cookedOrPortionGrams: number): number {
  switch (foodId) {
    case "arroz_branco_cozido":
      return sodiumFromSalOnRawWeight(
        cookedOrPortionGrams,
        RICE_COOKED_FACTOR,
        LEGUME_GRAIN_SALT_PCT_RAW
      );
    case "grao_de_bico_cozido":
      return sodiumFromSalOnRawWeight(
        cookedOrPortionGrams,
        CHICKPEA_COOKED_FACTOR,
        LEGUME_GRAIN_SALT_PCT_RAW
      );
    case "ervilha_seca_cozida":
      return sodiumFromSalOnRawWeight(
        cookedOrPortionGrams,
        LENTIL_COOKED_FACTOR,
        LEGUME_GRAIN_SALT_PCT_RAW
      );
    case "frango_peito_cozido":
    case "carne_patinho_grelhado":
      return sodiumFromSeasonedMeat(foodId, cookedOrPortionGrams);
    case "batata_cozida":
      return sodiumFromSeasonedPotato(cookedOrPortionGrams);
    case "massa_cozida":
      return sodiumFromSeasonedPasta(cookedOrPortionGrams);
    default:
      return 0;
  }
}

export function usesKitchenSaltSeasoning(foodId: string): boolean {
  return SEASONED_FOOD_IDS.has(foodId);
}

/** Sódio total do ingrediente: tempero da cozinha ou valor TACO (queijo, legumes etc.). */
export function ingredientSodiumMg(
  foodId: string,
  grams: number,
  tacoSodiumMg: number
): number {
  if (usesKitchenSaltSeasoning(foodId)) {
    return seasoningSodiumMg(foodId, grams);
  }
  return tacoSodiumMg;
}
