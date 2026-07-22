import { getSupabaseAdmin } from "./supabase-server";

export interface PartnerRecord {
  id: string;
  name: string;
  coupon_code: string;
  email: string;
  points_balance_cents: number;
}

/** Percentual do total do pedido que vira desconto pro comprador e pontos pro parceiro. */
export const PARTNER_COUPON_PERCENT = 5;

export async function findPartnerByCouponCode(code: string): Promise<PartnerRecord | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  const { data, error } = await db
    .from("nutrir_partners")
    .select("id, name, coupon_code, email, points_balance_cents")
    .eq("coupon_code", normalized)
    .maybeSingle();

  if (error) {
    console.error("[Supabase] findPartnerByCouponCode:", error.message);
    return null;
  }

  return (data as PartnerRecord) ?? null;
}

export async function findPartnerByEmail(email: string): Promise<PartnerRecord | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const { data, error } = await db
    .from("nutrir_partners")
    .select("id, name, coupon_code, email, points_balance_cents")
    .ilike("email", normalized)
    .maybeSingle();

  if (error) {
    console.error("[Supabase] findPartnerByEmail:", error.message);
    return null;
  }

  return (data as PartnerRecord) ?? null;
}

/**
 * Credita 5% do total do pedido em pontos pro parceiro dono do cupom usado,
 * quando o pagamento é confirmado. Idempotente: a constraint única
 * (order_nsu, type) em nutrir_partner_point_transactions garante que um
 * mesmo pedido nunca credite duas vezes, mesmo se chamado mais de uma vez
 * (ex.: "pago" seguido de "entregue", ou uma corrida entre dois gatilhos).
 */
export async function creditPartnerPoints(orderNsu: string): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;

  const { findOrder } = await import("./order-store");
  const order = await findOrder(orderNsu);
  if (!order?.partner_id) return;

  const amount = Math.round((order.total_cents * PARTNER_COUPON_PERCENT) / 100);
  if (amount <= 0) return;

  const { error: insertError } = await db.from("nutrir_partner_point_transactions").insert({
    partner_id: order.partner_id,
    order_nsu: orderNsu,
    amount_cents: amount,
    type: "earn",
  });

  if (insertError) {
    if (insertError.code === "23505") return; // já creditado, no-op
    console.error("[Supabase] creditPartnerPoints (insert):", insertError.message);
    return;
  }

  const { error: rpcError } = await db.rpc("nutrir_increment_partner_balance", {
    p_partner_id: order.partner_id,
    p_amount: amount,
  });

  if (rpcError) {
    console.error("[Supabase] creditPartnerPoints (increment):", rpcError.message);
  }
}

/**
 * Debita pontos do saldo do parceiro ao usá-los como desconto num pedido
 * próprio. `amountCents` já deve vir limitado ao saldo real (ver
 * app/api/nutrir/orders/route.ts) — esta função não valida limite de novo.
 */
export async function redeemPartnerPoints(
  partnerId: string,
  orderNsu: string,
  amountCents: number
): Promise<void> {
  if (amountCents <= 0) return;
  const db = getSupabaseAdmin();
  if (!db) return;

  const { error: insertError } = await db.from("nutrir_partner_point_transactions").insert({
    partner_id: partnerId,
    order_nsu: orderNsu,
    amount_cents: -amountCents,
    type: "redeem",
  });

  if (insertError) {
    console.error("[Supabase] redeemPartnerPoints (insert):", insertError.message);
    return;
  }

  const { error: rpcError } = await db.rpc("nutrir_increment_partner_balance", {
    p_partner_id: partnerId,
    p_amount: -amountCents,
  });

  if (rpcError) {
    console.error("[Supabase] redeemPartnerPoints (decrement):", rpcError.message);
  }
}
