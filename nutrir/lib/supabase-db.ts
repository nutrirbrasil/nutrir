import { getSupabaseAdmin } from "./supabase-server";
import {
  formatCpfDisplay,
  formatPhoneDisplay,
  normalizePhoneStorage,
  stripCpfDigits,
} from "./br-fields";
import type { FulfillmentType, Order, OrderItem, PaymentMethod, PaymentStatus } from "./types";

/** Máximo de pedidos guardados por cliente no Supabase. */
export const MAX_ORDERS_PER_CUSTOMER = 5;

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

export interface PacienteRecord {
  id: string;
  nome: string;
  cpf: string;
}

export async function findPacienteByCpf(cpf: string): Promise<PacienteRecord | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const digits = stripCpfDigits(cpf);
  if (digits.length !== 11) return null;

  const { data, error } = await db
    .from("pacientes")
    .select("id, nome, cpf")
    .eq("cpf", digits)
    .maybeSingle();

  if (error) {
    console.error("[Supabase] findPacienteByCpf:", error.message);
    return null;
  }

  return (data as PacienteRecord) ?? null;
}

export interface SavedOrderRecord {
  id: string;
  customer_email: string;
  customer_name: string;
  created_at: string;
  items: OrderItem[];
  total_cents: number;
  payment_method: PaymentMethod;
  pickup_display: string;
  notes?: string;
}

function buildCustomerPatch(input: {
  phone: string;
  whatsapp?: string;
  name?: string;
  email?: string;
  cpf?: string;
  address?: string;
}): {
  phone: string;
  whatsapp: string;
  name?: string;
  email?: string;
  cpf?: string | null;
  address?: string | null;
} {
  const phone = normalizePhone(input.phone);
  const whatsapp = input.whatsapp ? normalizePhone(input.whatsapp) : phone;
  const email = input.email?.trim().toLowerCase();

  return {
    phone,
    whatsapp,
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(email ? { email } : {}),
    ...(input.cpf !== undefined ? { cpf: stripCpfDigits(input.cpf) || null } : {}),
    ...(input.address !== undefined ? { address: input.address.trim() || null } : {}),
  };
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

  const patch = buildCustomerPatch(input);
  if (patch.phone.length < 10) return null;

  const email = input.email?.trim().toLowerCase();
  if (email) {
    const existing = await getCustomerByEmail(email);
    if (existing) {
      const { data, error } = await db
        .from("nutrir_customers")
        .update(patch)
        .eq("id", existing.id)
        .select("id, phone, whatsapp, name, email, cpf, address")
        .single();

      if (error) {
        console.error("[Supabase] upsertCustomer (email):", error.message);
        return null;
      }
      return data as CustomerRecord;
    }
  }

  const byPhone = await getCustomerByPhone(patch.phone);
  if (byPhone) {
    const { data, error } = await db
      .from("nutrir_customers")
      .update(patch)
      .eq("id", byPhone.id)
      .select("id, phone, whatsapp, name, email, cpf, address")
      .single();

    if (error) {
      console.error("[Supabase] upsertCustomer (phone):", error.message);
      return null;
    }
    return data as CustomerRecord;
  }

  const { data, error } = await db
    .from("nutrir_customers")
    .insert({
      ...patch,
      name: patch.name ?? "",
    })
    .select("id, phone, whatsapp, name, email, cpf, address")
    .single();

  if (error) {
    console.error("[Supabase] upsertCustomer (insert):", error.message);
    return null;
  }

  return data as CustomerRecord;
}

export async function getCustomerByEmail(email: string): Promise<CustomerRecord | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const key = email.trim().toLowerCase();
  if (!key) return null;

  const { data, error } = await db
    .from("nutrir_customers")
    .select("id, phone, whatsapp, name, email, cpf, address")
    .ilike("email", key)
    .maybeSingle();

  if (error) {
    console.error("[Supabase] getCustomerByEmail:", error.message);
    return null;
  }

  return (data as CustomerRecord) ?? null;
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

