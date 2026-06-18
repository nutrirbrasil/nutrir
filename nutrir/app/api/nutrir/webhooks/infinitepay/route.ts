import { NextResponse } from "next/server";
import { notifyOrderPaid } from "@/lib/payments";
import { findOrder } from "@/lib/order-store";

export async function POST(request: Request) {
  let body: {
    order_nsu?: string;
    transaction_nsu?: string;
    invoice_slug?: string;
    capture_method?: string;
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

  const order = findOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 400 });
  }

  if (order.payment_status === "confirmed") {
    return NextResponse.json({ ok: true });
  }

  await notifyOrderPaid(orderId, {
    infinitepay_transaction_nsu: body.transaction_nsu,
    infinitepay_slug: body.invoice_slug,
    infinitepay_capture_method: body.capture_method,
  });

  return NextResponse.json({ ok: true });
}
