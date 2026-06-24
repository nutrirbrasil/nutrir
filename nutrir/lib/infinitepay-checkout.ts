import type { OrderItem } from "./types";

/** Desconto Pix configurado no painel InfinitePay (Checkout → Configurações). */
export const INFINITEPAY_PIX_DISCOUNT_PERCENT = 10;

export function getInfinitePayCardTotalCents(pixTotalCents: number): number {
  if (pixTotalCents <= 0) return 0;
  const factor = 1 + INFINITEPAY_PIX_DISCOUNT_PERCENT / 100;
  return Math.round(pixTotalCents * factor);
}

export function buildInfinitePayItems(
  items: OrderItem[]
): { quantity: number; price: number; description: string }[] {
  return items.map((item) => ({
    quantity: item.quantity,
    price: item.price_cents,
    description: item.name.slice(0, 120),
  }));
}

/** Ajusta preços dos itens para que a soma bata com o total alvo. */
export function scaleItemsToTotalCents(items: OrderItem[], targetTotalCents: number): OrderItem[] {
  const currentTotal = items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
  if (currentTotal <= 0 || currentTotal === targetTotalCents) return items;

  const factor = targetTotalCents / currentTotal;
  const scaled = items.map((item) => ({
    ...item,
    price_cents: Math.max(1, Math.floor(item.price_cents * factor)),
  }));

  let total = scaled.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
  const diff = targetTotalCents - total;
  if (diff !== 0) {
    const last = scaled[scaled.length - 1];
    if (last) {
      const perUnit = Math.round(diff / last.quantity);
      last.price_cents = Math.max(1, last.price_cents + perUnit);
    }
  }

  return scaled;
}

/**
 * Itens com preço Pix; envia à InfinitePay com +10% no total.
 * Com 10% de desconto Pix no painel, o cliente paga o valor Pix original.
 */
export function buildGatewayItemsFromPixTotal(
  items: OrderItem[],
  pixTotalCents: number
): { quantity: number; price: number; description: string }[] {
  const cardTotalCents = getInfinitePayCardTotalCents(pixTotalCents);
  const adjusted = scaleItemsToTotalCents(items, cardTotalCents);
  return buildInfinitePayItems(adjusted);
}
