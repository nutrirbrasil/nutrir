import { NextResponse } from "next/server";
import { checkInfinitePayPayment } from "@/lib/infinitepay";
import { notifyOrderPaid } from "@/lib/payments";
import { findOrder } from "@/lib/order-store";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const order = findOrder(params.id);
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  if (order.payment_status === "pending" && order.checkout_url) {
    const check = await checkInfinitePayPayment({
      orderNsu: order.id,
      transactionNsu: order.infinitepay_transaction_nsu,
      slug: order.infinitepay_slug,
    });
    if (check.paid) {
      await notifyOrderPaid(order.id, {
        infinitepay_capture_method: check.captureMethod,
      });
    }
  }

  return NextResponse.json({ order: findOrder(params.id) ?? order });
}
