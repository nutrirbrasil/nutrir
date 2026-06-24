import { findPacienteByCpf } from "./supabase-db";
import { findOrder, patchOrderCache, saveOrder } from "./order-store";
import { sendOrderTelegramNotification } from "./order-telegram";

const notifiedOrderIds = new Set<string>();

export async function notifyPixPendingOrder(
  orderId: string
): Promise<{ notified: boolean; already?: boolean }> {
  const order = await findOrder(orderId);
  if (!order) return { notified: false };
  if (order.payment_method !== "pix" || order.payment_status === "confirmed") {
    return { notified: false };
  }
  if (notifiedOrderIds.has(orderId) || order.pix_telegram_notified) {
    return { notified: false, already: true };
  }

  const paciente = order.customer_cpf
    ? await findPacienteByCpf(order.customer_cpf)
    : null;

  const ok = await sendOrderTelegramNotification(order, {
    isPatient: !!paciente,
    pixPending: true,
  });

  if (ok) {
    notifiedOrderIds.add(orderId);
    const latest = (await findOrder(orderId)) ?? order;
    const updated = { ...latest, pix_telegram_notified: true };
    patchOrderCache(orderId, updated);
    await saveOrder(updated);
  }

  return { notified: ok };
}
