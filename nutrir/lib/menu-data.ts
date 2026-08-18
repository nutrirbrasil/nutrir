export type MarmitaSize = "P" | "G";

export interface SizeInfo {
  label: string;
  subtitle: string;
  protein_g: number;
  carbs_g: number;
  veggies_g: number;
  total_g: number;
}

export const SIZE_INFO: Record<MarmitaSize, SizeInfo> = {
  P: {
    label: "P",
    subtitle: "Tamanho P",
    protein_g: 100,
    carbs_g: 120,
    veggies_g: 60,
    total_g: 280,
  },
  G: {
    label: "G",
    subtitle: "Tamanho G",
    protein_g: 120,
    carbs_g: 240,
    veggies_g: 60,
    total_g: 420,
  },
};

/** Peso real de cada marmita pronta (etiqueta na foto do card, "Total" nos kits). */
export const MARMITA_WEIGHT_G: Record<MarmitaSize, number> = { P: 220, G: 380 };

export interface KitTierPricing {
  card_total_cents: number;
  cash_total_cents: number;
  card_per_meal_cents: number;
  cash_per_meal_cents: number;
}

export interface KitTier {
  meals: number;
  note?: string;
  prices: Record<MarmitaSize, KitTierPricing>;
}

export interface KitProduct {
  id: "frango" | "carne" | "misto" | "veg";
  name: string;
  description: string;
  tiers: KitTier[];
}

/** Preços dos kits — coluna cartão = referência; dinheiro/pix = valor promocional */
export const KIT_PRODUCTS: KitProduct[] = [
  {
    id: "frango",
    name: "Kit Frango",
    description:
      "Feitas 100% com peito de frango. Ideal para quem busca leveza e praticidade, com o melhor custo-benefício.",
    tiers: [
      {
        meals: 7,
        prices: {
          P: {
            card_total_cents: 16100,
            cash_total_cents: 14000,
            card_per_meal_cents: 2299,
            cash_per_meal_cents: 1999,
          },
          G: {
            card_total_cents: 17500,
            cash_total_cents: 15400,
            card_per_meal_cents: 2499,
            cash_per_meal_cents: 2199,
          },
        },
      },
      {
        meals: 14,
        note: "Pode ser dividido em 2 encomendas",
        prices: {
          P: {
            card_total_cents: 30100,
            cash_total_cents: 25900,
            card_per_meal_cents: 2149,
            cash_per_meal_cents: 1849,
          },
          G: {
            card_total_cents: 32900,
            cash_total_cents: 28700,
            card_per_meal_cents: 2349,
            cash_per_meal_cents: 2049,
          },
        },
      },
      {
        meals: 28,
        note: "Pode ser dividido em até 4 encomendas",
        prices: {
          P: {
            card_total_cents: 56000,
            cash_total_cents: 47600,
            card_per_meal_cents: 1999,
            cash_per_meal_cents: 1699,
          },
          G: {
            card_total_cents: 61600,
            cash_total_cents: 53200,
            card_per_meal_cents: 2199,
            cash_per_meal_cents: 1899,
          },
        },
      },
    ],
  },
  {
    id: "carne",
    name: "Kit Carne",
    description:
      "Feitas de carne magra (patinho). Ideal para quem busca sabor e textura da carne vermelha, sem sair da dieta.",
    tiers: [
      {
        meals: 7,
        prices: {
          P: {
            card_total_cents: 19600,
            cash_total_cents: 17500,
            card_per_meal_cents: 2799,
            cash_per_meal_cents: 2499,
          },
          G: {
            card_total_cents: 21000,
            cash_total_cents: 18900,
            card_per_meal_cents: 2999,
            cash_per_meal_cents: 2699,
          },
        },
      },
      {
        meals: 14,
        note: "Pode ser dividido em 2 encomendas",
        prices: {
          P: {
            card_total_cents: 37100,
            cash_total_cents: 32900,
            card_per_meal_cents: 2649,
            cash_per_meal_cents: 2349,
          },
          G: {
            card_total_cents: 39900,
            cash_total_cents: 35700,
            card_per_meal_cents: 2849,
            cash_per_meal_cents: 2549,
          },
        },
      },
      {
        meals: 28,
        note: "Pode ser dividido em até 4 encomendas",
        prices: {
          P: {
            card_total_cents: 70000,
            cash_total_cents: 61600,
            card_per_meal_cents: 2499,
            cash_per_meal_cents: 2199,
          },
          G: {
            card_total_cents: 75600,
            cash_total_cents: 67200,
            card_per_meal_cents: 2699,
            cash_per_meal_cents: 2399,
          },
        },
      },
    ],
  },
  {
    id: "misto",
    name: "Kit Misto",
    description: "Combine frango e carne no mesmo kit. Perfeita para quem busca variedade de sabores.",
    tiers: [
      {
        meals: 7,
        prices: {
          P: {
            card_total_cents: 17800,
            cash_total_cents: 15700,
            card_per_meal_cents: 2549,
            cash_per_meal_cents: 2249,
          },
          G: {
            card_total_cents: 19200,
            cash_total_cents: 17100,
            card_per_meal_cents: 2749,
            cash_per_meal_cents: 2449,
          },
        },
      },
      {
        meals: 14,
        note: "Pode ser dividido em 2 encomendas",
        prices: {
          P: {
            card_total_cents: 33600,
            cash_total_cents: 29400,
            card_per_meal_cents: 2399,
            cash_per_meal_cents: 2099,
          },
          G: {
            card_total_cents: 36400,
            cash_total_cents: 32200,
            card_per_meal_cents: 2600,
            cash_per_meal_cents: 2299,
          },
        },
      },
      {
        meals: 28,
        note: "Pode ser dividido em até 4 encomendas",
        prices: {
          P: {
            card_total_cents: 63000,
            cash_total_cents: 54600,
            card_per_meal_cents: 2249,
            cash_per_meal_cents: 1949,
          },
          G: {
            card_total_cents: 68600,
            cash_total_cents: 59900,
            card_per_meal_cents: 2449,
            cash_per_meal_cents: 2139,
          },
        },
      },
    ],
  },
  {
    id: "veg",
    name: "Kit Veg",
    description:
      "Marmitas 100% vegetarianas. Ideal para quem busca praticidade com proteína vegetal no dia a dia.",
    tiers: [
      {
        meals: 7,
        prices: {
          P: {
            card_total_cents: 16100,
            cash_total_cents: 14000,
            card_per_meal_cents: 2299,
            cash_per_meal_cents: 1999,
          },
          G: {
            card_total_cents: 17500,
            cash_total_cents: 15400,
            card_per_meal_cents: 2499,
            cash_per_meal_cents: 2199,
          },
        },
      },
      {
        meals: 14,
        note: "Pode ser dividido em 2 encomendas",
        prices: {
          P: {
            card_total_cents: 29400,
            cash_total_cents: 24500,
            card_per_meal_cents: 2099,
            cash_per_meal_cents: 1750,
          },
          G: {
            card_total_cents: 31500,
            cash_total_cents: 27300,
            card_per_meal_cents: 2250,
            cash_per_meal_cents: 1950,
          },
        },
      },
      {
        meals: 28,
        note: "Pode ser dividido em até 4 encomendas",
        prices: {
          P: {
            card_total_cents: 53200,
            cash_total_cents: 44800,
            card_per_meal_cents: 1899,
            cash_per_meal_cents: 1599,
          },
          G: {
            card_total_cents: 58800,
            cash_total_cents: 53200,
            card_per_meal_cents: 2099,
            cash_per_meal_cents: 1899,
          },
        },
      },
    ],
  },
];
export interface MarmitaOption {
  id: string;
  name: string;
  description: string;
  prices: Record<MarmitaSize, number>;
  /** Item ainda não disponível para pedido, aparece só como prévia ("Em breve"). */
  comingSoon?: boolean;
  /** Receita padrão sem trigo/massa. */
  glutenFree?: boolean;
  /** Receita padrão sem queijo/laticínio (escondidinhos levam queijo, viram sem lactose só removendo em Substituições). */
  lactoseFree?: boolean;
}

