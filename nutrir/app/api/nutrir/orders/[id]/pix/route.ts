import { NextResponse } from "next/server";
import { findOrder } from "@/lib/order-store";
import { buildPixCopiaECola, getPixCity, getPixKey, getPixReceiverName, isPixConfigured } from "@/lib/pix-brcode";
import { notifyPixPendingOrder } from "@/lib/pix-notify";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const order = await findOrder(params.id);
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  if (order.payment_method !== "pix") {
    return NextResponse.json({ error: "Este pedido não é Pix online." }, { status: 400 });
  }

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
  const order = await findOrder(params.id);
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  if (order.payment_method !== "pix") {
    return NextResponse.json({ error: "Este pedido não é Pix online." }, { status: 400 });
  }

  const result = await notifyPixPendingOrder(params.id);
  return NextResponse.json(result);
}
