import type { OrderItem } from "./types";

/** Combos/kits com mais de 14 marmitas precisam de 1 dia a mais de antecedência (48h em vez de 24h). */
const BIG_COMBO_MEAL_THRESHOLD = 14;

/**
 * Dias extras de antecedência exigidos pela sacola, além do mínimo padrão de
 * 24h. Hoje só existe o caso de combos/kits grandes (mais de 14 marmitas),
 * que exigem 48h. Recalculado sempre a partir dos itens, nunca confiado do
 * cliente.
 */
export function getRequiredLeadDays(items: OrderItem[]): number {
  const hasBigCombo = items.some(
    (item) =>
      (item.section_id === "kit" || item.section_id === "combo") &&
      (item.meal_count ?? 0) > BIG_COMBO_MEAL_THRESHOLD
  );
  return hasBigCombo ? 1 : 0;
}
