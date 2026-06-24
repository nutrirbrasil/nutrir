import { findOrder, patchOrderCache, saveOrder } from "./order-store";
import { formatOrderTelegramMessage, sendTelegramMessage } from "./telegram";
import type { Order } from "./types";

export async function sendOrderTelegramNotification(
  order: Order,
  options?: { isPatient?: boolean; pixPending?: boolean }
): Promise<boolean> {
  const isPaymentUpdate = !!order.telegram_notified;
  const ok = await sendTelegramMessage(
    formatOrderTelegramMessage(order, new Date(order.created_at), {
      ...options,
      isPaymentUpdate,
    })
  );

  if (ok) {
    const latest = (await findOrder(order.id)) ?? order;
    const updated = { ...latest, telegram_notified: true };
    patchOrderCache(order.id, updated);
    await saveOrder(updated);
  }

  return ok;
}
