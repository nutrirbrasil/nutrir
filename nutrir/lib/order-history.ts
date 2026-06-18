import {
  formatCpfDisplay,
  formatPhoneDisplay,
  normalizePhoneStorage,
} from "./br-fields";
import type { OrderItem, PaymentMethod } from "./types";

export interface SavedOrder {
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

const STORAGE_KEY = "nutrir-order-history";
const MAX_ORDERS = 20;

function normalizePhone(phone: string): string {
  return normalizePhoneStorage(phone);
}

function loadAll(): SavedOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedOrder[]) : [];
  } catch {
    return [];
  }
}

function saveAll(orders: SavedOrder[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders.slice(0, MAX_ORDERS)));
}

export function saveOrderToHistory(order: SavedOrder): void {
  const all = loadAll();
  saveAll([order, ...all.filter((o) => o.id !== order.id)]);
}

export function getRecentOrdersForPhone(phone: string, limit = 2): SavedOrder[] {
  const key = normalizePhone(phone);
  if (!key) return [];
  return loadAll()
    .filter((o) => normalizePhone(o.customer_phone) === key)
    .slice(0, limit);
}

export async function fetchRecentOrdersForPhone(
  phone: string,
  limit = 2
): Promise<SavedOrder[]> {
  const local = getRecentOrdersForPhone(phone, limit);
  if (typeof window === "undefined") return local;

  try {
    const params = new URLSearchParams({
      phone,
      limit: String(limit),
    });
    const res = await fetch(`/api/nutrir/customers/orders?${params}`);
    if (!res.ok) return local;
    const data = (await res.json()) as { orders: SavedOrder[] };
    if (data.orders?.length) {
      saveAll([...data.orders, ...loadAll()].slice(0, MAX_ORDERS));
      return data.orders;
    }
  } catch {
    /* fallback local */
  }

  return local;
}

export async function syncCustomerToServer(input: {
  phone: string;
  whatsapp?: string;
  name?: string;
  email?: string;
  cpf?: string;
  address?: string;
}): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const res = await fetch("/api/nutrir/customers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        whatsapp: input.whatsapp ?? input.phone,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchCustomerByPhone(phone: string): Promise<{
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  cpf: string;
  address: string;
} | null> {
  if (!phone.trim()) return null;

  try {
    const params = new URLSearchParams({ phone });
    const res = await fetch(`/api/nutrir/customers?${params}`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      customer: {
        name: string;
        phone: string;
        whatsapp: string | null;
        email: string | null;
        cpf: string | null;
        address: string | null;
      } | null;
    };
    if (!data.customer) return null;
    const c = data.customer;
    return {
      name: c.name ?? "",
      phone: formatPhoneDisplay(c.phone),
      whatsapp: formatPhoneDisplay(c.whatsapp ?? c.phone),
      email: c.email ?? "",
      cpf: formatCpfDisplay(c.cpf ?? ""),
      address: c.address ?? "",
    };
  } catch {
    return null;
  }
}
