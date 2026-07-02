import { NextResponse } from "next/server";
import { checkInfinitePayPayment } from "@/lib/infinitepay";
import { notifyOrderPaid } from "@/lib/payments";
import { findOrder } from "@/lib/order-store";

/**
 * O InfinitePay não assina esse webhook, então o corpo do POST não pode ser
 * uma fonte confiável de "pagamento confirmado" — qualquer pessoa poderia
 * forjar essa chamada. Usamos o body só para saber QUAL pedido checar, e
 * confirmamos de fato consultando a API do InfinitePay (mesmo mecanismo
 * usado em /api/nutrir/orders/verify).
 */
export async function POST(request: Request) {
  let body: {
    order_nsu?: string;
    transaction_nsu?: string;
    invoice_slug?: string;
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

  const check = await checkInfinitePayPayment({
    orderNsu: orderId,
    transactionNsu: body.transaction_nsu ?? order.infinitepay_transaction_nsu,
    slug: body.invoice_slug ?? order.infinitepay_slug,
  });

  if (!check.paid) {
    return NextResponse.json({ ok: true, paid: false });
  }

  await notifyOrderPaid(orderId, {
    infinitepay_transaction_nsu: body.transaction_nsu,
    infinitepay_slug: body.invoice_slug,
  });

  return NextResponse.json({ ok: true, paid: true });
}
