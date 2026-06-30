import { NextResponse } from "next/server";
import { getRecentOrdersByEmail, MAX_ORDERS_PER_CUSTOMER } from "@/lib/supabase-db";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const email = params.get("email")?.trim().toLowerCase();
  const limit = Math.min(
    Number(params.get("limit") ?? String(MAX_ORDERS_PER_CUSTOMER)) ||
      MAX_ORDERS_PER_CUSTOMER,
    MAX_ORDERS_PER_CUSTOMER
  );

  if (!email) {
    return NextResponse.json({ error: "Informe o e-mail." }, { status: 400 });
  }

  const orders = await getRecentOrdersByEmail(email, limit);
  return NextResponse.json({ orders });
}
