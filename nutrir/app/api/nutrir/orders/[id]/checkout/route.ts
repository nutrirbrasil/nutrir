import { NextResponse } from "next/server";
import { createInfinitePayLink, isInfinitePayConfigured } from "@/lib/infinitepay";
import { switchOrderPaymentMethod } from "@/lib/order-payment-switch";
import { findOrder, patchOrderCache, saveOrder } from "@/lib/order-store";
import { isLocalPayment, isOnlineCardPayment, normalizePaymentMethod } from "@/lib/payment-utils";
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

  let orderToCheckout = order;
  if (normalizePaymentMethod(order.payment_method) !== method) {
    if (!isLocalPayment(order.payment_method) && !isOnlineCardPayment(order.payment_method)) {
      return NextResponse.json(
        { error: "Não é possível alterar a forma de pagamento deste pedido." },
        { status: 400 }
      );
    }
    orderToCheckout = await switchOrderPaymentMethod(order, method);
  }

  const link = await createInfinitePayLink({
    orderId: orderToCheckout.id,
    totalCents: orderToCheckout.total_cents,
    items: orderToCheckout.items,
    customerName: orderToCheckout.customer_name,
    customerEmail: orderToCheckout.customer_email,
    customerPhone: orderToCheckout.customer_phone,
  });

  if (!link) {
    return NextResponse.json(
      { error: "Não foi possível abrir o checkout. Tente novamente." },
      { status: 503 }
    );
  }

  const updated = {
    ...orderToCheckout,
    checkout_url: link.url,
    payment_method: method,
  };

  patchOrderCache(orderToCheckout.id, updated);
  await saveOrder(updated);

  return NextResponse.json({ checkout_url: link.url });
}
