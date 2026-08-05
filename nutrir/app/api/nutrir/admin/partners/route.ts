import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/session-auth";
import { listPartners } from "@/lib/partners";

// Sem isso o Next cacheia a resposta estaticamente e novos parceiros nao aparecem ate um rebuild.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const isAdmin = await verifyAdminRequest(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const partners = await listPartners();
  return NextResponse.json({ partners });
}
