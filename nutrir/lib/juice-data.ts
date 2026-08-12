export type JuiceSize = "P" | "G";
export type JuiceCategoryId = "natural" | "especial" | "funcional" | "proteico";

export interface JuiceSizePricing {
  /** Preço real, cobrado no dinheiro/pix. */
  cash_cents: number;
  /** Preço "de" (gancho) exibido riscado, também é o valor cobrado no cartão. */
  card_cents: number;
  ml: number;
}

export interface JuiceOption {
  id: string;
  name: string;
  category: JuiceCategoryId;
  prices: Record<JuiceSize, JuiceSizePricing>;
}

export interface JuiceCategory {
  id: JuiceCategoryId;
  title: string;
  subtitle?: string;
  /** Nota exibida abaixo dos itens da categoria (ex.: "Mais opções em breve"). */
  note?: string;
  /** Categoria inteira ainda não disponível, mostra só "Em breve". */
  comingSoon?: boolean;
  items: JuiceOption[];
}

const NATURAL_PRICES: Record<JuiceSize, JuiceSizePricing> = {
  P: { cash_cents: 1000, card_cents: 1200, ml: 300 },
  G: { cash_cents: 1199, card_cents: 1500, ml: 500 },
};

const ESPECIAL_PRICES: Record<JuiceSize, JuiceSizePricing> = {
  P: { cash_cents: 1000, card_cents: 1300, ml: 300 },
  G: { cash_cents: 1199, card_cents: 1600, ml: 500 },
};

export const JUICE_CATEGORIES: JuiceCategory[] = [
  {
    id: "natural",
    title: "Sucos Naturais",
    items: [
      { id: "suco-uva", name: "Uva", category: "natural", prices: NATURAL_PRICES },
      { id: "suco-morango", name: "Morango", category: "natural", prices: NATURAL_PRICES },
      { id: "suco-abacaxi", name: "Abacaxi", category: "natural", prices: NATURAL_PRICES },
      { id: "suco-limao", name: "Limão", category: "natural", prices: NATURAL_PRICES },
      { id: "suco-laranja", name: "Laranja", category: "natural", prices: NATURAL_PRICES },
    ],
  },
  {
    id: "especial",
    title: "Sucos Especiais",
    note: "Mais opções em breve",
    items: [
      { id: "suco-acerola", name: "Acerola", category: "especial", prices: ESPECIAL_PRICES },
      { id: "suco-graviola", name: "Graviola", category: "especial", prices: ESPECIAL_PRICES },
      {
        id: "suco-acerola-laranja",
        name: "Acerola e Laranja",
        category: "especial",
        prices: ESPECIAL_PRICES,
      },
    ],
  },
  {
    id: "funcional",
    title: "Sucos Funcionais",
    comingSoon: true,
    items: [],
  },
  {
    id: "proteico",
    title: "Sucos Proteicos",
    comingSoon: true,
    items: [],
  },
];

const JUICE_BY_ID: Record<string, JuiceOption> = Object.fromEntries(
  JUICE_CATEGORIES.flatMap((c) => c.items).map((j) => [j.id, j])
);

export function getJuiceById(id: string): JuiceOption | undefined {
  return JUICE_BY_ID[id];
}

export function getJuiceCatalogPricing(
  itemId: string | undefined,
  size: JuiceSize | undefined
): JuiceSizePricing | undefined {
  if (!itemId || !size) return undefined;
  return JUICE_BY_ID[itemId]?.prices[size];
}
