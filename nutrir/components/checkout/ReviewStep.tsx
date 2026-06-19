"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckoutPriceSummary } from "@/components/checkout/CheckoutPriceSummary";
import { CheckoutShell, useCheckoutGuard } from "@/components/checkout/CheckoutShell";
import { OrderSummarySidebar } from "@/components/checkout/OrderSummarySidebar";
import { nutrirApi, PAYMENT_METHOD_SHORT_LABELS } from "@/lib/api";
import type { CheckoutDraft } from "@/lib/checkout-draft";
import { useCheckout } from "@/lib/checkout-context";
import {
  computeOrderPricing,
  getChargedItems,
} from "@/lib/order-pricing";
import { isLocalPayment, isOnlinePayment, normalizePaymentMethod } from "@/lib/payment-utils";
import { formatPickupDisplayLines } from "@/lib/pickup-schedule";
import { saveOrderToHistory } from "@/lib/order-history";
import { NUTRIR_STORE_ADDRESS } from "@/lib/store-info";
import { useCart } from "@/lib/cart-context";
import type { CreateOrderPayload, Order, PaymentMethod } from "@/lib/types";

function canReusePendingOrder(
  existing: Order,
  draft: CheckoutDraft,
  method: PaymentMethod
): boolean {
  if (existing.payment_status !== "pending") return false;
  if (normalizePaymentMethod(existing.payment_method) !== method) return false;

  const pricing = computeOrderPricing(draft.items, method);
  if (existing.total_cents !== pricing.total_cents) return false;

  const charged = getChargedItems(draft.items, method);
  if (existing.items.length !== charged.length) return false;

  return existing.items.every(
    (item, i) =>
      item.name === charged[i].name &&
      item.quantity === charged[i].quantity &&
      item.price_cents === charged[i].price_cents
  );
}

export function ReviewStep() {
  const router = useRouter();
  const cart = useCart();
  const { patchDraft, resetCheckout } = useCheckout();
  const { draft, ready } = useCheckoutGuard();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!ready || !draft) return null;

  const d = draft;
  const method = normalizePaymentMethod(d.payment_method);
  const pricing = computeOrderPricing(d.items, method);
  const pickupLines = formatPickupDisplayLines(d.pickup_display);

  function buildPayload(): CreateOrderPayload {
    return {
      customer_name: d.customer_name,
      customer_phone: d.customer_phone,
      customer_email: d.customer_email,
      customer_cpf: d.customer_cpf,
      delivery_address: d.delivery_address,
      delivery_date: d.delivery_date,
      pickup_display: d.pickup_display,
      payment_method: method,
      user_notes: d.user_notes,
      notes: d.internal_notes,
      items: d.items,
    };
  }

  function finalizeLabel(): string {
    if (isLocalPayment(method)) return "Confirmar pedido";
    return "Ir para pagamento";
  }

  function redirectToCheckout(url: string, orderId: string) {
    patchDraft({ order_id: orderId });
    window.location.href = url;
  }

  async function handleFinalize() {
    setLoading(true);
    setError("");

    try {
      if (isOnlinePayment(method) && d.order_id) {
        try {
          const { order: existing } = await nutrirApi.getOrder(d.order_id);
          if (existing.payment_status === "confirmed") {
            cart.clearCart();
            resetCheckout();
            router.push(`/checkout/sucesso?order=${existing.id}`);
            return;
          }
          if (canReusePendingOrder(existing, d, method)) {
            const url =
              existing.checkout_url ??
              (await nutrirApi.createCheckoutLink(d.order_id, method)).checkout_url;
            if (url) {
              redirectToCheckout(url, existing.id);
              return;
            }
          }
        } catch {
          patchDraft({ order_id: undefined });
        }
      }

      const payload = buildPayload();
      const { order, checkout_url } = await nutrirApi.createOrder(payload);

      if (isLocalPayment(method)) {
        saveOrderToHistory({
          id: order.id,
          customer_phone: order.customer_phone,
          customer_name: order.customer_name,
          created_at: order.created_at,
          items: order.items,
          total_cents: order.total_cents,
          payment_method: method,
          pickup_display: order.pickup_display ?? d.pickup_display,
          notes: d.user_notes,
        });
        cart.clearCart();
        resetCheckout();
        router.push(`/checkout/pendente?order=${order.id}`);
        return;
      }

      if (!checkout_url) {
        setError("Não foi possível abrir o pagamento. Tente novamente.");
        return;
      }

      redirectToCheckout(checkout_url, order.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao finalizar pedido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <CheckoutShell title="Revise os detalhes do seu pedido" backHref="/checkout/pagamento">
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="card flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-nutrir-emerald/60">Retirada</p>
              <div className="mt-1 space-y-2 font-semibold text-nutrir-emerald">
                {pickupLines.map((line, i) => (
                  <div key={i}>
                    {line.label && <p>{line.label}</p>}
                    {line.value && <p className={line.label ? "font-normal" : ""}>{line.value}</p>}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-sm text-nutrir-emerald/70">{NUTRIR_STORE_ADDRESS}</p>
            </div>
            <Link href="/agendar" className="shrink-0 text-xs font-bold uppercase text-nutrir-burgundy">
              Trocar
            </Link>
          </div>

          <div className="card flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-nutrir-emerald/60">Pagamento</p>
              <p className="font-semibold text-nutrir-emerald">
                {PAYMENT_METHOD_SHORT_LABELS[method]}
              </p>
              {isLocalPayment(method) && (
                <p className="text-sm text-nutrir-emerald/70">
                  Após a confirmação, efetue o pagamento em até 48 horas
                </p>
              )}
            </div>
            <Link href="/checkout/pagamento" className="text-xs font-bold uppercase text-nutrir-burgundy">
              Trocar
            </Link>
          </div>

          <div className="card">
            <CheckoutPriceSummary pricing={pricing} method={method} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            disabled={loading}
            onClick={handleFinalize}
            className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-wide"
          >
            {loading ? "Processando…" : finalizeLabel()}
          </button>
        </div>

        <OrderSummarySidebar draft={{ ...d, payment_method: method }} />
      </div>
    </CheckoutShell>
  );
}
