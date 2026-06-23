import { NextResponse } from "next/server";
import { canConfirmInfinitePayPayment } from "@/lib/infinitepay-payment-validation";
import { notifyOrderPaid } from "@/lib/payments";
import { findOrder } from "@/lib/order-store";

export async function POST(request: Request) {
  let body: {
    order_nsu?: string;
    transaction_nsu?: string;
    invoice_slug?: string;
    capture_method?: string;
    paid_amount?: number;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const orderId = body.order_nsu?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "Missing order_nsu" }, { status: 400 });
  }

  const order = await findOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.payment_status === "confirmed") {
    return NextResponse.json({ ok: true });
  }

  if (
    !canConfirmInfinitePayPayment(order, {
      capture_method: body.capture_method,
      paid_amount: body.paid_amount,
    })
  ) {
    console.error(
      "[InfinitePay] Pagamento recusado: método ou valor incompatível com o pedido",
      {
        orderId,
        expectedMethod: order.payment_method,
        captureMethod: body.capture_method,
        paidAmount: body.paid_amount,
        orderTotal: order.total_cents,
      }
    );
    return NextResponse.json({ ok: true, ignored: true });
  }

  await notifyOrderPaid(orderId, {
    infinitepay_transaction_nsu: body.transaction_nsu,
    infinitepay_slug: body.invoice_slug,
    infinitepay_capture_method: body.capture_method,
  });

  return NextResponse.json({ ok: true });
}
