import { NextResponse } from "next/server";
import { getRecentOrdersByEmail } from "@/lib/supabase-db";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const email = params.get("email")?.trim().toLowerCase();
  const limit = Math.min(Number(params.get("limit") ?? "2") || 2, 10);

  if (!email) {
    return NextResponse.json({ error: "Informe o e-mail." }, { status: 400 });
  }

  const orders = await getRecentOrdersByEmail(email, limit);
  return NextResponse.json({ orders });
}
