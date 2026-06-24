"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckoutShell } from "@/components/checkout/CheckoutShell";
import { formatPrice, nutrirApi } from "@/lib/api";
import { getWhatsAppUrl } from "@/lib/payment-utils";

const QRCode = dynamic(() => import("react-qr-code"), { ssr: false });

export function PixPaymentStep() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiaCola, setCopiaCola] = useState("");
  const [amountCents, setAmountCents] = useState(0);
  const [receiverName, setReceiverName] = useState("");
  const [copied, setCopied] = useState(false);
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const data = await nutrirApi.getPixPayment(orderId!);
        if (cancelled) return;
        setCopiaCola(data.copia_cola);
        setAmountCents(data.amount_cents);
        setReceiverName(data.receiver_name);

        if (!notifiedRef.current) {
          notifiedRef.current = true;
          await nutrirApi.notifyPixPayment(orderId!);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao carregar Pix.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  async function handleCopy() {
    if (!copiaCola) return;
    try {
      await navigator.clipboard.writeText(copiaCola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Não foi possível copiar. Selecione o código manualmente.");
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
    `Olá! Fiz o Pix do pedido ${orderId.replace("order-", "#")} e aguardo confirmação.`
  );

  return (
    <CheckoutShell title="Pague com Pix">
      <div className="card mx-auto max-w-md space-y-6">
        {loading && <p className="text-center text-nutrir-emerald/70">Carregando dados do Pix…</p>}

        {error && !loading && (
          <p className="text-center text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && copiaCola && (
          <>
            <div className="text-center">
              <p className="text-sm text-nutrir-emerald/70">Valor a pagar</p>
              <p className="font-display text-3xl font-bold text-nutrir-burgundy">
                {formatPrice(amountCents)}
              </p>
              <p className="mt-1 text-xs text-nutrir-emerald/60">
                Beneficiário: {receiverName}
              </p>
            </div>

            <div className="flex justify-center rounded-xl bg-white p-4">
              <QRCode value={copiaCola} size={220} />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-nutrir-emerald/60">Pix copia e cola</p>
              <textarea
                readOnly
                value={copiaCola}
                rows={4}
                className="w-full resize-none rounded-lg border border-nutrir-nude-dark/40 bg-nutrir-nude/50 p-3 text-xs text-nutrir-emerald"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="btn-primary w-full py-3 text-sm font-bold"
              >
                {copied ? "Copiado!" : "Copiar código Pix"}
              </button>
            </div>

            <div className="rounded-lg bg-amber-50 p-4 text-sm leading-relaxed text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
              <p>
                Após pagar, aguarde a confirmação manual. Você receberá retorno quando o pagamento
                for identificado no banco.
              </p>
              <p className="mt-2 text-xs opacity-80">
                Pedido {orderId.replace("order-", "#")}
              </p>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-sm font-bold text-nutrir-burgundy underline"
            >
              Já paguei — avisar no WhatsApp
            </a>
          </>
        )}

        <Link href="/" className="block text-center text-sm text-nutrir-emerald/60 hover:text-nutrir-emerald">
          Voltar ao cardápio
        </Link>
      </div>
    </CheckoutShell>
  );
}
