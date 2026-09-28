import { KIT_PRODUCTS, MENU_SECTIONS, type MarmitaSize } from "./menu-data";
import type { MenuSectionId } from "./types";

export const COMBO_MEAL_MIN = 5;
export const COMBO_MEAL_MAX = 60;
/** O desconto progressivo por marmita só cresce até esse tanto de marmitas no combo, marmitas além disso não aumentam mais o desconto. */
export const COMBO_DISCOUNT_PROGRESSIVE_MAX = 28;

/**
 * Códigos liberados manualmente (via WhatsApp) pra desbloquear marmitas
 * personalizadas no combo: em vez de P/G, só aparece uma opção "Personalizado",
 * com sobretaxa fixa por marmita além do preço que seria de tamanho G.
 */
export const COMBO_CUSTOM_CODES: Record<string, { surchargeCents: number }> = {
  "140": { surchargeCents: 120 },
};

export interface ComboMarmitaOption {
  id: string;
  item_id: string;
  name: string;
  displayName: string;
  description: string;
  section_id: MenuSectionId;
  size: MarmitaSize;
  base_price_cents: number;
}

export interface ComboLine {
  option: ComboMarmitaOption;
  quantity: number;
  line_cents: number;
}

export interface ComboBuildResult {
  lines: ComboLine[];
  totalMeals: number;
  total_cents: number;
  per_meal_cents: number;
  isValid: boolean;
  errors: string[];
  remaining: number;
  discount_per_meal_cents: number;
}

const COMBO_SECTIONS = new Set<MenuSectionId>(["frango", "carne", "vegetariano"]);

const SIZES: MarmitaSize[] = ["P", "G"];

function getMinKitPerMealCentsBySize(): Record<MarmitaSize, number> {
  const base: Record<MarmitaSize, number> = { P: Number.POSITIVE_INFINITY, G: Number.POSITIVE_INFINITY };

  for (const product of KIT_PRODUCTS) {
    for (const tier of product.tiers) {
      for (const size of SIZES) {
        const cashPerMeal = tier.prices[size]?.cash_per_meal_cents;
        if (typeof cashPerMeal === "number") base[size] = Math.min(base[size], cashPerMeal);
      }
    }
  }

  return {
    P: Number.isFinite(base.P) ? base.P : 0,
    G: Number.isFinite(base.G) ? base.G : 0,
  };
}

const MIN_KIT_PER_MEAL_CENTS = getMinKitPerMealCentsBySize();

export function getComboDiscountPerMealCents(targetTotal: number): number {
  // Regra: a cada marmita no combo, desconto de R$0,15 por marmita, progressivo
  // só até COMBO_DISCOUNT_PROGRESSIVE_MAX marmitas. Combos maiores que isso mantêm
  // o mesmo desconto por marmita do teto, sem crescer mais.
  const cappedTotal = Math.min(Math.floor(targetTotal), COMBO_DISCOUNT_PROGRESSIVE_MAX);
  return Math.max(0, cappedTotal * 15);
}

export function getDiscountedUnitPriceCents(option: ComboMarmitaOption, targetTotal: number): number {
  const discount = getComboDiscountPerMealCents(targetTotal);
  const floorCents = (MIN_KIT_PER_MEAL_CENTS[option.size] ?? 0) + 1; // sempre acima do kit
  return Math.max(option.base_price_cents - discount, floorCents);
}

export function getComboMarmitaOptions(): ComboMarmitaOption[] {
  return MENU_SECTIONS.filter((s) => COMBO_SECTIONS.has(s.id as MenuSectionId)).flatMap((section) =>
    section.items
      .filter((item) => !item.comingSoon)
      .flatMap((item) =>
        SIZES.map((size) => ({
          id: `${item.id}-${size}`,
          item_id: item.id,
          name: item.name,
          displayName: `${item.name} ${size}`,
          description: item.description,
          section_id: section.id as MenuSectionId,
          size,
          base_price_cents: item.prices[size],
        }))
      )
  );
}

export function getComboCardTotalCents(cashTotalCents: number): number {
  return Math.floor(cashTotalCents * 1.1);
}

export function getComboSectionsWithOptions() {
  const options = getComboMarmitaOptions();
  return MENU_SECTIONS.filter((s) => COMBO_SECTIONS.has(s.id as MenuSectionId)).map((section) => ({
    id: section.id,
    title: section.title,
    items: section.items
      .filter((item) => !item.comingSoon)
      .map((item) => ({
        item_id: item.id,
        name: item.name,
        bySize: {
          P: options.find((o) => o.id === `${item.id}-P`)!,
          G: options.find((o) => o.id === `${item.id}-G`)!,
        },
      })),
  }));
}

export function calculateComboBuild(
  quantities: Record<string, number>,
  targetTotal: number,
  customSurchargeCents = 0
): ComboBuildResult {
  const options = getComboMarmitaOptions();
  const errors: string[] = [];
  const lines: ComboLine[] = [];
  const discount_per_meal_cents = getComboDiscountPerMealCents(targetTotal);
  const isCustom = customSurchargeCents > 0;

  for (const option of options) {
    const quantity = Math.max(0, Math.floor(quantities[option.id] ?? 0));
    if (quantity === 0) continue;
    const unit = getDiscountedUnitPriceCents(option, targetTotal) + customSurchargeCents;
    // No modo personalizado a linha some como "G" na sacola, então troca o
    // rótulo pra deixar claro que é a versão personalizada (com a sobretaxa).
    const lineOption = isCustom ? { ...option, displayName: `${option.name} (Personalizado)` } : option;
    lines.push({
      option: lineOption,
      quantity,
      line_cents: unit * quantity,
    });
  }

  const totalMeals = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total_cents = lines.reduce((sum, line) => sum + line.line_cents, 0);
  const remaining = targetTotal - totalMeals;

  if (targetTotal < COMBO_MEAL_MIN || targetTotal > COMBO_MEAL_MAX) {
    errors.push(`O combo deve ter entre ${COMBO_MEAL_MIN} e ${COMBO_MEAL_MAX} marmitas`);
  }
  if (totalMeals > targetTotal) {
    errors.push(`Você selecionou ${totalMeals} marmitas, mas o combo é de ${targetTotal}`);
  }
  if (totalMeals < targetTotal) {
    errors.push(`Faltam ${remaining} marmita${remaining === 1 ? "" : "s"} para completar o combo`);
  }

  return {
    lines,
    totalMeals,
    total_cents,
    per_meal_cents: totalMeals > 0 ? Math.round(total_cents / totalMeals) : 0,
    isValid: errors.length === 0 && totalMeals === targetTotal,
    errors,
    remaining: Math.max(0, remaining),
    discount_per_meal_cents,
  };
}

export function formatComboSummary(lines: ComboLine[]): string {
  const total = lines.reduce((s, l) => s + l.quantity, 0);
  const parts = lines.map((l) => `${l.option.displayName} ×${l.quantity}`);
  return `${total} marmitas (${parts.join(", ")})`;
}

/** Rótulos individuais por marmita (para adicionais personalizados). */
export function expandComboMealLabels(lines: ComboLine[]): string[] {
  const labels: string[] = [];
  for (const line of lines) {
    for (let i = 0; i < line.quantity; i++) {
      labels.push(
        line.quantity > 1
          ? `${line.option.displayName} (${i + 1}/${line.quantity})`
          : line.option.displayName
      );
    }
  }
  return labels;
}
