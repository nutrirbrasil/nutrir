import type { MarmitaSize } from "./menu-data";

/** Ingredientes da planilha de custo (colunas da tabela de marmitas), com custo em R$ por kg. */
export interface CostIngredient {
  id: string;
  label: string;
  /** R$ por kg, estimado a partir da planilha de custo das marmitas (editável na calculadora). */
  defaultCostPerKg: number;
}

export const COST_INGREDIENTS: CostIngredient[] = [
  { id: "frango", label: "Frango", defaultCostPerKg: 19.26 },
  { id: "carne_moida", label: "Carne moída", defaultCostPerKg: 52.64 },
  { id: "carne_cubos", label: "Carne (strogonoff)", defaultCostPerKg: 79.26 },
  { id: "arroz", label: "Arroz com brócolis", defaultCostPerKg: 1.07 },
  { id: "cenoura", label: "Cenoura", defaultCostPerKg: 4.69 },
  { id: "brocolis", label: "Brócolis", defaultCostPerKg: 18.01 },
  { id: "mix", label: "Mix (cenoura e brócolis)", defaultCostPerKg: 13.53 },
  { id: "massa_molho", label: "Massa com molho", defaultCostPerKg: 1.95 },
  { id: "pure", label: "Purê de batata", defaultCostPerKg: 7.18 },
  { id: "queijo", label: "Queijo", defaultCostPerKg: 39.36 },
  { id: "molho", label: "Molho da casa", defaultCostPerKg: 23.09 },
  { id: "ervilha", label: "Ervilha", defaultCostPerKg: 23.82 },
  { id: "grao", label: "Grão de bico", defaultCostPerKg: 2.63 },
  { id: "cogumelo", label: "Cogumelos", defaultCostPerKg: 83.4 },
  { id: "molho_strog", label: "Molho strogonoff", defaultCostPerKg: 45.33 },
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
    lines: Object.entries(comp).map(([ingredientId, grams]) => ({ ingredientId, grams })),
  };
}

/** Marmitas da planilha de custo (quantidades em gramas prontas, como na planilha). */
export const COST_DISHES: CostDish[] = [
  dish("frg-arroz-P", "Frango da Casa", "frg-arroz", "P", { frango: 53, arroz: 120, cenoura: 10, molho: 27 }),
  dish("frg-arroz-G", "Frango da Casa", "frg-arroz", "G", { frango: 80, arroz: 190, mix: 39, molho: 41 }),
  dish("frg-massa-P", "Frango ao Sugo", "frg-massa", "P", { frango: 53, massa_molho: 120, brocolis: 10, molho: 27 }),
  dish("frg-massa-G", "Frango ao Sugo", "frg-massa", "G", { frango: 80, massa_molho: 220, brocolis: 9, molho: 41 }),
  dish("frg-batata-P", "Escondidinho de Frango", "frg-batata", "P", { frango: 66, pure: 125, queijo: 5, molho: 34 }),
  dish("frg-batata-G", "Escondidinho de Frango", "frg-batata", "G", { frango: 80, pure: 225, queijo: 5, molho: 41 }),
  dish("car-arroz-P", "Carne da Casa", "car-arroz", "P", { carne_moida: 50, arroz: 100, mix: 30, molho: 30 }),
  dish("car-arroz-G", "Carne da Casa", "car-arroz", "G", { carne_moida: 75, arroz: 190, mix: 39, molho: 46 }),
  dish("car-massa-P", "Ragu à Bolonhesa", "car-massa", "P", { carne_moida: 50, massa_molho: 120, brocolis: 10, molho: 30 }),
  dish("car-massa-G", "Ragu à Bolonhesa", "car-massa", "G", { carne_moida: 75, massa_molho: 220, brocolis: 9, molho: 46 }),
  dish("car-batata-P", "Escondidinho de Carne", "car-batata", "P", { carne_moida: 62, pure: 125, queijo: 5, molho: 38 }),
  dish("car-batata-G", "Escondidinho de Carne", "car-batata", "G", { carne_moida: 75, pure: 225, queijo: 5, molho: 45 }),
  dish("veg-ervilha-P", "Mix Ervilha", "veg-ervilha", "P", { ervilha: 66, arroz: 80, mix: 30, molho: 34 }),
  dish("veg-ervilha-G", "Mix Ervilha", "veg-ervilha", "G", { ervilha: 93, arroz: 180, mix: 30, molho: 47 }),
  dish("veg-grao-P", "Mix Grão de Bico", "veg-grao", "P", { grao: 66, arroz: 80, mix: 30, molho: 34 }),
  dish("veg-grao-G", "Mix Grão de Bico", "veg-grao", "G", { grao: 93, arroz: 180, mix: 30, molho: 47 }),
  dish("veg-cogumelo-P", "Escondidinho de Cogumelo", "veg-cogumelo", "P", { cogumelo: 70, pure: 125, queijo: 5, brocolis: 30 }),
  dish("veg-cogumelo-G", "Escondidinho de Cogumelo", "veg-cogumelo", "G", { cogumelo: 84, pure: 225, queijo: 5, brocolis: 35 }),
  dish("frg-estrogonofe-P", "Strogonoff de Frango", "frg-estrogonofe", "P", { frango: 55, arroz: 120, molho_strog: 55 }),
  dish("frg-estrogonofe-G", "Strogonoff de Frango", "frg-estrogonofe", "G", { frango: 75, arroz: 200, molho_strog: 75 }),
  dish("car-estrogonofe-P", "Strogonoff de Carne", "car-estrogonofe", "P", { carne_cubos: 55, arroz: 120, molho_strog: 55 }),
  dish("car-estrogonofe-G", "Strogonoff de Carne", "car-estrogonofe", "G", { carne_cubos: 75, arroz: 200, molho_strog: 75 }),
];

export function costOfLines(
  lines: CostLine[],
  costPerKg: Record<string, number>
): number {
  return lines.reduce((sum, l) => sum + ((costPerKg[l.ingredientId] ?? 0) * l.grams) / 1000, 0);
}
