import { NextResponse } from "next/server";
import { createInfinitePayLink, isInfinitePayConfigured } from "@/lib/infinitepay";
import { isOnlineCardPayment, normalizePaymentMethod } from "@/lib/payment-utils";
import { findOrder, patchOrderCache, saveOrder } from "@/lib/order-store";
import type { PaymentMethod } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const order = await findOrder(params.id);
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  if (order.payment_status === "confirmed") {
    return NextResponse.json({ error: "Pedido já pago." }, { status: 400 });
  }

  let payment_method: PaymentMethod | undefined;
  try {
    const body = (await request.json()) as { payment_method?: PaymentMethod };
    payment_method = body.payment_method;
  } catch {
    /* optional body */
  }

  const method = normalizePaymentMethod(payment_method ?? order.payment_method);

  if (!isOnlineCardPayment(method)) {
    return NextResponse.json(
      { error: "Checkout InfinitePay disponível apenas para cartão online." },
      { status: 400 }
    );
  }

  if (!isInfinitePayConfigured()) {
    return NextResponse.json(
      { error: "Pagamento com cartão online não configurado." },
      { status: 503 }
    );
  }

  const link = await createInfinitePayLink({
    orderId: order.id,
    totalCents: order.total_cents,
    items: order.items,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone,
  });

  if (!link) {
    return NextResponse.json(
      { error: "Não foi possível abrir o checkout. Tente novamente." },
      { status: 503 }
    );
  }

  const updated = {
    ...order,
    checkout_url: link.url,
    payment_method: method,
  };

  patchOrderCache(order.id, updated);
  await saveOrder(updated);

  return NextResponse.json({ checkout_url: link.url });
}
