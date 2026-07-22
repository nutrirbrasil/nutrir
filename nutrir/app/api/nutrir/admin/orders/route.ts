import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/session-auth";
import { listOrdersForAdmin } from "@/lib/supabase-db";
import type { OrderStatus } from "@/lib/types";

const VALID_STATUSES: OrderStatus[] = ["pending", "paid", "delivered"];

export async function GET(request: Request) {
  const isAdmin = await verifyAdminRequest(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const statusParam = new URL(request.url).searchParams.get("status");
  const status =
    statusParam && VALID_STATUSES.includes(statusParam as OrderStatus)
      ? (statusParam as OrderStatus)
      : undefined;

  const orders = await listOrdersForAdmin({ status });
  return NextResponse.json({ orders });
}
