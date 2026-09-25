import type { OrderItem } from "./types";
import type { StockRow } from "./stock-db";
import { STOCK_CATALOG, quantityFor, type StockCatalogItem } from "./stock-catalog";
import { getMarmitaCartSectionId, findMarmitaOptionById, type MarmitaSize } from "./menu-data";

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
 * tamanho, ou outro item da mesma linha (frango/carne/vegetariano), sempre só
 * o que realmente sobra de estoque, descontando o que outras linhas da
 * própria sacola já estão usando (senão sugere um item que "tem estoque" mas
 * que já foi todo reservado por outro item igual que já está na sacola).
 *
 * Sempre tenta devolver pelo menos uma opção: se não sobrar nada na mesma
 * linha/tamanho, amplia pra qualquer item do mesmo tipo (kind) no mesmo
 * tamanho, e como último recurso qualquer item do mesmo tipo em outro
 * tamanho.
 */
export function getSubstituteOptions(
  item: OrderItem,
  stock: StockRow[],
  cartItems: OrderItem[],
  itemIndex: number
): SubstituteOption[] {
  if (!item.item_id) return [];
  const catalogItem = STOCK_CATALOG.find((c) => c.itemId === item.item_id);
  if (!catalogItem) return [];

  const isMarmita = catalogItem.kind === "marmita";
  const section = isMarmita ? getMarmitaCartSectionId(item.item_id) : null;

  function claimedByOtherLines(candidateItemId: string, size: string): number {
    return cartItems.reduce((sum, cartItem, index) => {
      if (index === itemIndex) return sum; // a própria linha que está sendo substituída não conta
      if (cartItem.item_id === candidateItemId && cartItem.size === size) return sum + cartItem.quantity;
      return sum;
    }, 0);
  }

  function buildResults(candidates: StockCatalogItem[], sizeFilter?: string): SubstituteOption[] {
    const results: SubstituteOption[] = [];
    for (const candidate of candidates) {
      for (const sizeOption of candidate.sizes) {
        if (sizeFilter && sizeOption.size !== sizeFilter) continue;
        if (candidate.itemId === item.item_id && sizeOption.size === item.size) continue;
        const raw = quantityFor(stock, candidate.itemId, sizeOption.size);
        const available = raw - claimedByOtherLines(candidate.itemId, sizeOption.size);
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

  const sameLineCandidates = STOCK_CATALOG.filter((c) => {
    if (c.kind !== catalogItem.kind) return false;
    if (c.itemId === catalogItem.itemId) return true;
    return isMarmita && section ? getMarmitaCartSectionId(c.itemId) === section : false;
  });
  const sameLineResults = buildResults(sameLineCandidates);
  if (sameLineResults.length > 0) return sameLineResults;

  const sameKindCandidates = STOCK_CATALOG.filter((c) => c.kind === catalogItem.kind);

  const sameSizeResults = item.size ? buildResults(sameKindCandidates, item.size) : [];
  if (sameSizeResults.length > 0) return sameSizeResults;

  return buildResults(sameKindCandidates);
}
