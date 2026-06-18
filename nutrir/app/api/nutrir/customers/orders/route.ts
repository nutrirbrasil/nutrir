import { NextResponse } from "next/server";
import { getRecentOrdersByPhone } from "@/lib/supabase-db";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const phone = params.get("phone");
  const limit = Math.min(Number(params.get("limit") ?? "2") || 2, 10);

  if (!phone?.trim()) {
    return NextResponse.json({ error: "Informe o telefone." }, { status: 400 });
  }

  const orders = await getRecentOrdersByPhone(phone, limit);
  return NextResponse.json({ orders });
}
