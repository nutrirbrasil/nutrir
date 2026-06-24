import { getOrderByNsuFromSupabase, saveOrderToSupabase, updateOrderPaymentInSupabase } from "./supabase-db";
import type { Order, PaymentStatus } from "./types";

/** Cache de runtime — complementa Supabase (checkout_url, campos InfinitePay). */
const cache = new Map<string, Order>();

function mergeCached(id: string, base: Order): Order {
  const cached = cache.get(id);
  if (!cached) return base;
  return {
    ...base,
    checkout_url: cached.checkout_url ?? base.checkout_url,
    infinitepay_slug: cached.infinitepay_slug ?? base.infinitepay_slug,
    infinitepay_transaction_nsu: cached.infinitepay_transaction_nsu ?? base.infinitepay_transaction_nsu,
    local_pay_deadline: cached.local_pay_deadline ?? base.local_pay_deadline,
    pix_telegram_notified: cached.pix_telegram_notified ?? base.pix_telegram_notified,
    telegram_notified: cached.telegram_notified ?? base.telegram_notified,
  };
}

export async function findOrder(id: string): Promise<Order | undefined> {
  const cached = cache.get(id);
  if (cached) return cached;

  const fromDb = await getOrderByNsuFromSupabase(id);
  if (!fromDb) return undefined;

  const order = mergeCached(id, fromDb);
  cache.set(id, order);
  return order;
}

export async function saveOrder(order: Order): Promise<void> {
  cache.set(order.id, order);
  await saveOrderToSupabase(order);
}

export async function updateOrderPayment(
  id: string,
  payment_status: PaymentStatus,
  extra?: Partial<Order>
): Promise<Order | undefined> {
  const existing = await findOrder(id);
  if (!existing) return undefined;

  const updated: Order = {
    ...existing,
    ...extra,
    payment_status,
  };

  cache.set(id, updated);
  await updateOrderPaymentInSupabase(
    id,
    payment_status,
    extra?.payment_method ?? updated.payment_method
  );

  return updated;
}

export function patchOrderCache(id: string, patch: Partial<Order>): Order | undefined {
  const existing = cache.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch };
  cache.set(id, updated);
  return updated;
}
