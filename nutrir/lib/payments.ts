export async function notifyOrderPaid(
  orderId: string,
  extra?: Partial<import("./types").Order>
): Promise<boolean> {
  const { findOrder, updateOrderPayment } = await import("./order-store");
  const { updateOrderPaymentInSupabase } = await import("./supabase-db");
  const { formatOrderTelegramMessage, sendTelegramMessage } = await import("./telegram");

  const order = findOrder(orderId);
  if (!order || order.payment_status === "confirmed") return false;

  updateOrderPayment(orderId, "confirmed", extra);
  const updated = findOrder(orderId)!;

  void updateOrderPaymentInSupabase(
    orderId,
    "confirmed",
    extra?.payment_method ?? updated.payment_method
  );

  const message = formatOrderTelegramMessage(updated, new Date(updated.created_at));
  return sendTelegramMessage(message);
}
