import type { OrderItem } from "./types";

const CHECKOUT_API = "https://api.checkout.infinitepay.io";

export function isInfinitePayConfigured(): boolean {
  const handle = process.env.INFINITEPAY_HANDLE?.trim().replace(/^\$/, "") ?? "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  return Boolean(handle && siteUrl);
}

function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  return `+55${digits}`;
}

function buildGatewayItems(
  items: OrderItem[],
  totalCents: number
): { quantity: number; price: number; description: string }[] {
  const currentTotal = items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
  let scaled = items;

  if (currentTotal > 0 && currentTotal !== totalCents) {
    const factor = totalCents / currentTotal;
    scaled = items.map((item) => ({
      ...item,
      price_cents: Math.max(1, Math.floor(item.price_cents * factor)),
    }));

    let total = scaled.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
    const diff = totalCents - total;
    if (diff !== 0) {
      const last = scaled[scaled.length - 1];
      if (last) {
        const perUnit = Math.round(diff / last.quantity);
        last.price_cents = Math.max(1, last.price_cents + perUnit);
      }
    }
  }

  return scaled.map((item) => ({
    quantity: item.quantity,
    price: item.price_cents,
    description: item.name.slice(0, 120),
  }));
}

/** Checkout InfinitePay apenas para cartão online. */
export async function createInfinitePayLink(input: {
  orderId: string;
  totalCents: number;
  items: OrderItem[];
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
}): Promise<{ url: string } | null> {
  const handle = process.env.INFINITEPAY_HANDLE?.trim().replace(/^\$/, "") ?? "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  if (!handle || !siteUrl) return null;

  const payload = {
    handle,
    order_nsu: input.orderId,
    items: buildGatewayItems(input.items, input.totalCents),
    redirect_url: `${siteUrl}/checkout/sucesso?order=${encodeURIComponent(input.orderId)}`,
    webhook_url: `${siteUrl}/api/nutrir/webhooks/infinitepay`,
    customer: {
      name: input.customerName,
      phone_number: formatPhoneE164(input.customerPhone),
      ...(input.customerEmail?.trim()
        ? { email: input.customerEmail.trim().toLowerCase() }
        : {}),
    },
  };

  const res = await fetch(`${CHECKOUT_API}/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("[InfinitePay] links:", await res.text());
    return null;
  }

  const data = (await res.json()) as { url?: string };
  if (!data.url) return null;

  return { url: data.url };
}

export async function checkInfinitePayPayment(input: {
  orderNsu: string;
  transactionNsu?: string;
  slug?: string;
}): Promise<{ paid: boolean }> {
  const handle = process.env.INFINITEPAY_HANDLE?.trim().replace(/^\$/, "") ?? "";
  if (!handle) return { paid: false };

  const res = await fetch(`${CHECKOUT_API}/payment_check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handle,
      order_nsu: input.orderNsu,
      ...(input.transactionNsu ? { transaction_nsu: input.transactionNsu } : {}),
      ...(input.slug ? { slug: input.slug } : {}),
    }),
  });

  if (!res.ok) {
    console.error("[InfinitePay] payment_check:", await res.text());
    return { paid: false };
  }

  const data = (await res.json()) as { success?: boolean; paid?: boolean };
  return { paid: Boolean(data.success && data.paid) };
}
