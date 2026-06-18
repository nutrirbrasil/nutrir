import type { OrderItem } from "./types";

const CHECKOUT_API = "https://api.checkout.infinitepay.io";

export function getInfinitePayHandle(): string {
  return process.env.INFINITEPAY_HANDLE?.trim().replace(/^\$/, "") ?? "";
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
}

export function isInfinitePayConfigured(): boolean {
  return Boolean(getInfinitePayHandle() && getSiteUrl());
}

function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  return `+55${digits}`;
}

export function buildInfinitePayItems(
  items: OrderItem[]
): { quantity: number; price: number; description: string }[] {
  return items.map((item) => ({
    quantity: item.quantity,
    price: item.price_cents,
    description: item.name.slice(0, 120),
  }));
}

export async function createInfinitePayLink(input: {
  orderId: string;
  amountCents: number;
  items: OrderItem[];
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
}): Promise<{ url: string } | null> {
  const handle = getInfinitePayHandle();
  const siteUrl = getSiteUrl();
  if (!handle || !siteUrl) return null;

  const payload: Record<string, unknown> = {
    handle,
    order_nsu: input.orderId,
    items: buildInfinitePayItems(input.items),
    redirect_url: `${siteUrl}/checkout/sucesso?order=${encodeURIComponent(input.orderId)}`,
    webhook_url: `${siteUrl}/api/nutrir/webhooks/infinitepay`,
    customer: {
      name: input.customerName,
      ...(input.customerEmail ? { email: input.customerEmail } : {}),
      phone_number: formatPhoneE164(input.customerPhone),
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
  return data.url ? { url: data.url } : null;
}

export async function checkInfinitePayPayment(input: {
  orderNsu: string;
  transactionNsu?: string;
  slug?: string;
}): Promise<{ paid: boolean; captureMethod?: string }> {
  const handle = getInfinitePayHandle();
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

  const data = (await res.json()) as {
    success?: boolean;
    paid?: boolean;
    capture_method?: string;
  };

  return {
    paid: Boolean(data.success && data.paid),
    captureMethod: data.capture_method,
  };
}
