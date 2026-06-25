"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckoutShell } from "@/components/checkout/CheckoutShell";
import { nutrirApi } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { useCheckout } from "@/lib/checkout-context";
import { formatOrderLabel } from "@/lib/order-id";
import {
  getWhatsAppUrl,
  isLocalPayment,
  isOnlineCardPayment,
  isOnlinePixPayment,
} from "@/lib/payment-utils";
import { usePatientStatus } from "@/lib/use-patient-status";
import type { Order } from "@/lib/types";
import type { PaymentMethod } from "@/lib/types";

const PAULI_SITE_URL = "https://pauli.nutrirpicarras.com.br";

type ViewState =
  | "loading"
  | "pix_pending"
  | "card_confirmed"
  | "card_pending"
  | "local_patient"
  | "local_guest"
  | "missing";

function resolveOnlineViewState(order: Order): ViewState {
  if (isOnlinePixPayment(order.payment_method)) {
    return order.payment_status === "confirmed" ? "card_confirmed" : "pix_pending";
  }
  if (isOnlineCardPayment(order.payment_method)) {
    return order.payment_status === "confirmed" ? "card_confirmed" : "card_pending";
  }
  if (order.payment_status === "confirmed") return "card_confirmed";
  return "pix_pending";
}

function whatsappMessage(orderId: string, order: Order | null, view: ViewState): string {
  const label = formatOrderLabel(orderId);
  if (view === "card_confirmed" && order && isOnlineCardPayment(order.payment_method)) {
    return `Olá! Paguei com cartão o pedido ${label} e gostaria de receber atualizações sobre a produção e retirada.`;
  }
  if (view === "local_patient" || view === "local_guest") {
    return `Olá! Quero receber atualizações sobre meu pedido ${label}.`;
  }
  return `Olá! Fiz o Pix do pedido ${label} e gostaria de receber atualizações sobre a produção e retirada.`;
}

