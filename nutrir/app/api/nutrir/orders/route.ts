import { NextResponse } from "next/server";
import { isValidCouponCode } from "@/lib/coupons";
import { createInfinitePayLink, isInfinitePayConfigured } from "@/lib/infinitepay";
import { isValidPhoneBR } from "@/lib/br-fields";
import { computeOrderPricing, getChargedItems } from "@/lib/order-pricing";
import {
  calcLocalPaymentDeadline,
  isLocalPayment,
  isOnlinePayment,
  normalizePaymentMethod,
} from "@/lib/payment-utils";
import { findOrder, saveOrder, updateOrderPayment } from "@/lib/order-store";
import { findPacienteByCpf } from "@/lib/supabase-db";
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
  if (body.coupon_code?.trim() && !isValidCouponCode(body.coupon_code)) {
    return "Cupom inválido.";
  }
  return null;
}

async function notifyTelegram(order: Order): Promise<boolean> {
  const paciente = order.customer_cpf
    ? await findPacienteByCpf(order.customer_cpf)
    : null;
  return sendTelegramMessage(
    formatOrderTelegramMessage(order, new Date(order.created_at), {
      isPatient: !!paciente,
    })
  );
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

  const payment_method = normalizePaymentMethod(body.payment_method);
  const chargedItems = getChargedItems(body.items, payment_method);
  const pricing = computeOrderPricing(body.items, payment_method, body.coupon_code);
  const created_at = new Date().toISOString();

  const order: Order = {
    ...body,
    items: chargedItems,
    id: `order-${Date.now()}`,
    status: "pending",
    payment_method,
    payment_status: "pending",
    total_cents: pricing.total_cents,
    coupon_discount_cents: pricing.coupon_discount_cents || undefined,
    created_at,
  };

  if (isLocalPayment(payment_method)) {
    order.local_pay_deadline = calcLocalPaymentDeadline(new Date(created_at));
  }

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
      amountCents: order.total_cents,
      items: order.items,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      paymentMethod: payment_method,
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

  await saveOrder(order);

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

  const order = await findOrder(body.order_id);
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  const updated = await updateOrderPayment(body.order_id, body.payment_status);
  if (!updated) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  const notified =
    body.payment_status === "confirmed" ? await notifyTelegram(updated) : false;

  return NextResponse.json({ order: updated, notified });
}
