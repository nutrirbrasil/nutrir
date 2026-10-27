import type { MarmitaSize } from "./menu-data";

/**
 * Ingredientes da planilha de custo. O custo é o "preço líquido" da planilha: R$ por kg do
 * ingrediente já pronto, ou seja, já contando o fator de cocção (então multiplica direto
 * pelo peso pronto da marmita).
 */
export interface CostIngredient {
  id: string;
  label: string;
  /** Preço líquido em R$ por kg de peso pronto (editável na calculadora). */
  defaultCostPerKg: number;
}

export const COST_INGREDIENTS: CostIngredient[] = [
  // Proteínas
  { id: "frango", label: "Frango", defaultCostPerKg: 24.27 },
  { id: "frango_cubos", label: "Frango em cubos", defaultCostPerKg: 24.27 },
  { id: "frango_acebolado", label: "Frango acebolado", defaultCostPerKg: 24.27 },
  { id: "carne", label: "Carne", defaultCostPerKg: 84.21 },
  { id: "carne_moida", label: "Carne moída", defaultCostPerKg: 58.76 },
  { id: "carne_barata", label: "Carne barata", defaultCostPerKg: 67.86 },
  { id: "carne_cubos", label: "Carne em tiras/cubos", defaultCostPerKg: 75.82 },
  { id: "patinho", label: "Patinho", defaultCostPerKg: 80.88 },
  { id: "lagarto", label: "Lagarto", defaultCostPerKg: 67.86 },
  { id: "ovo", label: "Ovo", defaultCostPerKg: 21.16 },
  { id: "ervilha", label: "Ervilha", defaultCostPerKg: 29.17 },
  { id: "lentilha", label: "Lentilha", defaultCostPerKg: 7.88 },
  { id: "grao", label: "Grão de bico", defaultCostPerKg: 7.84 },
  // Carboidratos
  { id: "arroz", label: "Arroz", defaultCostPerKg: 1.22 },
  { id: "arroz_integral", label: "Arroz integral", defaultCostPerKg: 1.35 },
  { id: "arroz_brocolis", label: "Arroz com brócolis", defaultCostPerKg: 3.09 },
  { id: "arroz_colorido", label: "Arroz colorido", defaultCostPerKg: 1.82 },
  { id: "batata", label: "Batata", defaultCostPerKg: 6.49 },
  { id: "pure", label: "Purê de batata", defaultCostPerKg: 7.38 },
  { id: "batata_saute", label: "Batata sauté", defaultCostPerKg: 7.5 },
  { id: "massa", label: "Massa", defaultCostPerKg: 1.95 },
  { id: "massa_molho", label: "Massa com molho", defaultCostPerKg: 2.24 },
  { id: "massa_sem_gluten", label: "Massa sem glúten", defaultCostPerKg: 2.75 },
  { id: "milho", label: "Milho", defaultCostPerKg: 6.04 },
  // Legumes
  { id: "cenoura", label: "Cenoura", defaultCostPerKg: 8.6 },
  { id: "brocolis", label: "Brócolis", defaultCostPerKg: 19.96 },
  { id: "brocolis_cenoura", label: "Brócolis e cenoura", defaultCostPerKg: 14.85 },
  { id: "mix", label: "Mix", defaultCostPerKg: 14.85 },
  { id: "repolho", label: "Repolho", defaultCostPerKg: 9.47 },
  { id: "repolho_roxo", label: "Repolho roxo", defaultCostPerKg: 9.47 },
  { id: "tomate", label: "Tomate", defaultCostPerKg: 13.33 },
  { id: "cebola", label: "Cebola", defaultCostPerKg: 8.33 },
  { id: "alho", label: "Alho", defaultCostPerKg: 26 },
  // Cogumelos
  { id: "cogumelo", label: "Cogumelos", defaultCostPerKg: 81.08 },
  { id: "champignon", label: "Cogumelo champignon", defaultCostPerKg: 127.19 },
  { id: "shitake", label: "Cogumelo shitake", defaultCostPerKg: 159.36 },
  { id: "shimeji", label: "Cogumelo shimeji", defaultCostPerKg: 135.96 },
  { id: "paris", label: "Cogumelo Paris", defaultCostPerKg: 96.49 },
  // Molhos e laticínios
  { id: "molho", label: "Molho da casa", defaultCostPerKg: 11.31 },
  { id: "molho_tomate", label: "Molho de tomate", defaultCostPerKg: 12.5 },
  { id: "tomate_molho", label: "Tomate para molho", defaultCostPerKg: 12.78 },
  { id: "molho_strog", label: "Molho strogonoff", defaultCostPerKg: 39.96 },
  { id: "creme_leite", label: "Creme de leite", defaultCostPerKg: 25 },
  { id: "creme_aveia", label: "Creme de aveia", defaultCostPerKg: 55.56 },
  { id: "leite", label: "Leite", defaultCostPerKg: 5.14 },
  { id: "queijo", label: "Queijo", defaultCostPerKg: 48.32 },
  { id: "requeijao", label: "Requeijão", defaultCostPerKg: 40 },
  { id: "iogurte", label: "Iogurte integral", defaultCostPerKg: 24.94 },
  // Temperos e extras
  { id: "azeite", label: "Azeite", defaultCostPerKg: 63.99 },
  { id: "oleo", label: "Óleo", defaultCostPerKg: 9 },
  { id: "sal", label: "Sal", defaultCostPerKg: 2.49 },
  { id: "tempero", label: "Tempero", defaultCostPerKg: 50 },
  { id: "ketchup", label: "Ketchup", defaultCostPerKg: 19.85 },
  { id: "mostarda", label: "Mostarda", defaultCostPerKg: 21.35 },
  { id: "shoyu", label: "Shoyu", defaultCostPerKg: 59.26 },
  { id: "mel", label: "Mel", defaultCostPerKg: 20 },
  { id: "chia", label: "Chia", defaultCostPerKg: 29 },
];

