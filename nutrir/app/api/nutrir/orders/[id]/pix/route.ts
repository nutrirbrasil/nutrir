import { NextResponse } from "next/server";
import { switchOrderPaymentMethod } from "@/lib/order-payment-switch";
import { findOrder } from "@/lib/order-store";
import { buildPixCopiaECola, getPixCity, getPixKey, getPixReceiverName, isPixConfigured } from "@/lib/pix-brcode";
import { notifyPixPendingOrder } from "@/lib/pix-notify";
import { isLocalPayment, isOnlinePixPayment } from "@/lib/payment-utils";

async function resolvePixOrder(orderId: string) {
  let order = await findOrder(orderId);
  if (!order) return null;

  if (!isOnlinePixPayment(order.payment_method)) {
    if (order.payment_status === "confirmed" || !isLocalPayment(order.payment_method)) {
      return { error: "Este pedido não é Pix online." as const };
    }
    order = await switchOrderPaymentMethod(order, "pix");
  }

  return { order };
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const resolved = await resolvePixOrder(params.id);
  if (!resolved) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  const order = resolved.order;

  if (order.payment_status === "confirmed") {
    return NextResponse.json({ error: "Pedido já pago." }, { status: 400 });
  }

  if (!isPixConfigured()) {
    return NextResponse.json(
      { error: "Pix não configurado. Defina PIX_KEY no servidor." },
      { status: 503 }
    );
  }

  const copia_cola = buildPixCopiaECola({
    pixKey: getPixKey(),
    receiverName: getPixReceiverName(),
    city: getPixCity(),
    amountCents: order.total_cents,
    orderId: order.id,
  });

  return NextResponse.json({
    copia_cola,
    amount_cents: order.total_cents,
    receiver_name: getPixReceiverName(),
    order_id: order.id,
  });
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const resolved = await resolvePixOrder(params.id);
  if (!resolved) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  const result = await notifyPixPendingOrder(params.id);
  return NextResponse.json(result);
}
