import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/session-auth";
import { setStockQuantity } from "@/lib/stock-db";
import type { StockSize } from "@/lib/stock-catalog";

interface PatchBody {
  quantity?: number;
}

function isValidSize(size: string): size is StockSize {
  return size === "P" || size === "G" || size === "UN";
}

export async function PATCH(
  request: Request,
  { params }: { params: { itemId: string; size: string } }
) {
  const isAdmin = await verifyAdminRequest(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!isValidSize(params.size)) {
    return NextResponse.json({ error: "Tamanho inválido." }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  if (typeof body.quantity !== "number" || body.quantity < 0 || !Number.isInteger(body.quantity)) {
    return NextResponse.json({ error: "Quantidade inválida." }, { status: 400 });
  }

  const { ok, error } = await setStockQuantity(params.itemId, params.size, body.quantity);
  if (!ok) {
    return NextResponse.json({ error: error ?? "Não foi possível salvar." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
