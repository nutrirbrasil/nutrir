import {
  formatCpfDisplay,
  formatPhoneDisplay,
} from "./br-fields";
import type { OrderItem, PaymentMethod } from "./types";

export interface SavedOrder {
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

export async function fetchRecentOrdersForEmail(
  email: string,
  limit = 5
): Promise<SavedOrder[]> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return [];

  try {
    const params = new URLSearchParams({
      email: normalized,
      limit: String(limit),
    });
    const res = await fetch(`/api/nutrir/customers/orders?${params}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { orders: SavedOrder[] };
    return data.orders ?? [];
  } catch {
    return [];
  }
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

function mapCustomerRecord(c: {
  name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  cpf: string | null;
  address: string | null;
}) {
  return {
    name: c.name ?? "",
    phone: formatPhoneDisplay(c.phone),
    whatsapp: formatPhoneDisplay(c.whatsapp ?? c.phone),
    email: c.email ?? "",
    cpf: formatCpfDisplay(c.cpf ?? ""),
    address: c.address ?? "",
  };
}

export type RemoteCustomer = ReturnType<typeof mapCustomerRecord>;

export async function fetchCustomerByEmail(email: string): Promise<RemoteCustomer | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  try {
    const params = new URLSearchParams({ email: normalized });
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
    return mapCustomerRecord(data.customer);
  } catch {
    return null;
  }
}

export async function fetchCustomerByPhone(phone: string): Promise<RemoteCustomer | null> {
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
    return mapCustomerRecord(data.customer);
  } catch {
    return null;
  }
}