export interface CostLine {
  ingredientId: string;
  grams: number;
}

export interface CostDish {
  key: string;
  label: string;
  /** item_id do cardápio, pra buscar o preço de venda. */
  itemId: string;
  size: MarmitaSize;
  lines: CostLine[];
}

type Comp = Record<string, number>;

function dish(key: string, label: string, itemId: string, size: MarmitaSize, comp: Comp): CostDish {
  return {
    key,
    label: `${label} (${size})`,
    itemId,
    size,
    lines: Object.entries(comp)
      .filter(([, grams]) => grams > 0)
      .map(([ingredientId, grams]) => ({ ingredientId, grams })),
  };
}

/** Marmitas da planilha de custo (quantidades em gramas prontas, como na planilha). */
export const COST_DISHES: CostDish[] = [
  dish("frg-arroz-P", "Frango da Casa", "frg-arroz", "P", { frango: 53, arroz_brocolis: 115, cenoura: 15, molho: 27 }),
  dish("frg-arroz-G", "Frango da Casa", "frg-arroz", "G", { frango: 80, arroz_brocolis: 215, cenoura: 14, molho: 41 }),
  dish("frg-massa-P", "Frango ao Sugo", "frg-massa", "P", { frango: 53, massa_molho: 115, brocolis: 15, molho: 27 }),
  dish("frg-massa-G", "Frango ao Sugo", "frg-massa", "G", { frango: 80, massa_molho: 230, molho: 41 }),
  dish("frg-batata-P", "Escondidinho de Frango", "frg-batata", "P", { frango: 66, pure: 125, queijo: 5, molho: 34 }),
  dish("frg-batata-G", "Escondidinho de Frango", "frg-batata", "G", { frango: 80, pure: 225, queijo: 5, molho: 41 }),
  dish("car-arroz-P", "Carne da Casa", "car-arroz", "P", { carne_moida: 50, arroz_brocolis: 115, cenoura: 15, molho: 30 }),
  dish("car-arroz-G", "Carne da Casa", "car-arroz", "G", { carne_moida: 75, arroz_brocolis: 215, cenoura: 14, molho: 46 }),
  dish("car-massa-P", "Ragu à Bolonhesa", "car-massa", "P", { carne_moida: 50, massa_molho: 115, brocolis: 15, molho: 30 }),
  dish("car-massa-G", "Ragu à Bolonhesa", "car-massa", "G", { carne_moida: 75, massa_molho: 230, molho: 45 }),
  dish("car-batata-P", "Escondidinho de Carne", "car-batata", "P", { carne_moida: 62, pure: 125, queijo: 5, molho: 38 }),
  dish("car-batata-G", "Escondidinho de Carne", "car-batata", "G", { carne_moida: 75, pure: 225, queijo: 5, molho: 45 }),
  dish("veg-ervilha-P", "Mix Ervilha", "veg-ervilha", "P", { ervilha: 66, arroz_brocolis: 80, cenoura: 30, molho: 34 }),
  dish("veg-ervilha-G", "Mix Ervilha", "veg-ervilha", "G", { ervilha: 93, arroz_brocolis: 180, cenoura: 30, molho: 47 }),
  dish("veg-grao-P", "Mix Grão de Bico", "veg-grao", "P", { grao: 66, arroz_brocolis: 80, cenoura: 30, molho: 34 }),
  dish("veg-grao-G", "Mix Grão de Bico", "veg-grao", "G", { grao: 93, arroz_brocolis: 180, cenoura: 30, molho: 47 }),
  dish("veg-cogumelo-P", "Escondidinho de Cogumelo", "veg-cogumelo", "P", { cogumelo: 70, pure: 125, queijo: 5, brocolis: 30 }),
  dish("veg-cogumelo-G", "Escondidinho de Cogumelo", "veg-cogumelo", "G", { cogumelo: 84, pure: 225, queijo: 5, brocolis: 35 }),
  dish("frg-estrogonofe-P", "Strogonoff de Frango", "frg-estrogonofe", "P", { frango: 55, arroz: 120, molho_strog: 55 }),
  dish("frg-estrogonofe-G", "Strogonoff de Frango", "frg-estrogonofe", "G", { frango: 75, arroz: 200, molho_strog: 75 }),
  dish("car-estrogonofe-P", "Strogonoff de Carne", "car-estrogonofe", "P", { carne: 55, arroz: 120, molho_strog: 55 }),
  dish("car-estrogonofe-G", "Strogonoff de Carne", "car-estrogonofe", "G", { carne: 75, arroz: 200, molho_strog: 75 }),
];

export function costOfLines(
  lines: CostLine[],
  costPerKg: Record<string, number>
): number {
  return lines.reduce((sum, l) => sum + ((costPerKg[l.ingredientId] ?? 0) * l.grams) / 1000, 0);
}
