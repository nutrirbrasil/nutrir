import { computeCouponDiscountCents, getCoupon, normalizeCouponCode } from "./coupons";
import { getComboCardTotalCents } from "./combo-builder-data";
import { getInfinitePayCardTotalCents } from "./infinitepay-checkout";
import { KIT_PRODUCTS, type MarmitaSize } from "./menu-data";
import { isCardPayment, isCashDiscountPayment, isOnlinePayment } from "./payment-utils";
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
  coupon_code?: string;
  coupon_discount_cents: number;
  total_cents: number;
  show_pix_discount: boolean;
  show_coupon_discount: boolean;
}

export function computeOrderPricing(
  items: OrderItem[],
  method?: PaymentMethod,
  couponCode?: string | null
): OrderPricing {
  const listTotal = items.reduce(
    (sum, item) => sum + getItemListPriceCents(item) * item.quantity,
    0
  );
  const cashTotal = items.reduce(
    (sum, item) => sum + getItemCashTotalCents(item) * item.quantity,
    0
  );

  const coupon = getCoupon(couponCode);
  const couponDiscount = coupon ? computeCouponDiscountCents(listTotal, coupon) : 0;
  const appliedCouponCode = coupon ? normalizeCouponCode(couponCode!) : undefined;

  if (isCardPayment(method)) {
    const total = Math.max(0, listTotal - couponDiscount);
    return {
      subtotal_cents: listTotal,
      pix_discount_cents: 0,
      coupon_code: appliedCouponCode,
      coupon_discount_cents: couponDiscount,
      total_cents: total,
      show_pix_discount: false,
      show_coupon_discount: couponDiscount > 0,
    };
  }

  const pixDiscount = Math.max(0, listTotal - cashTotal);
  const total = Math.max(0, cashTotal - couponDiscount);

  return {
    subtotal_cents: listTotal,
    pix_discount_cents: pixDiscount,
    coupon_code: appliedCouponCode,
    coupon_discount_cents: couponDiscount,
    total_cents: total,
    show_pix_discount: isCashDiscountPayment(method) && pixDiscount > 0,
    show_coupon_discount: couponDiscount > 0,
  };
}

export function getChargedItems(items: OrderItem[], method?: PaymentMethod): OrderItem[] {
  return items.map((item) => ({
    ...item,
    price_cents: getItemChargeCents(item, method),
  }));
}

/** Pedidos online usam preço Pix; o +10% só entra no link InfinitePay. */
export function getOrderPricingMethod(method?: PaymentMethod): PaymentMethod {
  if (isOnlinePayment(method)) return "pix";
  return method ?? "pix";
}

/** Resumo na revisão: referência +10% e total Pix (10% OFF no checkout). */
export function computeOnlineCheckoutDisplayPricing(
  items: OrderItem[],
  couponCode?: string | null
): OrderPricing {
  const pixPricing = computeOrderPricing(items, "pix", couponCode);
  const referenceCardTotal = getInfinitePayCardTotalCents(pixPricing.total_cents);
  const pixDiscount = Math.max(0, referenceCardTotal - pixPricing.total_cents);

  return {
    subtotal_cents: referenceCardTotal,
    pix_discount_cents: pixDiscount,
    coupon_code: pixPricing.coupon_code,
    coupon_discount_cents: pixPricing.coupon_discount_cents,
    total_cents: pixPricing.total_cents,
    show_pix_discount: pixDiscount > 0,
    show_coupon_discount: pixPricing.show_coupon_discount,
  };
}

export function computeCheckoutDisplayPricing(
  items: OrderItem[],
  method?: PaymentMethod,
  couponCode?: string | null
): OrderPricing {
  if (isOnlinePayment(method)) {
    return computeOnlineCheckoutDisplayPricing(items, couponCode);
  }
  return computeOrderPricing(items, method, couponCode);
}

export function getCheckoutLineItemCents(item: OrderItem, method?: PaymentMethod): number {
  if (isOnlinePayment(method)) return getItemCashTotalCents(item);
  return getItemChargeCents(item, method);
}
