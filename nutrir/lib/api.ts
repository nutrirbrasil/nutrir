import type { CreateOrderPayload, Order, PaymentStatus } from "./types";

export const PAYMENT_METHOD_LABELS = {
  pix: "Pix online",
  card: "Cartão online",
  local: "Pagamento no local",
} as const;

export interface CreateOrderResponse {
  order: Order;
  notified: boolean;
  checkout_url?: string;
}

const API_URL = process.env.NEXT_PUBLIC_NUTRIR_API_URL?.replace(/\/$/, "") ?? "";

function resolveUrl(path: string): string {
  return API_URL ? `${API_URL}${path}` : `/api${path}`;
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
    throw new Error(
      API_URL
        ? "Não foi possível conectar ao servidor. Verifique se o backend está rodando."
        : "Não foi possível enviar o pedido. Tente novamente em instantes."
    );
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
  getMenus: () => api<{ menus: import("./types").MenuItem[] }>("/nutrir/menus"),
  createOrder: (body: CreateOrderPayload) =>
    api<CreateOrderResponse>("/nutrir/orders", {
      method: "POST",
      body: JSON.stringify(body),
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
  updatePaymentStatus: (order_id: string, payment_status: PaymentStatus) =>
    api<{ order: Order; notified: boolean }>("/nutrir/orders", {
      method: "PATCH",
      body: JSON.stringify({ order_id, payment_status }),
    }),
};

export function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
