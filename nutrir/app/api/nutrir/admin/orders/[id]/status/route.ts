import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/session-auth";
import { findOrder, updateOrderPayment, updateOrderStatus } from "@/lib/order-store";
import { creditPartnerPoints } from "@/lib/partners";
import { sendOrderTelegramNotification } from "@/lib/order-telegram";
import type { OrderStatus } from "@/lib/types";

const RANK: Record<OrderStatus, number> = { pending: 0, paid: 1, delivered: 2 };

// Mutação "marcar como pago/entregue" — só chega até aqui por trás de
// verifyAdminRequest (sessão do próprio dono do site). É a exceção deliberada
// à regra de "nunca deixar o cliente marcar o próprio pedido como pago" já
// documentada em nutrir/CLAUDE.md: pagamento online continua verificado pelo
// gateway, isso aqui cobre só Pix/local, que hoje não têm confirmação
// automática nenhuma.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const isAdmin = await verifyAdminRequest(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: { status?: string };
  try {
    body = (await request.json()) as { status?: string };
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const nextStatus = body.status as OrderStatus | undefined;
  if (!nextStatus || !(nextStatus in RANK)) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }

  const order = await findOrder(params.id);
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  if (RANK[nextStatus] < RANK[order.status]) {
    return NextResponse.json({ error: "Não é possível voltar o status de um pedido." }, { status: 400 });
  }

  const wasUnpaid = order.payment_status !== "confirmed";
  let updated = order;

  if (nextStatus !== "pending" && wasUnpaid) {
    const paid = await updateOrderPayment(order.id, "confirmed");
    if (paid) updated = paid;
    await creditPartnerPoints(order.id);
  }

  const withStatus = await updateOrderStatus(order.id, nextStatus);
  if (withStatus) updated = withStatus;

  if (wasUnpaid && nextStatus !== "pending") {
    await sendOrderTelegramNotification(updated);
  }

  return NextResponse.json({ order: updated });
}
