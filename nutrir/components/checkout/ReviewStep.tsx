"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiTag } from "react-icons/fi";
import { CheckoutShell, useCheckoutGuard } from "@/components/checkout/CheckoutShell";
import { OrderSummarySidebar } from "@/components/checkout/OrderSummarySidebar";
import { formatPrice, nutrirApi, PAYMENT_METHOD_LABELS } from "@/lib/api";
import { isLocalPayment, isOnlinePayment } from "@/lib/payment-utils";
import { useCheckout } from "@/lib/checkout-context";
import { draftTotalCents } from "@/lib/checkout-draft";
import { saveOrderToHistory } from "@/lib/order-history";
import { useCart } from "@/lib/cart-context";
import type { CreateOrderPayload } from "@/lib/types";

export function ReviewStep() {
  const router = useRouter();
  const cart = useCart();
  const { patchDraft, resetCheckout } = useCheckout();
  const { draft, ready } = useCheckoutGuard();
  const [coupon, setCoupon] = useState(draft?.coupon ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!ready || !draft) return null;

  const d = draft;
  const total = draftTotalCents(d);
  const method = d.payment_method ?? "pix";

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
      coupon: coupon || undefined,
    };
  }

  function finalizeLabel(): string {
    if (isLocalPayment(method)) return "Confirmar pedido";
    return "Ir para pagamento";
  }

  function redirectToCheckout(url: string, orderId: string) {
    patchDraft({ coupon, order_id: orderId });
    window.location.href = url;
  }

  async function handleFinalize() {
    setLoading(true);
    setError("");
    patchDraft({ coupon });

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
          if (existing.payment_status === "pending") {
            const url =
              existing.checkout_url ??
              (await nutrirApi.createCheckoutLink(d.order_id, method)).checkout_url;
            if (url) {
              redirectToCheckout(url, existing.id);
              return;
            }
          }
        } catch {
          /* pedido anterior expirou — cria um novo */
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
          <div className="card flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-nutrir-emerald/60">Retirada</p>
              <p className="font-semibold text-nutrir-emerald">{d.pickup_display}</p>
              <p className="text-sm text-nutrir-emerald/70">{d.delivery_address}</p>
            </div>
            <Link href="/agendar" className="text-xs font-bold uppercase text-nutrir-burgundy">
              Trocar
            </Link>
          </div>

          <div className="card flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-nutrir-emerald/60">Pagamento</p>
              <p className="font-semibold text-nutrir-emerald">{PAYMENT_METHOD_LABELS[method]}</p>
              {isOnlinePayment(method) && (
                <p className="text-sm text-nutrir-emerald/70">
                  Você será redirecionado ao checkout InfinitePay
                </p>
              )}
              {isLocalPayment(method) && (
                <p className="text-sm text-nutrir-emerald/70">
                  Pague no local em até 48 horas para iniciarmos a produção
                </p>
              )}
            </div>
            <Link href="/checkout/pagamento" className="text-xs font-bold uppercase text-nutrir-burgundy">
              Trocar
            </Link>
          </div>

          <div className="card">
            <div className="relative">
              <FiTag className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-nutrir-emerald/40" />
              <input
                type="text"
                placeholder="Aplicar cupom"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                className="input-field w-full py-2.5 pl-10"
              />
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-nutrir-emerald">Resumo da compra</h3>
            <div className="mt-3 flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-nutrir-nude-dark/40 pt-3 text-lg font-bold">
              <span>Total</span>
              <span className="text-nutrir-burgundy">{formatPrice(total)}</span>
            </div>
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

        <OrderSummarySidebar draft={d} />
      </div>
    </CheckoutShell>
  );
}
