import { buildGatewayItemsFromPixTotal } from "./infinitepay-checkout";
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

export async function createInfinitePayLink(input: {
  orderId: string;
  /** Total com preços Pix (cupom já aplicado). */
  pixTotalCents: number;
  /** Itens com unitário Pix. */
  items: OrderItem[];
  customerName: string;
  customerEmail?: string;
}): Promise<{ url: string } | null> {
  const handle = getInfinitePayHandle();
  const siteUrl = getSiteUrl();
  if (!handle || !siteUrl) return null;

  const gatewayItems = buildGatewayItemsFromPixTotal(input.items, input.pixTotalCents);

  const customer: Record<string, string> = { name: input.customerName };
  if (input.customerEmail?.trim()) {
    customer.email = input.customerEmail.trim().toLowerCase();
  }
  // Não enviamos phone_number: a InfinitePay dispara OTP no WhatsApp ao validar o celular.

  const payload = {
    handle,
    order_nsu: input.orderId,
    items: gatewayItems,
    redirect_url: `${siteUrl}/checkout/sucesso?order=${encodeURIComponent(input.orderId)}`,
    webhook_url: `${siteUrl}/api/nutrir/webhooks/infinitepay`,
    customer,
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
}): Promise<{ paid: boolean; captureMethod?: string; paidAmountCents?: number }> {
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
    paid_amount?: number;
  };

  return {
    paid: Boolean(data.success && data.paid),
    captureMethod: data.capture_method,
    paidAmountCents: data.paid_amount,
  };
}

export {
  buildInfinitePayItems,
  buildGatewayItemsFromPixTotal,
  getInfinitePayCardTotalCents,
  INFINITEPAY_PIX_DISCOUNT_PERCENT,
} from "./infinitepay-checkout";
