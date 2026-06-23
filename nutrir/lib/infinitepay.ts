import type { PaymentMethod } from "./types";
import {
  applyPaymentPreferenceToUrl,
  buildGatewayItems,
} from "./infinitepay-checkout";
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

export async function createInfinitePayLink(input: {
  orderId: string;
  amountCents: number;
  items: OrderItem[];
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  paymentMethod?: PaymentMethod;
}): Promise<{ url: string } | null> {
  const handle = getInfinitePayHandle();
  const siteUrl = getSiteUrl();
  if (!handle || !siteUrl) return null;

  const gatewayItems = buildGatewayItems(input.items, input.amountCents);
  const captureMethod =
    input.paymentMethod === "pix"
      ? "pix"
      : input.paymentMethod === "card"
        ? "credit_card"
        : undefined;

  const payload: Record<string, unknown> = {
    handle,
    order_nsu: input.orderId,
    items: gatewayItems,
    redirect_url: `${siteUrl}/checkout/sucesso?order=${encodeURIComponent(input.orderId)}`,
    webhook_url: `${siteUrl}/api/nutrir/webhooks/infinitepay`,
    customer: {
      name: input.customerName,
      ...(input.customerEmail ? { email: input.customerEmail } : {}),
      phone_number: formatPhoneE164(input.customerPhone),
    },
    ...(captureMethod
      ? { capture_method: captureMethod, payment_method: captureMethod === "pix" ? "pix" : "credit_card" }
      : {}),
  };

  const res = await postCheckoutLink(payload);
  if (!res.ok && captureMethod) {
    const { capture_method: _, payment_method: __, ...withoutMethod } = payload;
    const retry = await postCheckoutLink(withoutMethod);
    if (retry.ok) {
      const data = (await retry.json()) as { url?: string };
      if (data.url) {
        return { url: applyPaymentPreferenceToUrl(data.url, input.paymentMethod) };
      }
    }
  }

  if (!res.ok) {
    console.error("[InfinitePay] links:", await res.text());
    return null;
  }

  const data = (await res.json()) as { url?: string };
  if (!data.url) return null;

  return {
    url: applyPaymentPreferenceToUrl(data.url, input.paymentMethod),
  };
}

async function postCheckoutLink(payload: Record<string, unknown>) {
  return fetch(`${CHECKOUT_API}/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
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

// Re-export for tests / legacy imports
export { buildInfinitePayItems } from "./infinitepay-checkout";
