export type MealStarchType = "massa" | "arroz" | "batata" | "batata-cogumelo";

export interface MealAddon {
  id: string;
  name: string;
  baseCost: number;
  additionalPrice: number;
  portionLabel: string;
  portionUnit: string;
  portionUnitPlural: string;
  /** Se definido, o adicional só aparece em marmitas com um desses acompanhamentos. */
  forStarch?: MealStarchType[];
  /** Substituições com o mesmo grupo são mutuamente exclusivas (ex.: arroz integral x arroz branco). */
  exclusiveGroup?: string;
  /** Foto do ingrediente (public/addons/*.png), exibida no card do adicional. */
  imageSrc?: string;
}

export const MAX_ADDON_PORTIONS = 10;

export const MEAL_ADDONS: MealAddon[] = [
  {
    id: "add-molho",
    name: "Molho da casa",
    baseCost: 0.06,
    additionalPrice: 1.5,
    portionLabel: "1 pote (20g)",
    portionUnit: "pote",
    portionUnitPlural: "potes",
    imageSrc: "/addons/molho-da-casa.png",
  },
  {
    id: "add-queijo",
    name: "Queijo",
    baseCost: 1.0,
    additionalPrice: 2.5,
    portionLabel: "1 fatia",
    portionUnit: "fatia",
    portionUnitPlural: "fatias",
    imageSrc: "/addons/queijo.png",
  },
  {
    id: "add-ervilha",
    name: "Ervilha",
    baseCost: 0.88,
    additionalPrice: 4.11,
    portionLabel: "1 porção (60g)",
    portionUnit: "porção",
    portionUnitPlural: "porções",
    imageSrc: "/addons/ervilha.png",
  },
  {
    id: "add-lentilha",
    name: "Lentilha",
    baseCost: 0.8,
    additionalPrice: 4.19,
    portionLabel: "1 porção (60g)",
    portionUnit: "porção",
    portionUnitPlural: "porções",
    imageSrc: "/addons/lentilha.png",
  },
  {
    id: "add-grao",
    name: "Grão de Bico",
    baseCost: 0.8,
    additionalPrice: 4.19,
    portionLabel: "1 porção (60g)",
    portionUnit: "porção",
    portionUnitPlural: "porções",
    imageSrc: "/addons/grao-de-bico.png",
  },
  {
    id: "add-azeite",
    name: "Azeite Extravirgem",
    baseCost: 0.4,
    additionalPrice: 2.5,
    portionLabel: "1 porção (10ml)",
    portionUnit: "porção",
    portionUnitPlural: "porções",
    imageSrc: "/addons/azeite.png",
  },
  {
    id: "add-ketchup",
    name: "Ketchup",
    baseCost: 0.1,
    additionalPrice: 2.9,
    portionLabel: "1 pote (20g)",
    portionUnit: "pote",
    portionUnitPlural: "potes",
    imageSrc: "/addons/ketchup.png",
  },
  {
    id: "add-mostarda",
    name: "Mostarda e Mel",
    baseCost: 0.1,
    additionalPrice: 2.9,
    portionLabel: "1 pote (20g)",
    portionUnit: "pote",
    portionUnitPlural: "potes",
    imageSrc: "/addons/mostarda-e-mel.png",
  },
  {
    id: "add-massa-sem-gluten",
    name: "Massa Sem Glúten",
    baseCost: 0,
    additionalPrice: 2.99,
    portionLabel: "Desejo substituir Massa por Massa sem Glúten",
    portionUnit: "porção",
    portionUnitPlural: "porções",
    forStarch: ["massa"],
    imageSrc: "/addons/sem-gluten.png",
  },
  {
    id: "add-arroz-integral",
    name: "Arroz Integral",
    baseCost: 0,
    additionalPrice: 0.99,
    portionLabel: "Desejo substituir Arroz de Brócolis por Arroz Integral",
    portionUnit: "porção",
    portionUnitPlural: "porções",
    forStarch: ["arroz"],
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
    forStarch: ["arroz"],
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
    forStarch: ["batata", "batata-cogumelo"],
  },
  {
    id: "add-leite-vegetal",
    name: "Leite Vegetal",
    baseCost: 0.1,
    additionalPrice: 2.9,
    portionLabel: "Desejo substituir Leite Zero Lactose por Leite Vegetal",
    portionUnit: "porção",
    portionUnitPlural: "porções",
    forStarch: ["batata", "batata-cogumelo"],
    imageSrc: "/addons/sem-lactose.png",
  },
  {
    id: "add-remover-queijo",
    name: "Remover Queijo",
    baseCost: 0,
    additionalPrice: 0,
    portionLabel: "Sou intolerante a lactose e desejo remover a finalização com queijo",
    portionUnit: "porção",
    portionUnitPlural: "porções",
    forStarch: ["batata"],
    imageSrc: "/addons/sem-lactose.png",
  },
  {
    id: "add-queijo-cogumelo",
    name: "Queijo",
    baseCost: 0,
    additionalPrice: 0.99,
    portionLabel: "Desejo substituir Mix de Sementes por Queijo (contém lactose)",
    portionUnit: "porção",
    portionUnitPlural: "porções",
    forStarch: ["batata-cogumelo"],
    imageSrc: "/addons/queijo.png",
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

/**
 * Detecta massa, arroz, batata (escondidinho de frango/carne) ou batata de
 * cogumelo (escondidinho de cogumelos, purê finalizado com mix de sementes em
 * vez de queijo) a partir do rótulo da marmita ou do item_id.
 */
export function getMealStarchType(hint: string): MealStarchType | undefined {
  const lower = hint.toLowerCase();
  if (lower.includes("cogu")) {
    return "batata-cogumelo";
  }
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
  return MEAL_ADDONS.filter((addon) => !addon.forStarch || (starch && addon.forStarch.includes(starch)));
}

export function getAddonsForMealHint(hint: string): MealAddon[] {
  return getAddonsForStarch(getMealStarchType(hint));
}

/**
 * Adicionais no modo "mesmo em todas". Substituições (forStarch) aparecem se pelo menos
 * uma marmita do combo tiver um dos acompanhamentos daquele adicional — o preço final
 * considera só as marmitas realmente compatíveis (ver computeSameModeAddonsCents), não
 * o total do combo.
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
  return MEAL_ADDONS.filter(
    (addon) => !addon.forStarch || addon.forStarch.some((s) => starchTypesPresent.has(s))
  );
}

/** Quantas marmitas da lista têm o acompanhamento indicado. */
export function countMealsForStarch(mealLabels: string[], starch: MealStarchType): number {
  return mealLabels.filter((label) => getMealStarchType(label) === starch).length;
}

/** Quantas marmitas da lista têm QUALQUER UM dos acompanhamentos indicados (sem contar duas vezes). */
function countMealsForAnyStarch(mealLabels: string[], starches: MealStarchType[]): number {
  return mealLabels.filter((label) => {
    const type = getMealStarchType(label);
    return type ? starches.includes(type) : false;
  }).length;
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
 * combo, mas substituições (forStarch) valem só nas marmitas com um dos acompanhamentos
 * do adicional (ex.: 3 marmitas de arroz selecionando Arroz Integral cobra 3x, não o
 * total do combo; uma marmita de cogumelos junto com escondidinhos de frango não conta
 * pra "Remover Queijo", já que cogumelos não leva queijo).
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
      ? countMealsForAnyStarch(mealLabels, addon.forStarch)
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
          const count = countMealsForAnyStarch(mealLabels, addon.forStarch);
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
