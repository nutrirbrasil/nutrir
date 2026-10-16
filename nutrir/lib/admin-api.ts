import type { AdminOrderRow } from "./supabase-db";
import type { PartnerRecord } from "./partners";
import type { OrderStatus } from "./types";

export interface FreteDistanceResult {
  distanceKm: number;
  destination: { label: string; lat: number; lon: number };
  store: { label: string; lat: number; lon: number };
}

const API_PREFIX = "/api/nutrir/admin";

async function adminApi<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_PREFIX}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });
  } catch {
    throw new Error("Não foi possível falar com o servidor. Tente de novo.");
  }

  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      message = data.error ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return res.json();
}

export const adminNutrirApi = {
  listOrders: (token: string, status?: OrderStatus) =>
    adminApi<{ orders: AdminOrderRow[] }>(
      `/orders${status ? `?status=${status}` : ""}`,
      token
    ),
  updateOrderStatus: (token: string, orderId: string, status: OrderStatus) =>
    adminApi<{ order: AdminOrderRow }>(`/orders/${orderId}/status`, token, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  deleteOrder: (token: string, orderId: string) =>
    adminApi<{ ok: boolean }>(`/orders/${orderId}`, token, { method: "DELETE" }),
  calculateFreteDistance: (token: string, address: string) =>
    adminApi<FreteDistanceResult>(`/frete?address=${encodeURIComponent(address)}`, token),
  listPartners: (token: string) => adminApi<{ partners: PartnerRecord[] }>("/partners", token),
};