export interface MenuSection {
  id: string;
  title: string;
  subtitle?: string;
  comingSoon?: boolean;
  items: MarmitaOption[];
}

/** Preços avulsos (pix/dinheiro) em centavos */
const PRICES = {
  frangoArrozMassa: { P: 2199, G: 2399 },
  frangoEscondidinho: { P: 2399, G: 2599 },
  carneArrozMassa: { P: 2599, G: 2799 },
  carneEscondidinho: { P: 2799, G: 2999 },
  vegetariano: { P: 2199, G: 2399 },
  ervilha: { P: 2299, G: 2499 },
  cogumeloEscondidinho: { P: 2899, G: 3199 },
} as const;

/** section_id no carrinho (adicionais / sugestões) a partir do item_id */
export function getMarmitaCartSectionId(
  itemId: string
): "frango" | "carne" | "vegetariano" {
  if (itemId.startsWith("frg-")) return "frango";
  if (itemId.startsWith("car-")) return "carne";
  return "vegetariano";
}

export const MENU_SECTIONS: MenuSection[] = [
  {
    id: "frango",
    title: "Linha Frango",
    subtitle: "Peito de frango, sem gordura",
    items: [
      {
        id: "frg-arroz",
        name: "Frango da Casa",
        description: "Frango em cubos ao molho da casa, arroz de brócolis e cenoura salteada.",
        prices: { P: PRICES.frangoArrozMassa.P, G: PRICES.frangoArrozMassa.G },
        glutenFree: true,
        lactoseFree: true,
      },
      {
        id: "frg-massa",
        name: "Frango ao Sugo",
        description: "Frango em cubos com macarrão ao molho sugo.",
        prices: { P: PRICES.frangoArrozMassa.P, G: PRICES.frangoArrozMassa.G },
        lactoseFree: true,
      },
      {
        id: "frg-batata",
        name: "Escondidinho de Frango",
        description: "Frango desfiado ao molho da casa, coberto por purê de batata e finalizado com queijo.",
        prices: { P: PRICES.frangoEscondidinho.P, G: PRICES.frangoEscondidinho.G },
        glutenFree: true,
      },
    ],
  },
  {
    id: "carne",
    title: "Linha Carne",
    subtitle: "Carne magra, patinho",
    items: [
      {
        id: "car-arroz",
        name: "Carne da Casa",
        description: "Carne moída com cenoura ao molho da casa, arroz de brócolis e cenoura salteada.",
        prices: { P: PRICES.carneArrozMassa.P, G: PRICES.carneArrozMassa.G },
        glutenFree: true,
        lactoseFree: true,
      },
      {
        id: "car-massa",
        name: "Ragu à Bolonhesa",
        description: "Carne moída e macarrão ao molho bolonhesa.",
        prices: { P: PRICES.carneArrozMassa.P, G: PRICES.carneArrozMassa.G },
        lactoseFree: true,
      },
      {
        id: "car-batata",
        name: "Escondidinho de Carne",
        description: "Carne moída ao molho da casa, coberta por purê de batata e finalizada com queijo.",
        prices: { P: PRICES.carneEscondidinho.P, G: PRICES.carneEscondidinho.G },
        glutenFree: true,
      },
    ],
  },
  {
    id: "vegetariano",
    title: "Linha Vegetariana",
    subtitle: "Vegetariano e vegano",
    items: [
      {
        id: "veg-grao",
        name: "Mix de Grão de Bico",
        description:
          "Grão de bico cozido com seleta de legumes, arroz de brócolis e cenoura salteada.",
        prices: { P: PRICES.vegetariano.P, G: PRICES.vegetariano.G },
        glutenFree: true,
        lactoseFree: true,
      },
      {
        id: "veg-ervilha",
        name: "Mix de Ervilha",
        description:
          "Ervilhas cozidas com seleta de legumes, arroz de brócolis e cenoura salteada.",
        prices: { P: PRICES.ervilha.P, G: PRICES.ervilha.G },
        glutenFree: true,
        lactoseFree: true,
      },
      {
        id: "veg-cogumelo",
        name: "Escondidinho de Cogu",
        description: "Mix de cogumelos e brócolis salteados no molho shoyu, coberto por purê de batatas.",
        prices: { P: PRICES.cogumeloEscondidinho.P, G: PRICES.cogumeloEscondidinho.G },
        glutenFree: true,
      },
    ],
  },
  {
    id: "premium",
    title: "Linha Premium",
    subtitle: "Para fugir do básico...",
    items: [
      {
        id: "frg-batata",
        name: "Escondidinho de Frango",
        description: "Frango desfiado ao molho da casa, coberto por purê de batata e finalizado com queijo.",
        prices: { P: PRICES.frangoEscondidinho.P, G: PRICES.frangoEscondidinho.G },
        glutenFree: true,
      },
      {
        id: "car-batata",
        name: "Escondidinho de Carne",
        description: "Carne moída ao molho da casa, coberta por purê de batata e finalizada com queijo.",
        prices: { P: PRICES.carneEscondidinho.P, G: PRICES.carneEscondidinho.G },
        glutenFree: true,
      },
      {
        id: "veg-cogumelo",
        name: "Escondidinho de Cogu",
        description: "Mix de cogumelos e brócolis salteados no molho shoyu, coberto por purê de batatas.",
        prices: { P: PRICES.cogumeloEscondidinho.P, G: PRICES.cogumeloEscondidinho.G },
        glutenFree: true,
      },
    ],
  },
];

/** Itens que também aparecem na Linha Premium, além da seção de origem. */
export const PREMIUM_MARMITA_IDS = new Set(["frg-batata", "car-batata", "veg-cogumelo"]);

export function isPremiumMarmita(itemId: string): boolean {
  return PREMIUM_MARMITA_IDS.has(itemId);
}

export type SuggestionItem = MarmitaOption & { section_id: string };

/** Sugestões do mesmo grupo (frango, carne, vegetariano), excluindo itens já no carrinho. */
export function getCartSuggestions(
  sectionId: string | undefined,
  excludeItemIds: string[],
  size: MarmitaSize = "P"
): { item: SuggestionItem; price_cents: number; weight_g: number }[] {
  if (!sectionId || sectionId === "kit" || sectionId === "combo") return [];
  const section = MENU_SECTIONS.find((s) => s.id === sectionId);
  if (!section || section.comingSoon) return [];
  const sizeInfo = SIZE_INFO[size];
  return section.items
    .filter((item) => !excludeItemIds.includes(item.id) && !item.comingSoon)
    .map((item) => ({
      item: { ...item, section_id: sectionId },
      price_cents: item.prices[size],
      weight_g: sizeInfo.total_g,
    }));
}
