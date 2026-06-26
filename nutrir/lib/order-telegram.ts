import { findOrder, patchOrderCache, saveOrder } from "./order-store";
import { findPacienteByCpf } from "./supabase-db";
import { formatOrderTelegramMessage, sendTelegramMessage } from "./telegram";
import type { Order } from "./types";

export async function sendOrderTelegramNotification(
  order: Order,
  options?: { isPatient?: boolean; pixPending?: boolean }
): Promise<boolean> {
  const isPaymentUpdate = !!order.telegram_notified;

  let isPatient = options?.isPatient;
  if (isPatient === undefined && order.customer_cpf) {
    const paciente = await findPacienteByCpf(order.customer_cpf);
    isPatient = !!paciente;
  }

  const ok = await sendTelegramMessage(
    formatOrderTelegramMessage(order, new Date(order.created_at), {
      ...options,
      isPatient,
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
