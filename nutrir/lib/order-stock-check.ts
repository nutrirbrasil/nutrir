import type { OrderItem } from "./types";
import type { StockRow } from "./stock-db";
import { STOCK_CATALOG, quantityFor } from "./stock-catalog";

export interface UnavailableCartItem {
  index: number;
  item: OrderItem;
  /** Quantidade real em estoque agora (0 quando o item nem existe no catálogo de estoque, ex.: kits/combos). */
  available: number;
}

/** Combos/kits com mais de 14 marmitas precisam de 1 dia a mais de antecedência (48h em vez de 24h). */
const BIG_COMBO_MEAL_THRESHOLD = 14;

/**
 * Dias extras de antecedência exigidos pela sacola, além do mínimo padrão de
 * 24h. Hoje só existe o caso de combos/kits grandes (mais de 14 marmitas),
 * que exigem 48h. Recalculado sempre a partir dos itens, nunca confiado do
 * cliente (mesmo padrão usado pro estoque).
 */
export function getRequiredLeadDays(items: OrderItem[]): number {
  const hasBigCombo = items.some(
    (item) =>
      (item.section_id === "kit" || item.section_id === "combo") &&
      (item.meal_count ?? 0) > BIG_COMBO_MEAL_THRESHOLD
  );
  return hasBigCombo ? 1 : 0;
}

/**
 * Confere se a sacola inteira cabe no estoque de hoje — usado só pra decidir
 * se "hoje" pode ser oferecido no agendamento de retirada/entrega. Kits,
 * combos e qualquer item sem correspondência no catálogo de estoque contam
 * como indisponíveis por segurança (não tem como confirmar que já estão
 * prontos agora).
 */
export function findUnavailableCartItems(items: OrderItem[], stock: StockRow[]): UnavailableCartItem[] {
  const unavailable: UnavailableCartItem[] = [];

  items.forEach((item, index) => {
    if (!item.item_id || !item.size) {
      unavailable.push({ index, item, available: 0 });
      return;
    }

    const catalogItem = STOCK_CATALOG.find((c) => c.itemId === item.item_id);
    const sizeOption = catalogItem?.sizes.find((s) => s.size === item.size);
    if (!catalogItem || !sizeOption) {
      unavailable.push({ index, item, available: 0 });
      return;
    }

    const available = quantityFor(stock, item.item_id, sizeOption.size);
    if (available < item.quantity) {
      unavailable.push({ index, item, available });
    }
  });

  return unavailable;
}

