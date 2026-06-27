export type MealStarchType = "massa" | "arroz";

export interface MealAddon {
  id: string;
  name: string;
  baseCost: number;
  additionalPrice: number;
  portionLabel: string;
  portionUnit: string;
  portionUnitPlural: string;
  /** Se definido, o adicional só aparece em marmitas com esse acompanhamento. */
  forStarch?: MealStarchType;
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
    additionalPrice: 2.5,
    portionLabel: "1 fatia",
    portionUnit: "fatia",
    portionUnitPlural: "fatias",
  },
  {
    id: "add-ervilha",
    name: "Ervilha",
    baseCost: 0.44,
    additionalPrice: 2.5,
    portionLabel: "1 porção (30g)",
    portionUnit: "porção",
    portionUnitPlural: "porções",
  },
  {
    id: "add-lentilha",
    name: "Lentilha",
    baseCost: 0.4,
    additionalPrice: 2.5,
    portionLabel: "1 porção (30g)",
    portionUnit: "porção",
    portionUnitPlural: "porções",
  },
  {
    id: "add-grao",
    name: "Grão de Bico",
    baseCost: 0.4,
    additionalPrice: 2.5,
    portionLabel: "1 porção (30g)",
    portionUnit: "porção",
    portionUnitPlural: "porções",
  },
  {
    id: "add-milho",
    name: "Milho",
    baseCost: 0.3,
    additionalPrice: 2.5,
    portionLabel: "1 porção (30g)",
    portionUnit: "porção",
    portionUnitPlural: "porções",
  },
  {
    id: "add-azeite",
    name: "Azeite",
    baseCost: 0.4,
    additionalPrice: 2.5,
    portionLabel: "10ml",
    portionUnit: "porção",
    portionUnitPlural: "porções",
  },
  {
    id: "add-massa-sem-gluten",
    name: "Massa sem glúten",
    baseCost: 0,
    additionalPrice: 2.99,
    portionLabel: "substituição",
    portionUnit: "porção",
    portionUnitPlural: "porções",
    forStarch: "massa",
  },
  {
    id: "add-arroz-integral",
    name: "Arroz Integral",
    baseCost: 0,
    additionalPrice: 0.99,
    portionLabel: "substituição",
    portionUnit: "porção",
    portionUnitPlural: "porções",
    forStarch: "arroz",
  },
];

const ADDON_BY_ID = Object.fromEntries(MEAL_ADDONS.map((a) => [a.id, a]));

/** Arredonda para cima ao próximo ,99 (ex.: 2,90 → 2,99). */
export function roundAddonPrice(price: number): number {
  if (price <= 0) return 0;
  return Math.ceil(price) - 0.01;
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

/** Detecta massa ou arroz a partir do rótulo da marmita ou do item_id. */
export function getMealStarchType(hint: string): MealStarchType | undefined {
  const lower = hint.toLowerCase();
  if (lower.includes("massa")) return "massa";
  if (
    lower.includes("arroz") ||
    lower.includes("ervilha") ||
    lower.includes("grão") ||
    lower.includes("grao")
  ) {
    return "arroz";
  }
  return undefined;
}

export function getAddonsForStarch(starch?: MealStarchType): MealAddon[] {
  return MEAL_ADDONS.filter((addon) => !addon.forStarch || addon.forStarch === starch);
}

export function getAddonsForMealHint(hint: string): MealAddon[] {
  return getAddonsForStarch(getMealStarchType(hint));
}

/** Adicionais no modo "mesmo em todas" — extras por tipo só se todas as marmitas forem do mesmo. */
export function getAddonsForSameSelection(
  mealLabels: string[],
  itemId?: string
): MealAddon[] {
  if (mealLabels.length === 1) {
    const hint = [itemId, mealLabels[0]].filter(Boolean).join(" ");
    return getAddonsForMealHint(hint);
  }

  const starchTypes = mealLabels.map((label) => getMealStarchType(label));
  const allSame = starchTypes.every((s) => s === starchTypes[0]);
  return getAddonsForStarch(allSame ? starchTypes[0] : undefined);
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
