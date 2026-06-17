import { NextResponse } from "next/server";
import { formatOrderTelegramMessage, sendTelegramMessage } from "@/lib/telegram";
import type { CreateOrderPayload, Order } from "@/lib/types";

const orders: Order[] = [];

function validate(body: CreateOrderPayload): string | null {
  if (!body.customer_name?.trim() || body.customer_name.trim().length < 2) {
    return "Informe seu nome.";
  }
  if (!body.customer_phone?.trim() || body.customer_phone.trim().length < 8) {
    return "Informe um telefone válido.";
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

export async function GET() {
  return NextResponse.json({ orders });
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
  const order: Order = {
    ...body,
    id: `order-${Date.now()}`,
    status: "pending",
    payment_method: body.payment_method ?? "pix",
    payment_status: "pending",
    total_cents,
    created_at,
  };

  orders.push(order);

  const message = formatOrderTelegramMessage(order, new Date(created_at));
  const notified = await sendTelegramMessage(message);

  return NextResponse.json({ order, notified });
}
