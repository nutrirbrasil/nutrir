import type { CreateOrderPayload, CustomerAddress, CustomerAddressInput, Order } from "./types";

export interface CreateOrderResponse {
  order: Order;
  notified: boolean;
  checkout_url?: string;
}

const API_PREFIX = "/api";

function resolveUrl(path: string): string {
  return `${API_PREFIX}${path}`;
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(resolveUrl(path), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch {
    throw new Error("Não foi possível enviar o pedido. Tente novamente em instantes.");
  }

  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string; detail?: string };
      message = data.error ?? data.detail ?? message;
    } catch {
      const text = await res.text();
      if (text) message = text;
    }
    throw new Error(message);
  }

  return res.json();
}

export const nutrirApi = {
  /** `token` = session.access_token; só necessário quando o pedido usa points_redeemed_cents. */
  createOrder: (body: CreateOrderPayload, token?: string) =>
    api<CreateOrderResponse>("/nutrir/orders", {
      method: "POST",
      body: JSON.stringify(body),
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
  getOrder: (id: string) => api<{ order: Order }>(`/nutrir/orders/${id}`),
  verifyOrderPayment: (body: { order_id: string; transaction_nsu?: string; slug?: string }) =>
    api<{ order: Order; paid: boolean; notified: boolean }>("/nutrir/orders/verify", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  createCheckoutLink: (order_id: string, payment_method: import("./types").PaymentMethod) =>
    api<{ checkout_url: string }>(`/nutrir/orders/${order_id}/checkout`, {
      method: "POST",
      body: JSON.stringify({ payment_method }),
    }),
  getPixPayment: (order_id: string) =>
    api<{ copia_cola: string; amount_cents: number; receiver_name: string; order_id: string }>(
      `/nutrir/orders/${order_id}/pix`
    ),
  notifyPixPayment: (order_id: string) =>
    api<{ notified: boolean; already?: boolean }>(`/nutrir/orders/${order_id}/pix`, {
      method: "POST",
    }),
  listAddresses: (token: string) =>
    api<{ addresses: CustomerAddress[] }>("/nutrir/addresses", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  createAddress: (body: CustomerAddressInput, token: string) =>
    api<{ address: CustomerAddress }>("/nutrir/addresses", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateAddress: (id: string, body: Partial<CustomerAddressInput>, token: string) =>
    api<{ address: CustomerAddress }>(`/nutrir/addresses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` },
    }),
  deleteAddress: (id: string, token: string) =>
    api<{ ok: boolean }>(`/nutrir/addresses/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export { PAYMENT_METHOD_SHORT_LABELS } from "./payment-labels";
