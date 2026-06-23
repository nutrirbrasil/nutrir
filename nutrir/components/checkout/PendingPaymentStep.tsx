"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckoutShell } from "@/components/checkout/CheckoutShell";
import { nutrirApi } from "@/lib/api";
import { getWhatsAppUrl } from "@/lib/payment-utils";
import { usePatientStatus } from "@/lib/use-patient-status";
import type { PaymentMethod } from "@/lib/types";

export function PendingPaymentStep() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const [loading, setLoading] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState("");
  const [orderCpf, setOrderCpf] = useState<string | undefined>();
  const { isPatient } = usePatientStatus(orderCpf);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    nutrirApi
      .getOrder(orderId)
      .then(({ order }) => {
        if (!cancelled) setOrderCpf(order.customer_cpf);
      })
      .catch(() => {
        if (!cancelled) setOrderCpf(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  async function payOnline(method: PaymentMethod) {
    if (!orderId) return;
    setLoading(method);
    setError("");

    try {
      const { checkout_url } = await nutrirApi.createCheckoutLink(orderId, method);
      if (!checkout_url) {
        setError("Não foi possível abrir o pagamento. Tente novamente.");
        return;
      }
      window.location.href = checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao abrir pagamento.");
    } finally {
      setLoading(null);
    }
  }

  if (!orderId) {
    return (
      <CheckoutShell title="Pedido não encontrado">
        <div className="card text-center">
          <Link href="/" className="btn-primary mt-4 inline-block">
            Voltar ao cardápio
          </Link>
        </div>
      </CheckoutShell>
    );
  }

  const whatsappUrl = getWhatsAppUrl(
    `Olá! Tenho dúvidas sobre meu pedido ${orderId.replace("order-", "#")}.`
  );

  if (isPatient) {
    return (
      <CheckoutShell title="Pedido confirmado">
        <div className="card space-y-6 text-center">
          <p className="text-4xl">✅</p>
          <p className="text-nutrir-emerald/80">
            Seu pedido foi confirmado! Como <strong>paciente VIP</strong>, iniciaremos a produção com{" "}
            <strong>prioridade</strong>. O pagamento em <strong>dinheiro</strong> ou{" "}
            <strong>cartão físico</strong> pode ser feito <strong>na retirada</strong> — não é
            necessário pagar antecipadamente no Nutrir.
          </p>

          <div className="space-y-3 border-t border-nutrir-nude-dark/40 pt-6">
            <p className="text-sm font-semibold text-nutrir-emerald">
              Prefere pagar agora pelo site?
            </p>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => payOnline("pix")}
              className="btn-primary w-full py-3.5"
            >
              {loading === "pix" ? "Abrindo…" : "Quero pagar no Pix"}
            </button>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => payOnline("card")}
              className="w-full rounded-xl border-2 border-nutrir-emerald py-3.5 font-bold text-nutrir-emerald transition hover:bg-nutrir-emerald/5"
            >
              {loading === "card" ? "Abrindo…" : "Quero pagar no Cartão"}
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="border-t border-nutrir-nude-dark/40 pt-6">
            <p className="text-sm text-nutrir-emerald/70">Está com alguma dúvida?</p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block font-bold text-nutrir-burgundy underline"
            >
              Entrar em contato via WhatsApp
            </a>
          </div>

          <Link href="/" className="block text-sm text-nutrir-emerald/60 hover:text-nutrir-emerald">
            Voltar ao cardápio
          </Link>
        </div>
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell title="Pedido pendente">
      <div className="card space-y-6 text-center">
        <p className="text-4xl">⏳</p>
        <p className="text-nutrir-emerald/80">
          Seu pedido foi encaminhado e está pendente. Efetue o pagamento no local dentro de{" "}
          <strong>48 horas</strong> para começarmos a produzir.
        </p>

        <div className="space-y-3 border-t border-nutrir-nude-dark/40 pt-6">
          <p className="text-sm font-semibold text-nutrir-emerald">
            Não vai conseguir comparecer dentro do período estimado?
          </p>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => payOnline("pix")}
            className="btn-primary w-full py-3.5"
          >
            {loading === "pix" ? "Abrindo…" : "Quero pagar no Pix"}
          </button>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => payOnline("card")}
            className="w-full rounded-xl border-2 border-nutrir-emerald py-3.5 font-bold text-nutrir-emerald transition hover:bg-nutrir-emerald/5"
          >
            {loading === "card" ? "Abrindo…" : "Quero pagar no Cartão"}
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="border-t border-nutrir-nude-dark/40 pt-6">
          <p className="text-sm text-nutrir-emerald/70">Está com alguma dúvida?</p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block font-bold text-nutrir-burgundy underline"
          >
            Entrar em contato via WhatsApp
          </a>
        </div>

        <Link href="/" className="block text-sm text-nutrir-emerald/60 hover:text-nutrir-emerald">
          Voltar ao cardápio
        </Link>
      </div>
    </CheckoutShell>
  );
}
