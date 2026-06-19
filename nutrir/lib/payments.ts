export async function notifyOrderPaid(
  orderId: string,
  extra?: Partial<import("./types").Order>
): Promise<boolean> {
  const { findOrder, updateOrderPayment } = await import("./order-store");
  const { formatOrderTelegramMessage, sendTelegramMessage } = await import("./telegram");

  const order = await findOrder(orderId);
  if (!order || order.payment_status === "confirmed") return false;

  const updated = await updateOrderPayment(orderId, "confirmed", extra);
  if (!updated) return false;

  const message = formatOrderTelegramMessage(updated, new Date(updated.created_at));
  return sendTelegramMessage(message);
}
