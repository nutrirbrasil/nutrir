export type MealStarchType = "massa" | "arroz" | "batata";

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
  /** Substituições com o mesmo grupo são mutuamente exclusivas (ex.: arroz integral x arroz branco). */
  exclusiveGroup?: string;
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
    additionalPrice: 3.56,
    portionLabel: "1 porção (30g)",
    portionUnit: "porção",
    portionUnitPlural: "porções",
  },
  {
    id: "add-lentilha",
    name: "Lentilha",
    baseCost: 0.4,
    additionalPrice: 3.6,
    portionLabel: "1 porção (30g)",
    portionUnit: "porção",
    portionUnitPlural: "porções",
  },
  {
    id: "add-grao",
    name: "Grão de Bico",
    baseCost: 0.4,
    additionalPrice: 3.6,
    portionLabel: "1 porção (30g)",
    portionUnit: "porção",
    portionUnitPlural: "porções",
  },
  {
    id: "add-milho",
    name: "Milho",
    baseCost: 0.3,
    additionalPrice: 3.7,
    portionLabel: "1 porção (30g)",
    portionUnit: "porção",
    portionUnitPlural: "porções",
  },
  {
    id: "add-azeite",
    name: "Azeite Extravirgem",
    baseCost: 0.4,
    additionalPrice: 2.5,
    portionLabel: "1 porção (10ml)",
    portionUnit: "porção",
    portionUnitPlural: "porções",
  },
  {
    id: "add-ketchup",
    name: "Ketchup",
    baseCost: 0.1,
    additionalPrice: 2.9,
    portionLabel: "1 porção",
    portionUnit: "porção",
    portionUnitPlural: "porções",
  },
  {
    id: "add-barbecue",
    name: "Barbecue",
    baseCost: 0.1,
    additionalPrice: 2.9,
    portionLabel: "1 porção",
    portionUnit: "porção",
    portionUnitPlural: "porções",
  },
  {
    id: "add-mostarda",
    name: "Mostarda",
    baseCost: 0.1,
    additionalPrice: 2.9,
    portionLabel: "1 porção",
    portionUnit: "porção",
    portionUnitPlural: "porções",
  },
  {
    id: "add-massa-sem-gluten",
    name: "Massa Sem Glúten",
    baseCost: 0,
    additionalPrice: 2.99,
    portionLabel: "Desejo substituir Massa por Massa sem Glúten",
    portionUnit: "porção",
    portionUnitPlural: "porções",
    forStarch: "massa",
  },
  {
    id: "add-arroz-integral",
    name: "Arroz Integral",
    baseCost: 0,
    additionalPrice: 0.99,
    portionLabel: "Desejo substituir Arroz de Brócolis por Arroz Integral",
    portionUnit: "porção",
    portionUnitPlural: "porções",
    forStarch: "arroz",
    exclusiveGroup: "arroz-tipo",
  },
  {
    id: "add-arroz-branco",
    name: "Arroz Branco",
    baseCost: 0,
    additionalPrice: 0,
    portionLabel: "Desejo substituir Arroz de Brócolis por Arroz Branco",
    portionUnit: "porção",
    portionUnitPlural: "porções",
    forStarch: "arroz",
    exclusiveGroup: "arroz-tipo",
  },
  {
    id: "add-pure-mandioquinha",
    name: "Purê de Mandioquinha",
    baseCost: 0.5,
    additionalPrice: 3.5,
    portionLabel: "Desejo substituir purê de batata inglesa por Purê de Mandioquinha (Batata Salsa)",
    portionUnit: "porção",
    portionUnitPlural: "porções",
    forStarch: "batata",
  },
  {
    id: "add-leite-vegetal",
    name: "Leite Vegetal",
    baseCost: 0.1,
    additionalPrice: 2.9,
    portionLabel: "Desejo substituir Leite Zero Lactose por Leite Vegetal",
    portionUnit: "porção",
    portionUnitPlural: "porções",
    forStarch: "batata",
  },
  {
    id: "add-remover-queijo",
    name: "Remover Queijo",
    baseCost: 0,
    additionalPrice: 0,
    portionLabel: "Sou intolerante a lactose e desejo remover a finalização com queijo",
    portionUnit: "porção",
    portionUnitPlural: "porções",
    forStarch: "batata",
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

/** Detecta massa, arroz ou batata (escondidinho) a partir do rótulo da marmita ou do item_id. */
export function getMealStarchType(hint: string): MealStarchType | undefined {
  const lower = hint.toLowerCase();
  if (lower.includes("escondidinho") || lower.includes("batata")) {
    return "batata";
  }
  if (lower.includes("massa") || lower.includes("sugo") || lower.includes("bolonhesa")) {
    return "massa";
  }
  if (
    lower.includes("arroz") ||
    lower.includes("ervilha") ||
    lower.includes("grão") ||
    lower.includes("grao") ||
    lower.includes("da casa")
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

/**
 * Adicionais no modo "mesmo em todas". Substituições (forStarch) aparecem se pelo menos
 * uma marmita do combo tiver aquele acompanhamento — o preço final considera só as
 * marmitas realmente compatíveis (ver computeSameModeAddonsCents), não o total do combo.
 */
export function getAddonsForSameSelection(
  mealLabels: string[],
  itemId?: string
): MealAddon[] {
  if (mealLabels.length === 1) {
    const hint = [itemId, mealLabels[0]].filter(Boolean).join(" ");
    return getAddonsForMealHint(hint);
  }

  const starchTypesPresent = new Set(
    mealLabels.map((label) => getMealStarchType(label)).filter((s): s is MealStarchType => Boolean(s))
  );
  return MEAL_ADDONS.filter((addon) => !addon.forStarch || starchTypesPresent.has(addon.forStarch));
}

/** Quantas marmitas da lista têm o acompanhamento indicado. */
export function countMealsForStarch(mealLabels: string[], starch: MealStarchType): number {
  return mealLabels.filter((label) => getMealStarchType(label) === starch).length;
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

/**
 * Preço do modo "mesmo em todas": adicionais normais valem para todas as marmitas do
 * combo, mas substituições (forStarch) valem só nas marmitas com aquele acompanhamento
 * (ex.: 3 marmitas de arroz selecionando Arroz Integral cobra 3x, não o total do combo).
 */
export function computeSameModeAddonsCents(
  mealLabels: string[],
  same: AddonSelectionMap
): number {
  return Object.entries(same).reduce((sum, [id, portions]) => {
    if (portions <= 0) return sum;
    const addon = getAddonById(id);
    if (!addon) return sum;
    const multiplier = addon.forStarch
      ? countMealsForStarch(mealLabels, addon.forStarch)
      : mealLabels.length;
    return sum + getAddonUnitPriceCents(addon) * portions * multiplier;
  }, 0);
}

export function computeMealAddonsCents(
  mode: "same" | "custom" | "single",
  mealLabels: string[],
  same?: AddonSelectionMap,
  perMeal?: AddonSelectionMap[]
): number {
  if (mode === "single" || mode === "same") {
    return computeSameModeAddonsCents(mealLabels, same ?? {});
  }

  return (perMeal ?? []).reduce((sum, meal) => sum + selectionMapTotalCents(meal), 0);
}

export function buildAddonsNote(
  mode: "same" | "custom" | "single",
  mealLabels: string[],
  same?: AddonSelectionMap,
  perMeal?: AddonSelectionMap[]
): string | undefined {
  if (mode === "single" || mode === "same") {
    const entries = Object.entries(same ?? {}).filter(([, portions]) => portions > 0);
    const parts = entries
      .map(([id, portions]) => {
        const addon = getAddonById(id);
        if (!addon) return null;
        if (mode === "same" && addon.forStarch) {
          const count = countMealsForStarch(mealLabels, addon.forStarch);
          return `${addon.name} (${count} marmita${count === 1 ? "" : "s"})`;
        }
        return formatAddonSelectionLine(id, portions);
      })
      .filter((line): line is string => Boolean(line));
    if (parts.length === 0) return undefined;
    const sameText = parts.join(", ");
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
