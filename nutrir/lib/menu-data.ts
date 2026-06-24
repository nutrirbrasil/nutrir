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
            cash_total_cents: 42000,
            card_per_meal_cents: 1899,
            cash_per_meal_cents: 1499,
          },
          G: {
            card_total_cents: 58800,
            cash_total_cents: 50400,
            card_per_meal_cents: 2099,
            cash_per_meal_cents: 1799,
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
}

export interface MenuSection {
  id: string;
  title: string;
  subtitle?: string;
  comingSoon?: boolean;
  items: MarmitaOption[];
}

/** Preços avulsos por categoria (centavos) */
const PRICES = {
  frango: { P: 2299, G: 2499 },
  carne: { P: 2799, G: 2999 },
  vegetariano: { P: 2199, G: 2399 },
} as const;

export const MENU_SECTIONS: MenuSection[] = [
  {
    id: "frango",
    title: "Opções com Frango",
    subtitle: "Proteína magra, temperos caseiros",
    items: [
      {
        id: "frg-batata",
        name: "Frango & Batata",
        description: "Frango acebolado, purê de batata e legumes",
        prices: { P: PRICES.frango.P, G: PRICES.frango.G },
      },
      {
        id: "frg-arroz",
        name: "Frango & Arroz",
        description: "Frango em cubos, arroz e legumes",
        prices: { P: PRICES.frango.P, G: PRICES.frango.G },
      },
      {
        id: "frg-massa",
        name: "Frango & Massa",
        description: "Frango em cubos, massa e legumes",
        prices: { P: PRICES.frango.P, G: PRICES.frango.G },
      },
    ],
  },
  {
    id: "carne",
    title: "Opções com Carne",
    subtitle: "Cortes magros, sabor de casa",
    items: [
      {
        id: "car-massa",
        name: "Carne & Massa",
        description: "Carne moída, massa e legumes",
        prices: { P: PRICES.carne.P, G: PRICES.carne.G },
      },
      {
        id: "car-arroz",
        name: "Carne & Arroz",
        description: "Carne moída com milho, arroz e legumes",
        prices: { P: PRICES.carne.P, G: PRICES.carne.G },
      },
      {
        id: "car-batata",
        name: "Carne & Batata",
        description: "Carne em tiras/cubos, batata sauté e legumes",
        prices: { P: PRICES.carne.P, G: PRICES.carne.G },
      },
    ],
  },
  {
    id: "vegetariano",
    title: "Opções Vegetarianas",
    subtitle: "Proteína vegetal, muito sabor",
    items: [
      {
        id: "veg-ervilha",
        name: "Vegetariano Ervilha",
        description: "Ervilha, arroz e legumes",
        prices: { P: PRICES.vegetariano.P, G: PRICES.vegetariano.G },
      },
      {
        id: "veg-grao",
        name: "Vegetariano Grão de Bico",
        description: "Grão de bico, arroz e legumes",
        prices: { P: PRICES.vegetariano.P, G: PRICES.vegetariano.G },
      },
    ],
  },
  {
    id: "premium",
    title: "Opções Premium",
    subtitle: "Em breve",
    comingSoon: true,
    items: [],
  },
];

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
    .filter((item) => !excludeItemIds.includes(item.id))
    .map((item) => ({
      item: { ...item, section_id: sectionId },
      price_cents: item.prices[size],
      weight_g: sizeInfo.total_g,
    }));
}