/** Remove pedidos além do limite por cliente (fallback se a migration ainda não rodou). */
async function trimCustomerOrdersInSupabase(
  customerId: string,
  keep = MAX_ORDERS_PER_CUSTOMER
): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;

  const { data, error } = await db
    .from("nutrir_orders")
    .select("order_nsu")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .order("order_nsu", { ascending: false });

  if (error || !data || data.length <= keep) return;

  const toDelete = data.slice(keep).map((row) => row.order_nsu);
  const { error: deleteError } = await db
    .from("nutrir_orders")
    .delete()
    .in("order_nsu", toDelete);

  if (deleteError) {
    console.error("[Supabase] trimOrders:", deleteError.message);
  }
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
      fulfillment_type: order.fulfillment_type ?? "pickup",
      delivery_bairro: order.delivery_bairro ?? null,
      delivery_municipio: order.delivery_municipio ?? null,
      delivery_fee_cents: order.delivery_fee_cents ?? 0,
      delivery_street: order.delivery_street ?? null,
      delivery_number: order.delivery_number ?? null,
      delivery_complement: order.delivery_complement ?? null,
      delivery_reference: order.delivery_reference ?? null,
    },
    { onConflict: "order_nsu" }
  );

  if (error) {
    console.error("[Supabase] saveOrder:", error.message);
    return false;
  }

  await trimCustomerOrdersInSupabase(customer.id);

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

export async function getRecentOrdersByEmail(
  email: string,
  limit = MAX_ORDERS_PER_CUSTOMER
): Promise<SavedOrderRecord[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const customer = await getCustomerByEmail(email);
  if (!customer) return [];

  const { data, error } = await db
    .from("nutrir_orders")
    .select(
      "order_nsu, customer_name, created_at, items, total_cents, payment_method, pickup_display, user_notes"
    )
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Supabase] getRecentOrders:", error.message);
    return [];
  }

  const customerEmail = customer.email?.trim().toLowerCase() ?? email.trim().toLowerCase();

  return (data ?? []).map((row) => ({
    id: row.order_nsu as string,
    customer_email: customerEmail,
    customer_name: row.customer_name as string,
    created_at: row.created_at as string,
    items: row.items as OrderItem[],
    total_cents: row.total_cents as number,
    payment_method: row.payment_method as PaymentMethod,
    pickup_display: (row.pickup_display as string) ?? "",
    notes: (row.user_notes as string) ?? undefined,
  }));
}

export async function getOrderByNsuFromSupabase(orderNsu: string): Promise<Order | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("nutrir_orders")
    .select(
      "order_nsu, customer_name, customer_phone, delivery_address, delivery_date, pickup_display, payment_method, payment_status, user_notes, items, total_cents, status, created_at, fulfillment_type, delivery_bairro, delivery_municipio, delivery_fee_cents, delivery_street, delivery_number, delivery_complement, delivery_reference"
    )
    .eq("order_nsu", orderNsu)
    .maybeSingle();

  if (error) {
    console.error("[Supabase] getOrderByNsu:", error.message);
    return null;
  }

  if (!data) return null;

  return {
    id: data.order_nsu as string,
    customer_name: data.customer_name as string,
    customer_phone: data.customer_phone as string,
    delivery_address: data.delivery_address as string,
    delivery_date: data.delivery_date as string,
    pickup_display: (data.pickup_display as string) ?? undefined,
    payment_method: (data.payment_method as PaymentMethod) ?? "pix",
    payment_status: (data.payment_status as PaymentStatus) ?? "pending",
    user_notes: (data.user_notes as string) ?? undefined,
    items: data.items as OrderItem[],
    total_cents: data.total_cents as number,
    status: (data.status as string) ?? "pending",
    created_at: data.created_at as string,
    fulfillment_type: (data.fulfillment_type as FulfillmentType) ?? "pickup",
    delivery_bairro: (data.delivery_bairro as string) ?? undefined,
    delivery_municipio: (data.delivery_municipio as string) ?? undefined,
    delivery_fee_cents: (data.delivery_fee_cents as number) ?? 0,
    delivery_street: (data.delivery_street as string) ?? undefined,
    delivery_number: (data.delivery_number as string) ?? undefined,
    delivery_complement: (data.delivery_complement as string) ?? undefined,
    delivery_reference: (data.delivery_reference as string) ?? undefined,
  };
}
