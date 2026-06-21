import { KIT_PRODUCTS, MENU_SECTIONS, type MarmitaSize } from "./menu-data";
import type { MenuSectionId } from "./types";

export const COMBO_MEAL_MIN = 5;
export const COMBO_MEAL_MAX = 28;

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
  // Regra: a cada marmita no combo, desconto de R$0,15 por marmita.
  // Ex: 5 marmitas => 75 centavos off por marmita; 20 => R$3,00 off por marmita.
  return Math.max(0, Math.floor(targetTotal) * 15);
}

export function getDiscountedUnitPriceCents(option: ComboMarmitaOption, targetTotal: number): number {
  const discount = getComboDiscountPerMealCents(targetTotal);
  const floorCents = (MIN_KIT_PER_MEAL_CENTS[option.size] ?? 0) + 1; // sempre acima do kit
  return Math.max(option.base_price_cents - discount, floorCents);
}

export function getComboMarmitaOptions(): ComboMarmitaOption[] {
  return MENU_SECTIONS.filter((s) => COMBO_SECTIONS.has(s.id as MenuSectionId)).flatMap(
    (section) =>
      section.items.flatMap((item) =>
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
    items: section.items.map((item) => ({
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
  targetTotal: number
): ComboBuildResult {
  const options = getComboMarmitaOptions();
  const errors: string[] = [];
  const lines: ComboLine[] = [];
  const discount_per_meal_cents = getComboDiscountPerMealCents(targetTotal);

  for (const option of options) {
    const quantity = Math.max(0, Math.floor(quantities[option.id] ?? 0));
    if (quantity === 0) continue;
    const unit = getDiscountedUnitPriceCents(option, targetTotal);
    lines.push({
      option,
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
