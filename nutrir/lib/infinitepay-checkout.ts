import type { OrderItem, PaymentMethod } from "./types";

export function buildInfinitePayItems(
  items: OrderItem[]
): { quantity: number; price: number; description: string }[] {
  return items.map((item) => ({
    quantity: item.quantity,
    price: item.price_cents,
    description: item.name.slice(0, 120),
  }));
}

/** Ajusta preços dos itens para que a soma bata com o total (cupom / descontos). */
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

export function buildGatewayItems(
  items: OrderItem[],
  targetTotalCents: number
): { quantity: number; price: number; description: string }[] {
  const adjusted = scaleItemsToTotalCents(items, targetTotalCents);
  return buildInfinitePayItems(adjusted);
}

export function applyPaymentPreferenceToUrl(url: string, paymentMethod?: PaymentMethod): string {
  if (paymentMethod !== "pix" && paymentMethod !== "card") return url;

  const captureValue = paymentMethod === "pix" ? "pix" : "credit_card";

  try {
    const parsed = new URL(url);
    parsed.searchParams.set("capture_method", captureValue);
    parsed.searchParams.set("payment_method", paymentMethod);
    return parsed.toString();
  } catch {
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}capture_method=${captureValue}&payment_method=${paymentMethod}`;
  }
}
