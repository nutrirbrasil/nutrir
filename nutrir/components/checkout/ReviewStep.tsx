"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckoutPriceSummary } from "@/components/checkout/CheckoutPriceSummary";
import { CouponField } from "@/components/checkout/CouponField";
import { CheckoutShell, useCheckoutGuard } from "@/components/checkout/CheckoutShell";
import { OrderSummarySidebar } from "@/components/checkout/OrderSummarySidebar";
import { nutrirApi, PAYMENT_METHOD_SHORT_LABELS } from "@/lib/api";
import type { CheckoutDraft } from "@/lib/checkout-draft";
import { useCheckout } from "@/lib/checkout-context";
import {
  computeOrderPricing,
  getChargedItems,
} from "@/lib/order-pricing";
import { getReviewLocalPaymentNote } from "@/lib/local-payment-copy";
import { isLocalPayment, isOnlinePayment, normalizePaymentMethod } from "@/lib/payment-utils";
import { formatPickupDisplayLines } from "@/lib/pickup-schedule";
import { NUTRIR_STORE_ADDRESS, resolvePickupAddress } from "@/lib/store-info";
import { useCart } from "@/lib/cart-context";
import { useProfile } from "@/lib/profile-context";
import { usePatientStatus } from "@/lib/use-patient-status";
import type { CreateOrderPayload, Order, PaymentMethod } from "@/lib/types";

function canReusePendingOrder(
  existing: Order,
  draft: CheckoutDraft,
  method: PaymentMethod
): boolean {
  if (existing.payment_status !== "pending") return false;
  if (normalizePaymentMethod(existing.payment_method) !== method) return false;

  const pricing = computeOrderPricing(draft.items, method, draft.coupon_code);
  if (existing.total_cents !== pricing.total_cents) return false;
  if ((existing.coupon_code ?? "") !== (draft.coupon_code ?? "")) return false;

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
  const { profile, session } = useProfile();
  const { patchDraft, resetCheckout } = useCheckout();
  const { draft, ready } = useCheckoutGuard();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cpfForPatient = draft?.customer_cpf || profile.cpf;
  const { isPatient } = usePatientStatus(cpfForPatient);

  if (!ready || !draft) return null;

  const d = draft;
  const method = normalizePaymentMethod(d.payment_method);
  const pricing = computeOrderPricing(d.items, method, d.coupon_code);
  const pickupLines = formatPickupDisplayLines(d.pickup_display);

  function buildPayload(): CreateOrderPayload {
    const accountEmail = (session?.user.email ?? profile.email).trim().toLowerCase();
    return {
      customer_name: d.customer_name,
      customer_phone: d.customer_phone,
      customer_email: d.customer_email?.trim().toLowerCase() || accountEmail || undefined,
      customer_cpf: d.customer_cpf,
      delivery_address: resolvePickupAddress(),
      delivery_date: d.delivery_date,
      pickup_display: d.pickup_display,
      payment_method: method,
      user_notes: d.user_notes,
      notes: d.internal_notes,
      coupon_code: d.coupon_code,
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
            const { checkout_url: url } = await nutrirApi.createCheckoutLink(d.order_id, method);
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
                  {getReviewLocalPaymentNote(isPatient)}
                </p>
              )}
            </div>
            <Link href="/checkout/pagamento" className="text-xs font-bold uppercase text-nutrir-burgundy">
              Trocar
            </Link>
          </div>

          <div className="card">
            <CouponField
              code={d.coupon_code}
              onApply={(code) => patchDraft({ coupon_code: code, order_id: undefined })}
              onRemove={() => patchDraft({ coupon_code: undefined, order_id: undefined })}
            />
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
