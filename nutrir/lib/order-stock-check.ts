import type { OrderItem } from "./types";
import type { StockRow } from "./stock-db";
import { STOCK_CATALOG, quantityFor, type StockCatalogItem } from "./stock-catalog";
import { getMarmitaCartSectionId, findMarmitaOptionById, type MarmitaSize } from "./menu-data";

export interface UnavailableCartItem {
  index: number;
  item: OrderItem;
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
      unavailable.push({ index, item });
      return;
    }

    const catalogItem = STOCK_CATALOG.find((c) => c.itemId === item.item_id);
    const sizeOption = catalogItem?.sizes.find((s) => s.size === item.size);
    if (!catalogItem || !sizeOption) {
      unavailable.push({ index, item });
      return;
    }

    const available = quantityFor(stock, item.item_id, sizeOption.size);
    if (available < item.quantity) {
      unavailable.push({ index, item });
    }
  });

  return unavailable;
}

export interface SubstituteOption {
  itemId: string;
  name: string;
  size: string;
  priceCents: number;
  available: number;
  imageSrc?: string;
}

/** Sucos no catálogo de estoque não levam sobretaxa; só marmitas (pronta entrega = +R$1) precisam do preço "de verdade" do agendado. */
function realCashPriceFor(catalogItem: StockCatalogItem, size: string, cashCents: number): number {
  if (catalogItem.kind !== "marmita") return cashCents;
  const option = findMarmitaOptionById(catalogItem.itemId);
  return option?.prices[size as MarmitaSize] ?? cashCents;
}

/**
 * Sugestões pra trocar um item sem estoque suficiente: o mesmo item noutro
 * tamanho, ou outro item da mesma linha (frango/carne/vegetariano) — sempre
 * só o que realmente tem estoque agora.
 */
export function getSubstituteOptions(item: OrderItem, stock: StockRow[]): SubstituteOption[] {
  if (!item.item_id) return [];
  const catalogItem = STOCK_CATALOG.find((c) => c.itemId === item.item_id);
  if (!catalogItem) return [];

  const isMarmita = catalogItem.kind === "marmita";
  const section = isMarmita ? getMarmitaCartSectionId(item.item_id) : null;

  const candidates = STOCK_CATALOG.filter((c) => {
    if (c.kind !== catalogItem.kind) return false;
    if (c.itemId === catalogItem.itemId) return true;
    return isMarmita && section ? getMarmitaCartSectionId(c.itemId) === section : false;
  });

  const results: SubstituteOption[] = [];
  for (const candidate of candidates) {
    for (const sizeOption of candidate.sizes) {
      if (candidate.itemId === item.item_id && sizeOption.size === item.size) continue;
      const available = quantityFor(stock, candidate.itemId, sizeOption.size);
      if (available <= 0) continue;
      results.push({
        itemId: candidate.itemId,
        name: candidate.name,
        size: sizeOption.size,
        priceCents: realCashPriceFor(candidate, sizeOption.size, sizeOption.cashCents),
        available,
        imageSrc: candidate.imageSrc,
      });
    }
  }

  results.sort((a, b) => (a.itemId === item.item_id ? 0 : 1) - (b.itemId === item.item_id ? 0 : 1));
  return results;
}
