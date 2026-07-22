export async function notifyOrderPaid(
  orderId: string,
  extra?: Partial<import("./types").Order>
): Promise<boolean> {
  const { findOrder, updateOrderPayment } = await import("./order-store");
  const { sendOrderTelegramNotification } = await import("./order-telegram");

  const order = await findOrder(orderId);
  if (!order || order.payment_status === "confirmed") return false;

  const updated = await updateOrderPayment(orderId, "confirmed", extra);
  if (!updated) return false;

  const { creditPartnerPoints } = await import("./partners");
  await creditPartnerPoints(orderId);

  return sendOrderTelegramNotification(updated);
}
