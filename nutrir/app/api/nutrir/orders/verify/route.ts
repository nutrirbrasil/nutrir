import { NextResponse } from "next/server";
import { checkInfinitePayPayment } from "@/lib/infinitepay";
import { notifyOrderPaid } from "@/lib/payments";
import { findOrder } from "@/lib/order-store";

export async function POST(request: Request) {
  let body: { order_id: string; transaction_nsu?: string; slug?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const order = await findOrder(body.order_id);
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  if (order.payment_status === "confirmed") {
    return NextResponse.json({ order, paid: true, notified: false });
  }

  const check = await checkInfinitePayPayment({
    orderNsu: body.order_id,
    transactionNsu: body.transaction_nsu ?? order.infinitepay_transaction_nsu,
    slug: body.slug ?? order.infinitepay_slug,
  });

  if (check.paid) {
    const notified = await notifyOrderPaid(body.order_id, {
      infinitepay_transaction_nsu: body.transaction_nsu ?? order.infinitepay_transaction_nsu,
      infinitepay_slug: body.slug ?? order.infinitepay_slug,
    });
    const updated = await findOrder(body.order_id);
    return NextResponse.json({ order: updated, paid: true, notified });
  }

  return NextResponse.json({ order, paid: false, notified: false });
}
