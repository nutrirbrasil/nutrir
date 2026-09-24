import { NextResponse } from "next/server";
import { listStock } from "@/lib/stock-db";

// Sem isso o Next cacheia a resposta estaticamente e passa a servir sempre o
// mesmo estoque, mesmo após salvar uma quantidade nova.
export const dynamic = "force-dynamic";

/** Estoque de pronta entrega, público (alimenta /estoque). */
export async function GET() {
  const stock = await listStock();
  return NextResponse.json({ stock });
}