function PauliUpsell() {
  return (
    <div className="space-y-3 border-t border-nutrir-nude-dark/40 pt-6 text-left">
      <p className="text-xs font-bold uppercase tracking-wide text-nutrir-emerald/55">Você sabia?</p>
      <p className="text-sm leading-relaxed text-nutrir-emerald/80">
        Quem é <strong>paciente da nutricionista Paula Pastorino</strong> tem benefícios exclusivos
        no Nutrir: cupons especiais, produção prioritária, opção de pagar na retirada e marmitas com
        quantidades personalizadas.
      </p>
      <a
        href={PAULI_SITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center rounded-xl border-2 border-nutrir-emerald py-3 text-sm font-bold text-nutrir-emerald transition hover:bg-nutrir-emerald/5"
      >
        Conheça a Paula
      </a>
      <Link
        href="/beneficios"
        className="block text-center text-xs font-medium text-nutrir-burgundy hover:underline"
      >
        Ver todos os benefícios para pacientes
      </Link>
    </div>
  );
}

function PayOnlineOptions({
  orderId,
  loading,
  error,
  onPay,
}: {
  orderId: string;
  loading: PaymentMethod | null;
  error: string;
  onPay: (method: PaymentMethod) => void;
}) {
  return (
    <div className="space-y-3 border-t border-nutrir-nude-dark/40 pt-6">
      <p className="text-sm font-semibold text-nutrir-emerald">Prefere pagar agora pelo site?</p>
      <button
        type="button"
        disabled={loading !== null}
        onClick={() => onPay("pix")}
        className="btn-primary w-full py-3.5 text-sm font-bold"
      >
        {loading === "pix" ? "Abrindo…" : "Quero pagar no Pix"}
      </button>
      <button
        type="button"
        disabled={loading !== null}
        onClick={() => onPay("card")}
        className="w-full rounded-xl border-2 border-nutrir-emerald py-3.5 text-sm font-bold text-nutrir-emerald transition hover:bg-nutrir-emerald/5"
      >
        {loading === "card" ? "Abrindo…" : "Quero pagar no Cartão"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function OrderThankYouStep() {
  const searchParams = useSearchParams();
  const cart = useCart();
  const { resetCheckout } = useCheckout();
  const orderId = searchParams.get("order");
  const [order, setOrder] = useState<Order | null>(null);
  const [view, setView] = useState<ViewState>("loading");
  const [payLoading, setPayLoading] = useState<PaymentMethod | null>(null);
  const [payError, setPayError] = useState("");
  const { isPatient, loading: patientLoading } = usePatientStatus(order?.customer_cpf);

  useEffect(() => {
    if (!orderId) {
      setView("missing");
      return;
    }

    const transactionNsu = searchParams.get("transaction_nsu") ?? undefined;
    const slug = searchParams.get("slug") ?? searchParams.get("invoice_slug") ?? undefined;

    let cancelled = false;

    async function load() {
      try {
        if (transactionNsu || slug) {
          await nutrirApi.verifyOrderPayment({
            order_id: orderId!,
            transaction_nsu: transactionNsu,
            slug,
          });
        }

        const { order: latest } = await nutrirApi.getOrder(orderId!);
        if (cancelled) return;

        setOrder(latest);
        cart.clearCart();
        resetCheckout();

        if (isLocalPayment(latest.payment_method)) {
          return;
        }

        setView(resolveOnlineViewState(latest));
      } catch {
        if (!cancelled) setView("missing");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [orderId, searchParams, cart, resetCheckout]);

  useEffect(() => {
    if (!order || !isLocalPayment(order.payment_method)) return;
    if (patientLoading) return;
    setView(isPatient ? "local_patient" : "local_guest");
  }, [order, isPatient, patientLoading]);

  async function payOnline(method: PaymentMethod) {
    if (!orderId) return;
    setPayLoading(method);
    setPayError("");

    try {
      if (method === "pix") {
        window.location.href = `/checkout/pix?order=${encodeURIComponent(orderId)}`;
        return;
      }

      const { checkout_url } = await nutrirApi.createCheckoutLink(orderId, "card");
      if (!checkout_url) {
        setPayError("Não foi possível abrir o pagamento. Tente novamente.");
        return;
      }
      window.location.href = checkout_url;
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Erro ao abrir pagamento.");
    } finally {
      setPayLoading(null);
    }
  }

  if (view === "loading" || (order && isLocalPayment(order.payment_method) && patientLoading)) {
    return (
      <CheckoutShell title="Aguarde…">
        <div className="card mx-auto max-w-md text-center">
          <p className="text-nutrir-emerald/70">Confirmando seu pedido…</p>
        </div>
      </CheckoutShell>
    );
  }

  if (view === "missing" || !orderId) {
    return (
      <CheckoutShell title="Pedido não encontrado">
        <div className="card mx-auto max-w-md text-center">
          <Link href="/" className="btn-primary mt-4 inline-block">
            Voltar ao cardápio
          </Link>
        </div>
      </CheckoutShell>
    );
  }

  const orderLabel = formatOrderLabel(orderId);
  const whatsappUpdatesUrl = getWhatsAppUrl(whatsappMessage(orderId, order, view));
  const showUpsell = view !== "local_patient";

  if (view === "card_pending") {
    return (
      <CheckoutShell title="Confirmando pagamento…">
        <div className="card mx-auto max-w-md space-y-6 text-center">
          <p className="text-4xl" aria-hidden>
            ⏳
          </p>
          <p className="text-sm leading-relaxed text-nutrir-emerald/75">
            Pedido <strong>{orderLabel}</strong> — ainda estamos confirmando o pagamento com cartão.
            Se você já concluiu no checkout, aguarde alguns instantes e atualize esta página.
          </p>
          <a
            href={whatsappUpdatesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex w-full items-center justify-center py-3.5 text-sm font-bold"
          >
            Receber atualizações do pedido no WhatsApp
          </a>
          <Link href="/" className="block text-sm text-nutrir-emerald/60 hover:text-nutrir-emerald">
            Voltar ao cardápio
          </Link>
        </div>
      </CheckoutShell>
    );
  }

  if (view === "local_patient") {
    return (
      <CheckoutShell title="Obrigado!">
        <div className="card mx-auto max-w-md space-y-6 text-center">
          <p className="text-4xl" aria-hidden>
            ✓
          </p>
          <div className="space-y-2">
            <h2 className="font-display text-xl font-bold text-nutrir-emerald">
              Recebemos seu pedido
            </h2>
            <p className="text-sm leading-relaxed text-nutrir-emerald/75">
              Pedido <strong>{orderLabel}</strong> registrado. Como <strong>paciente VIP</strong>, a
              produção será <strong>prioritária</strong>. O pagamento em dinheiro ou cartão físico
              pode ser feito <strong>na retirada</strong>.
            </p>
          </div>

          <a
            href={whatsappUpdatesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex w-full items-center justify-center py-3.5 text-sm font-bold"
          >
            Receber atualizações do pedido no WhatsApp
          </a>

          <PayOnlineOptions
            orderId={orderId}
            loading={payLoading}
            error={payError}
            onPay={payOnline}
          />

          <Link href="/" className="block text-sm text-nutrir-emerald/60 hover:text-nutrir-emerald">
            Voltar ao cardápio
          </Link>
        </div>
      </CheckoutShell>
    );
  }

  if (view === "local_guest") {
    return (
      <CheckoutShell title="Obrigado!">
        <div className="card mx-auto max-w-md space-y-6 text-center">
          <p className="text-4xl" aria-hidden>
            ✓
          </p>
          <div className="space-y-2">
            <h2 className="font-display text-xl font-bold text-nutrir-emerald">
              Recebemos seu pedido
            </h2>
            <p className="text-sm leading-relaxed text-nutrir-emerald/75">
              Pedido <strong>{orderLabel}</strong> registrado. Efetue o pagamento{" "}
              <strong>no local na retirada</strong>, dentro de <strong>48 horas</strong>, para
              iniciarmos a produção.
            </p>
          </div>

          <a
            href={whatsappUpdatesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex w-full items-center justify-center py-3.5 text-sm font-bold"
          >
            Receber atualizações do pedido no WhatsApp
          </a>

          <PayOnlineOptions
            orderId={orderId}
            loading={payLoading}
            error={payError}
            onPay={payOnline}
          />

          {showUpsell && <PauliUpsell />}

          <Link href="/" className="block text-sm text-nutrir-emerald/60 hover:text-nutrir-emerald">
            Voltar ao cardápio
          </Link>
        </div>
      </CheckoutShell>
    );
  }

  const isPixPending = view === "pix_pending";

  return (
    <CheckoutShell title="Obrigado!">
      <div className="card mx-auto max-w-md space-y-6 text-center">
        <p className="text-4xl" aria-hidden>
          {isPixPending ? "✓" : "✅"}
        </p>
        <div className="space-y-2">
          <h2 className="font-display text-xl font-bold text-nutrir-emerald">
            {isPixPending ? "Recebemos seu pedido" : "Pagamento confirmado!"}
          </h2>
          <p className="text-sm leading-relaxed text-nutrir-emerald/75">
            {isPixPending ? (
              <>
                Pedido <strong>{orderLabel}</strong> registrado. Assim que o pagamento Pix for
                confirmado no banco, seu pedido entra na fila de produção.
              </>
            ) : (
              <>
                Pedido <strong>{orderLabel}</strong> confirmado. Seu pedido já entra na fila de
                produção.
              </>
            )}
          </p>
        </div>

        <a
          href={whatsappUpdatesUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex w-full items-center justify-center py-3.5 text-sm font-bold"
        >
          Receber atualizações do pedido no WhatsApp
        </a>

        {showUpsell && <PauliUpsell />}

        <Link href="/" className="block text-sm text-nutrir-emerald/60 hover:text-nutrir-emerald">
          Voltar ao cardápio
        </Link>
      </div>
    </CheckoutShell>
  );
}
