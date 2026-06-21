export interface MealAddon {
  id: string;
  name: string;
  baseCost: number;
  additionalPrice: number;
  portionLabel: string;
  portionUnit: string;
  portionUnitPlural: string;
}

export const MAX_ADDON_PORTIONS = 10;

export const MEAL_ADDONS: MealAddon[] = [
  {
    id: "add-molho",
    name: "Molho da casa",
    baseCost: 0.06,
    additionalPrice: 1.5,
    portionLabel: "1 porção",
    portionUnit: "porção",
    portionUnitPlural: "porções",
  },
  {
    id: "add-queijo",
    name: "Queijo",
    baseCost: 1.0,
    additionalPrice: 3.5,
    portionLabel: "1 fatia",
    portionUnit: "fatia",
    portionUnitPlural: "fatias",
  },
  {
    id: "add-ervilha",
    name: "Ervilha",
    baseCost: 0.44,
    additionalPrice: 2.5,
    portionLabel: "1 porção (20g)",
    portionUnit: "porção",
    portionUnitPlural: "porções",
  },
  {
    id: "add-lentilha",
    name: "Lentilha",
    baseCost: 0.4,
    additionalPrice: 2.5,
    portionLabel: "1 porção (20g)",
    portionUnit: "porção",
    portionUnitPlural: "porções",
  },
  {
    id: "add-grao",
    name: "Grão de Bico",
    baseCost: 0.4,
    additionalPrice: 2.5,
    portionLabel: "1 porção (20g)",
    portionUnit: "porção",
    portionUnitPlural: "porções",
  },
  {
    id: "add-milho",
    name: "Milho",
    baseCost: 0.3,
    additionalPrice: 2.5,
    portionLabel: "1 porção (20g)",
    portionUnit: "porção",
    portionUnitPlural: "porções",
  },
  {
    id: "add-azeite",
    name: "Azeite",
    baseCost: 0.4,
    additionalPrice: 2.5,
    portionLabel: "5ml",
    portionUnit: "porção",
    portionUnitPlural: "porções",
  },
];

const ADDON_BY_ID = Object.fromEntries(MEAL_ADDONS.map((a) => [a.id, a]));

/** Arredonda para cima ao múltiplo de R$ 0,50. */
export function roundAddonPrice(price: number): number {
  if (price <= 0) return 0;
  return Math.ceil(price * 2) / 2;
}

export function getAddonUnitPriceReais(addon: MealAddon): number {
  return roundAddonPrice(addon.baseCost + addon.additionalPrice);
}

export function getAddonUnitPriceCents(addon: MealAddon): number {
  return Math.round(getAddonUnitPriceReais(addon) * 100);
}

export function getAddonById(id: string): MealAddon | undefined {
  return ADDON_BY_ID[id];
}

export type AddonSelectionMap = Record<string, number>;

export function formatAddonPortions(addon: MealAddon, count: number): string {
  if (count <= 0) return "";
  const unit = count === 1 ? addon.portionUnit : addon.portionUnitPlural;
  return `${count} ${unit}`;
}

export function formatAddonSelectionLine(addonId: string, portions: number): string {
  const addon = getAddonById(addonId);
  if (!addon || portions <= 0) return "";
  return `${addon.name} (${formatAddonPortions(addon, portions)})`;
}

export function selectionMapTotalCents(selection: AddonSelectionMap): number {
  return Object.entries(selection).reduce((sum, [id, portions]) => {
    const addon = getAddonById(id);
    if (!addon || portions <= 0) return sum;
    return sum + getAddonUnitPriceCents(addon) * portions;
  }, 0);
}

export function formatSelectionMap(selection: AddonSelectionMap): string {
  return Object.entries(selection)
    .filter(([, portions]) => portions > 0)
    .map(([id, portions]) => formatAddonSelectionLine(id, portions))
    .filter(Boolean)
    .join(", ");
}

export function computeMealAddonsCents(
  mode: "same" | "custom" | "single",
  mealCount: number,
  same?: AddonSelectionMap,
  perMeal?: AddonSelectionMap[]
): number {
  if (mode === "single" || mode === "same") {
    const perMealCents = selectionMapTotalCents(same ?? {});
    return perMealCents * mealCount;
  }

  return (perMeal ?? []).reduce((sum, meal) => sum + selectionMapTotalCents(meal), 0);
}

export function buildAddonsNote(
  mode: "same" | "custom" | "single",
  mealLabels: string[],
  same?: AddonSelectionMap,
  perMeal?: AddonSelectionMap[]
): string | undefined {
  const sameText = formatSelectionMap(same ?? {});
  if (mode === "single" || mode === "same") {
    if (!sameText) return undefined;
    if (mode === "single") return `Adicionais: ${sameText}`;
    return `Adicionais (todas as ${mealLabels.length} marmitas): ${sameText}`;
  }

  const lines = (perMeal ?? [])
    .map((meal, index) => {
      const text = formatSelectionMap(meal);
      if (!text) return null;
      const label = mealLabels[index] ?? `Marmita ${index + 1}`;
      return `${label}: ${text}`;
    })
    .filter(Boolean);

  if (lines.length === 0) return undefined;
  return `Adicionais por marmita:\n${lines.join("\n")}`;
}
