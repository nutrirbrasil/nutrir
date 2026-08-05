import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/session-auth";
import { deleteOrder, findOrder } from "@/lib/order-store";

// Exclusão definitiva (Supabase + cache) — só pra pedidos cancelados ou de
// teste, atrás de verifyAdminRequest. Não tem confirmação de pagamento
// nenhuma aqui, é só limpeza; diferente do PATCH de status, não precisa de
// nenhuma regra de negócio além de "quem manda é o admin".
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const isAdmin = await verifyAdminRequest(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const order = await findOrder(params.id);
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  const ok = await deleteOrder(params.id);
  if (!ok) {
    return NextResponse.json({ error: "Não foi possível excluir o pedido." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
