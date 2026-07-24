import { getSupabaseAdmin } from "./supabase-server";
import {
  formatCpfDisplay,
  formatPhoneDisplay,
  normalizePhoneStorage,
  stripCpfDigits,
} from "./br-fields";
import type { FulfillmentType, Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus } from "./types";

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
      coupon_code: order.coupon_code ?? null,
      coupon_discount_cents: order.coupon_discount_cents ?? 0,
      partner_id: order.partner_id ?? null,
      points_redeemed_cents: order.points_redeemed_cents ?? 0,
      telegram_notified: order.telegram_notified ?? false,
      pix_telegram_notified: order.pix_telegram_notified ?? false,
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

/** Muda o status de acompanhamento (pending/paid/delivered). Não valida transição — quem chama garante que não retrocede. */
export async function updateOrderStatusInSupabase(
  orderNsu: string,
  status: OrderStatus
): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;

  const { error } = await db.from("nutrir_orders").update({ status }).eq("order_nsu", orderNsu);

  if (error) {
    console.error("[Supabase] updateOrderStatus:", error.message);
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
      "order_nsu, customer_name, customer_phone, delivery_address, delivery_date, pickup_display, payment_method, payment_status, user_notes, items, total_cents, status, created_at, fulfillment_type, delivery_bairro, delivery_municipio, delivery_fee_cents, delivery_street, delivery_number, delivery_complement, delivery_reference, coupon_code, coupon_discount_cents, partner_id, points_redeemed_cents, telegram_notified, pix_telegram_notified"
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
    status: (data.status as OrderStatus) ?? "pending",
    created_at: data.created_at as string,
    fulfillment_type: (data.fulfillment_type as FulfillmentType) ?? "pickup",
    delivery_bairro: (data.delivery_bairro as string) ?? undefined,
    delivery_municipio: (data.delivery_municipio as string) ?? undefined,
    delivery_fee_cents: (data.delivery_fee_cents as number) ?? 0,
    delivery_street: (data.delivery_street as string) ?? undefined,
    delivery_number: (data.delivery_number as string) ?? undefined,
    delivery_complement: (data.delivery_complement as string) ?? undefined,
    delivery_reference: (data.delivery_reference as string) ?? undefined,
    coupon_code: (data.coupon_code as string) ?? undefined,
    coupon_discount_cents: (data.coupon_discount_cents as number) ?? 0,
    partner_id: (data.partner_id as string) ?? undefined,
    points_redeemed_cents: (data.points_redeemed_cents as number) ?? 0,
    telegram_notified: (data.telegram_notified as boolean) ?? false,
    pix_telegram_notified: (data.pix_telegram_notified as boolean) ?? false,
  };
}

export interface AdminOrderRow extends Order {
  partner_name?: string;
  partner_coupon_code?: string;
  is_patient?: boolean;
}

const ADMIN_ORDER_COLUMNS =
  "order_nsu, customer_id, customer_name, customer_phone, delivery_address, delivery_date, pickup_display, payment_method, payment_status, user_notes, items, total_cents, status, created_at, fulfillment_type, delivery_bairro, delivery_municipio, delivery_fee_cents, delivery_street, delivery_number, delivery_complement, delivery_reference, coupon_code, coupon_discount_cents, partner_id, points_redeemed_cents";

/** Lista de pedidos pra tela de admin. Sem escopo por cliente — só a chamar com service-role, atrás de verifyAdminRequest. */
export async function listOrdersForAdmin(opts: {
  status?: OrderStatus;
  limit?: number;
} = {}): Promise<AdminOrderRow[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  let query = db
    .from("nutrir_orders")
    .select(ADMIN_ORDER_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 300);

  if (opts.status) query = query.eq("status", opts.status);

  const { data, error } = await query;
  if (error) {
    console.error("[Supabase] listOrdersForAdmin:", error.message);
    return [];
  }
  if (!data?.length) return [];

  const partnerIds = Array.from(
    new Set(data.map((row) => row.partner_id as string | null).filter((id): id is string => !!id))
  );

  let partnersMap = new Map<string, { name: string; coupon_code: string }>();
  if (partnerIds.length) {
    const { data: partners } = await db
      .from("nutrir_partners")
      .select("id, name, coupon_code")
      .in("id", partnerIds);
    partnersMap = new Map(
      (partners ?? []).map((p) => [
        p.id as string,
        { name: p.name as string, coupon_code: p.coupon_code as string },
      ])
    );
  }

  // Paciente = CPF do cliente (via customer_id) cadastrado na tabela `pacientes`.
  const customerIds = Array.from(
    new Set(data.map((row) => row.customer_id as string | null).filter((id): id is string => !!id))
  );

  const patientCustomerIds = new Set<string>();
  if (customerIds.length) {
    const { data: customers } = await db
      .from("nutrir_customers")
      .select("id, cpf")
      .in("id", customerIds);

    const cpfByCustomerId = new Map<string, string>();
    const cpfs = new Set<string>();
    for (const c of customers ?? []) {
      const cpf = c.cpf as string | null;
      if (cpf) {
        cpfByCustomerId.set(c.id as string, cpf);
        cpfs.add(cpf);
      }
    }

    if (cpfs.size) {
      const { data: pacientes } = await db
        .from("pacientes")
        .select("cpf")
        .in("cpf", Array.from(cpfs));
      const patientCpfs = new Set((pacientes ?? []).map((p) => p.cpf as string));
      cpfByCustomerId.forEach((cpf, customerId) => {
        if (patientCpfs.has(cpf)) patientCustomerIds.add(customerId);
      });
    }
  }

  return data.map((row) => {
    const partner = row.partner_id ? partnersMap.get(row.partner_id as string) : undefined;
    const isPatient = row.customer_id ? patientCustomerIds.has(row.customer_id as string) : false;
    return {
      id: row.order_nsu as string,
      customer_name: row.customer_name as string,
      customer_phone: row.customer_phone as string,
      delivery_address: row.delivery_address as string,
      delivery_date: row.delivery_date as string,
      pickup_display: (row.pickup_display as string) ?? undefined,
      payment_method: (row.payment_method as PaymentMethod) ?? "pix",
      payment_status: (row.payment_status as PaymentStatus) ?? "pending",
      user_notes: (row.user_notes as string) ?? undefined,
      items: row.items as OrderItem[],
      total_cents: row.total_cents as number,
      status: (row.status as OrderStatus) ?? "pending",
      created_at: row.created_at as string,
      fulfillment_type: (row.fulfillment_type as FulfillmentType) ?? "pickup",
      delivery_bairro: (row.delivery_bairro as string) ?? undefined,
      delivery_municipio: (row.delivery_municipio as string) ?? undefined,
      delivery_fee_cents: (row.delivery_fee_cents as number) ?? 0,
      delivery_street: (row.delivery_street as string) ?? undefined,
      delivery_number: (row.delivery_number as string) ?? undefined,
      delivery_complement: (row.delivery_complement as string) ?? undefined,
      delivery_reference: (row.delivery_reference as string) ?? undefined,
      coupon_code: (row.coupon_code as string) ?? undefined,
      coupon_discount_cents: (row.coupon_discount_cents as number) ?? 0,
      partner_id: (row.partner_id as string) ?? undefined,
      points_redeemed_cents: (row.points_redeemed_cents as number) ?? 0,
      partner_name: partner?.name,
      partner_coupon_code: partner?.coupon_code,
      is_patient: isPatient,
    };
  });
}
