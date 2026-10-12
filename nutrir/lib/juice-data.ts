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

/** Faixas de preço (pix/dinheiro e cartão) por suco, P = 300ml e G = 500ml. */
function tier(
  pCash: number,
  pCard: number,
  gCash: number,
  gCard: number
): Record<JuiceSize, JuiceSizePricing> {
  return {
    P: { cash_cents: pCash, card_cents: pCard, ml: 300 },
    G: { cash_cents: gCash, card_cents: gCard, ml: 500 },
  };
}

const PRICES_BASIC = tier(999, 1099, 1199, 1399);
const PRICES_NATURAL = tier(1099, 1299, 1299, 1599);
const PRICES_ESPECIAL = tier(1299, 1499, 1599, 1799);
const PRICES_PREMIUM = tier(1399, 1599, 1799, 1899);

export const JUICE_CATEGORIES: JuiceCategory[] = [
  {
    id: "natural",
    title: "Sucos Naturais",
    items: [
      { id: "suco-limao", name: "Limão", category: "natural", prices: PRICES_BASIC },
      { id: "suco-laranja", name: "Laranja", category: "natural", prices: PRICES_BASIC },
      { id: "suco-uva", name: "Uva", category: "natural", prices: PRICES_NATURAL },
      { id: "suco-abacaxi", name: "Abacaxi", category: "natural", prices: PRICES_NATURAL },
      { id: "suco-acerola", name: "Acerola", category: "natural", prices: PRICES_NATURAL },
      {
        id: "suco-abacaxi-hortela",
        name: "Abacaxi com Hortelã",
        category: "natural",
        prices: PRICES_NATURAL,
      },
      { id: "suco-manga", name: "Manga", category: "natural", prices: PRICES_NATURAL },
    ],
  },
  {
    id: "especial",
    title: "Sucos Especiais",
    note: "Mais opções em breve",
    items: [
      { id: "suco-morango", name: "Morango", category: "especial", prices: PRICES_ESPECIAL },
      {
        id: "suco-acerola-laranja",
        name: "Acerola e Laranja",
        category: "especial",
        prices: PRICES_ESPECIAL,
      },
      {
        id: "suco-frutas-vermelhas",
        name: "Frutas Vermelhas",
        category: "especial",
        prices: PRICES_ESPECIAL,
      },
      { id: "suco-graviola", name: "Graviola", category: "especial", prices: PRICES_PREMIUM },
      { id: "suco-maracuja", name: "Maracujá", category: "especial", prices: PRICES_PREMIUM },
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

export function getJuiceCatalogPricing(
  itemId: string | undefined,
  size: JuiceSize | undefined
): JuiceSizePricing | undefined {
  if (!itemId || !size) return undefined;
  return JUICE_BY_ID[itemId]?.prices[size];
}
