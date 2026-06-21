import { getComboCardTotalCents } from "./combo-builder-data";
import { KIT_PRODUCTS, type MarmitaSize } from "./menu-data";
import { isCardPayment, isCashDiscountPayment } from "./payment-utils";
import type { OrderItem, PaymentMethod } from "./types";

/** Marmita avulsa: cartão = +R$ 2,00 acima do pix/dinheiro (ex.: 22,99 → 24,99). */
export const MARMITA_CARD_SURCHARGE_CENTS = 200;

export function getMarmitaCardPriceCents(cashPriceCents: number): number {
  return cashPriceCents + MARMITA_CARD_SURCHARGE_CENTS;
}

export function getItemAddonsCents(item: OrderItem): number {
  return item.addons_cents ?? 0;
}

export function getItemCashTotalCents(item: OrderItem): number {
  return item.price_cents + getItemAddonsCents(item);
}

function isSingleMarmitaItem(item: OrderItem): boolean {
  return (
    !!item.section_id &&
    item.section_id !== "kit" &&
    item.section_id !== "combo"
  );
}

function parseKitMenuId(menuId: string | null | undefined) {
  if (!menuId) return null;
  const base = menuId.split("-addons-")[0] ?? menuId;
  const match = base.match(/^kit-(frango|carne|misto)-(\d+)-(P|G)$/);
  if (!match) return null;
  return {
    kitId: match[1] as "frango" | "carne" | "misto",
    meals: Number(match[2]),
    size: match[3] as MarmitaSize,
  };
}

/** Preço de referência (valor "De" / cartão). */
export function getItemListPriceCents(item: OrderItem): number {
  const addons = getItemAddonsCents(item);

  if (item.section_id === "combo" || item.item_id === "combo-build") {
    return getComboCardTotalCents(item.price_cents) + addons;
  }

  const kit = parseKitMenuId(item.menu_id ?? undefined);
  if (kit) {
    const product = KIT_PRODUCTS.find((p) => p.id === kit.kitId);
    const tier = product?.tiers.find((t) => t.meals === kit.meals);
    const pricing = tier?.prices[kit.size];
    if (pricing) return pricing.card_total_cents + addons;
  }

  if (isSingleMarmitaItem(item)) {
    return getMarmitaCardPriceCents(getItemCashTotalCents(item));
  }

  return getMarmitaCardPriceCents(item.price_cents) + addons;
}

export function getItemChargeCents(item: OrderItem, method?: PaymentMethod): number {
  if (isCardPayment(method)) return getItemListPriceCents(item);
  return getItemCashTotalCents(item);
}

export interface OrderPricing {
  subtotal_cents: number;
  pix_discount_cents: number;
  total_cents: number;
  show_pix_discount: boolean;
}

export function computeOrderPricing(
  items: OrderItem[],
  method?: PaymentMethod
): OrderPricing {
  const listTotal = items.reduce(
    (sum, item) => sum + getItemListPriceCents(item) * item.quantity,
    0
  );
  const cashTotal = items.reduce(
    (sum, item) => sum + getItemCashTotalCents(item) * item.quantity,
    0
  );

  if (isCardPayment(method)) {
    return {
      subtotal_cents: listTotal,
      pix_discount_cents: 0,
      total_cents: listTotal,
      show_pix_discount: false,
    };
  }

  const pixDiscount = Math.max(0, listTotal - cashTotal);

  return {
    subtotal_cents: listTotal,
    pix_discount_cents: pixDiscount,
    total_cents: cashTotal,
    show_pix_discount: isCashDiscountPayment(method) && pixDiscount > 0,
  };
}

export function getChargedItems(items: OrderItem[], method?: PaymentMethod): OrderItem[] {
  return items.map((item) => ({
    ...item,
    price_cents: getItemChargeCents(item, method),
  }));
}
