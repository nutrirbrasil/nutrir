import { getSupabaseAdmin } from "./supabase-server";
import {
  formatCpfDisplay,
  formatPhoneDisplay,
  normalizePhoneStorage,
  stripCpfDigits,
} from "./br-fields";
import type { Order, OrderItem, PaymentMethod, PaymentStatus } from "./types";

export function normalizePhone(phone: string): string {
  return normalizePhoneStorage(phone);
}

export interface CustomerRecord {
  id: string;
  phone: string;
  whatsapp: string | null;
  name: string;
  email: string | null;
  cpf: string | null;
  address: string | null;
}

export interface SavedOrderRecord {
  id: string;
  customer_phone: string;
  customer_name: string;
  created_at: string;
  items: OrderItem[];
  total_cents: number;
  payment_method: PaymentMethod;
  pickup_display: string;
  notes?: string;
}

export async function upsertCustomer(input: {
  phone: string;
  whatsapp?: string;
  name?: string;
  email?: string;
  cpf?: string;
  address?: string;
}): Promise<CustomerRecord | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const phone = normalizePhone(input.phone);
  if (phone.length < 10) return null;

  const whatsapp = input.whatsapp ? normalizePhone(input.whatsapp) : phone;

  const { data, error } = await db
    .from("nutrir_customers")
    .upsert(
      {
        phone,
        whatsapp,
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() || null } : {}),
        ...(input.cpf !== undefined ? { cpf: stripCpfDigits(input.cpf) || null } : {}),
        ...(input.address !== undefined ? { address: input.address.trim() || null } : {}),
      },
      { onConflict: "phone" }
    )
    .select("id, phone, whatsapp, name, email, cpf, address")
    .single();

  if (error) {
    console.error("[Supabase] upsertCustomer:", error.message);
    return null;
  }

  return data as CustomerRecord;
}

export async function getCustomerByPhone(phone: string): Promise<CustomerRecord | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const key = normalizePhone(phone);
  const { data, error } = await db
    .from("nutrir_customers")
    .select("id, phone, whatsapp, name, email, cpf, address")
    .eq("phone", key)
    .maybeSingle();

  if (error) {
    console.error("[Supabase] getCustomerByPhone:", error.message);
    return null;
  }

  return (data as CustomerRecord) ?? null;
}

export async function saveOrderToSupabase(order: Order): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;

  const customer = await upsertCustomer({
    phone: order.customer_phone,
    name: order.customer_name,
    email: order.customer_email,
    cpf: order.customer_cpf,
    address: order.delivery_address,
  });

  if (!customer) return false;

  const { error } = await db.from("nutrir_orders").upsert(
    {
      order_nsu: order.id,
      customer_id: customer.id,
      customer_name: order.customer_name,
      customer_phone: normalizePhone(order.customer_phone),
      delivery_address: order.delivery_address,
      delivery_date: order.delivery_date,
      pickup_display: order.pickup_display ?? null,
      payment_method: order.payment_method ?? "pix",
      payment_status: order.payment_status,
      user_notes: order.user_notes ?? null,
      items: order.items,
      total_cents: order.total_cents,
      status: order.status,
      created_at: order.created_at,
    },
    { onConflict: "order_nsu" }
  );

  if (error) {
    console.error("[Supabase] saveOrder:", error.message);
    return false;
  }

  return true;
}

export async function updateOrderPaymentInSupabase(
  orderNsu: string,
  payment_status: PaymentStatus,
  payment_method?: PaymentMethod
): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;

  const patch: Record<string, string> = { payment_status };
  if (payment_method) patch.payment_method = payment_method;

  const { error } = await db.from("nutrir_orders").update(patch).eq("order_nsu", orderNsu);

  if (error) {
    console.error("[Supabase] updateOrderPayment:", error.message);
    return false;
  }

  return true;
}

export async function getRecentOrdersByPhone(
  phone: string,
  limit = 2
): Promise<SavedOrderRecord[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const customer = await getCustomerByPhone(phone);
  if (!customer) return [];

  const { data, error } = await db
    .from("nutrir_orders")
    .select(
      "order_nsu, customer_name, customer_phone, created_at, items, total_cents, payment_method, pickup_display, user_notes"
    )
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Supabase] getRecentOrders:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.order_nsu as string,
    customer_phone: row.customer_phone as string,
    customer_name: row.customer_name as string,
    created_at: row.created_at as string,
    items: row.items as OrderItem[],
    total_cents: row.total_cents as number,
    payment_method: row.payment_method as PaymentMethod,
    pickup_display: (row.pickup_display as string) ?? "",
    notes: (row.user_notes as string) ?? undefined,
  }));
}
