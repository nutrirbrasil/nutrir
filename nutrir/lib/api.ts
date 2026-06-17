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
  createOrder: (body: import("./types").CreateOrderPayload) =>
    api<{ order: import("./types").Order; notified: boolean }>("/nutrir/orders", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
