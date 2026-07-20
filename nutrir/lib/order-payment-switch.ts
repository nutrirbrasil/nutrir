import {
  computeOrderPricing,
  getChargedItems,
  restoreBaseOrderItems,
} from "./order-pricing";
import { saveOrder } from "./order-store";
import {
  isLocalPayment,
  isOnlinePixPayment,
  normalizePaymentMethod,
} from "./payment-utils";
import type { Order, PaymentMethod } from "./types";

export async function switchOrderPaymentMethod(
  order: Order,
  method: PaymentMethod
): Promise<Order> {
  const payment_method = normalizePaymentMethod(method);
  const fromMethod = normalizePaymentMethod(order.payment_method);

  if (order.payment_status === "confirmed") {
    throw new Error("Pedido já pago.");
  }

  if (fromMethod === payment_method) return order;

  const baseItems = restoreBaseOrderItems(order.items, fromMethod);
  const chargedItems = getChargedItems(baseItems, payment_method);
  const pricing = computeOrderPricing(
    baseItems,
    payment_method,
    order.coupon_code,
    order.delivery_fee_cents ?? 0
  );

  const updated: Order = {
    ...order,
    items: chargedItems,
    payment_method,
    total_cents: pricing.total_cents,
    coupon_discount_cents: pricing.coupon_discount_cents || undefined,
    local_pay_deadline: undefined,
    checkout_url: undefined,
    infinitepay_slug: undefined,
    infinitepay_transaction_nsu: undefined,
    pix_telegram_notified: isOnlinePixPayment(payment_method)
      ? false
      : order.pix_telegram_notified,
    telegram_notified: isLocalPayment(fromMethod) ? true : order.telegram_notified,
  };

  await saveOrder(updated);
  return updated;
}
