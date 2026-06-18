import { NextResponse } from "next/server";
import { createInfinitePayLink, isInfinitePayConfigured } from "@/lib/infinitepay";
import { isValidPhoneBR } from "@/lib/br-fields";
import {
  calcLocalPaymentDeadline,
  isLocalPayment,
  isOnlinePayment,
} from "@/lib/payment-utils";
import { saveOrderToSupabase } from "@/lib/supabase-db";
import { findOrder, listOrders, saveOrder, updateOrderPayment } from "@/lib/order-store";
import { formatOrderTelegramMessage, sendTelegramMessage } from "@/lib/telegram";
import type { CreateOrderPayload, Order, PaymentStatus } from "@/lib/types";

function validate(body: CreateOrderPayload): string | null {
  if (!body.customer_name?.trim() || body.customer_name.trim().length < 2) {
    return "Informe seu nome.";
  }
  if (!body.customer_phone?.trim() || !isValidPhoneBR(body.customer_phone)) {
    return "Informe um telefone válido com DDD.";
  }
  if (!body.delivery_address?.trim() || body.delivery_address.trim().length < 5) {
    return "Informe o endereço de retirada.";
  }
  if (!body.delivery_date?.trim()) {
    return "Selecione a data de retirada.";
  }
  if (!body.items?.length) {
    return "O pedido precisa ter pelo menos um item.";
  }
  for (const item of body.items) {
    if (!item.name?.trim()) return "Item inválido no pedido.";
    if (!item.quantity || item.quantity < 1) return "Quantidade inválida no pedido.";
    if (item.price_cents < 0) return "Preço inválido no pedido.";
  }
  return null;
}

async function notifyTelegram(order: Order): Promise<boolean> {
  return sendTelegramMessage(formatOrderTelegramMessage(order, new Date(order.created_at)));
}

export async function GET() {
  return NextResponse.json({ orders: listOrders() });
}

export async function POST(request: Request) {
  let body: CreateOrderPayload;
  try {
    body = (await request.json()) as CreateOrderPayload;
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const validationError = validate(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const total_cents = body.items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
  const created_at = new Date().toISOString();
  const payment_method = body.payment_method ?? "pix";

  const order: Order = {
    ...body,
    id: `order-${Date.now()}`,
    status: "pending",
    payment_method,
    payment_status: "pending",
    total_cents,
    created_at,
  };

  if (isLocalPayment(payment_method)) {
    order.local_pay_deadline = calcLocalPaymentDeadline(new Date(created_at));
  }

  saveOrder(order);

  void saveOrderToSupabase(order);

  let checkout_url: string | undefined;

  if (isOnlinePayment(payment_method)) {
    if (!isInfinitePayConfigured()) {
      return NextResponse.json(
        {
          error: "Pagamento online não configurado. Defina INFINITEPAY_HANDLE e NEXT_PUBLIC_SITE_URL.",
        },
        { status: 503 }
      );
    }

    const link = await createInfinitePayLink({
      orderId: order.id,
      amountCents: total_cents,
      items: order.items,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
    });

    if (!link) {
      return NextResponse.json(
        { error: "Não foi possível abrir o checkout InfinitePay. Tente novamente." },
        { status: 503 }
      );
    }

    order.checkout_url = link.url;
    checkout_url = link.url;
  }

  const notified = isLocalPayment(payment_method) ? await notifyTelegram(order) : false;

  return NextResponse.json({
    order,
    notified,
    checkout_url,
  });
}

export async function PATCH(request: Request) {
  let body: { order_id: string; payment_status: PaymentStatus };
  try {
    body = (await request.json()) as { order_id: string; payment_status: PaymentStatus };
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const order = findOrder(body.order_id);
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  updateOrderPayment(body.order_id, body.payment_status);
  const updated = findOrder(body.order_id)!;
  const notified =
    body.payment_status === "confirmed" ? await notifyTelegram(updated) : false;

  return NextResponse.json({ order: updated, notified });
}
