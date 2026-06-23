"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FiAlertTriangle } from "react-icons/fi";
import { CheckoutShell, useCheckoutGuard } from "@/components/checkout/CheckoutShell";
import { useCheckout } from "@/lib/checkout-context";
import { hasFiscalData } from "@/lib/checkout-draft";
import { analyzeCartItems } from "@/lib/pickup-schedule";
import { isLocalPayment, normalizePaymentMethod } from "@/lib/payment-utils";
import type { PaymentMethod } from "@/lib/types";

interface PaymentOption {
  id: PaymentMethod;
  label: string;
  hint: string;
  badge?: string;
}

const LOCAL_PAYMENT_NOTICE =
  "Ao selecionar essa opção você concorda que precisa realizar o pagamento no local dentro de 24h, dentro do horário de funcionamento e que atraso no pagamento pode ocasionar atraso na produção e entrega.";

const ONLINE_OPTIONS: PaymentOption[] = [
  {
    id: "pix",
    label: "Pix",
    hint: "Pagamento imediato, produção imediata.",
    badge: "10% OFF",
  },
  {
    id: "card",
    label: "Cartão Online",
    hint: "Pagamento imediato, produção imediata.",
  },
];

const LOCAL_OPTIONS: PaymentOption[] = [
  {
    id: "local_cash",
    label: "Dinheiro",
    hint: "Produção mediante pagamento",
    badge: "10% OFF",
  },
  {
    id: "local_card",
    label: "Cartão Físico",
    hint: "Produção mediante pagamento",
  },
];

export function PaymentMethodStep() {
  const router = useRouter();
  const { patchDraft } = useCheckout();
  const { draft, ready } = useCheckoutGuard();
  const [method, setMethod] = useState<PaymentMethod>(
    normalizePaymentMethod(draft?.payment_method)
  );

  const cartAnalysis = useMemo(
    () => (draft ? analyzeCartItems(draft.items) : { hasCombo: false }),
    [draft]
  );

  if (!ready || !draft) return null;

  const options = cartAnalysis.hasCombo
    ? [...ONLINE_OPTIONS, ...LOCAL_OPTIONS]
    : ONLINE_OPTIONS;

  function handleContinue() {
    const next = { ...draft!, payment_method: method };
    patchDraft({ payment_method: method, order_id: undefined });

    if (!hasFiscalData(next)) {
      router.push("/checkout/dados");
      return;
    }
    router.push("/checkout/revisar");
  }

  return (
    <CheckoutShell title="Qual é a melhor forma de pagamento para você?" backHref="/agendar" backLabel="Alterar retirada">
      <div className="card space-y-4">
        <p className="rounded-lg bg-nutrir-emerald/5 p-3 text-sm text-nutrir-emerald/80">
          A produção só começa após a confirmação do pagamento.
        </p>
        <p className="text-sm font-semibold text-nutrir-emerald">Forma de pagamento</p>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMethod(option.id)}
              className={`relative rounded-xl border-2 px-3 py-3 text-left transition sm:px-4 sm:py-4 ${
                method === option.id
                  ? "border-nutrir-emerald bg-nutrir-emerald/10 text-nutrir-emerald"
                  : "border-nutrir-burgundy/30 bg-nutrir-nude hover:border-nutrir-burgundy"
              }`}
            >
              {option.badge && (
                <span className="absolute right-3 top-3 text-[10px] font-bold uppercase tracking-wide text-green-500">
                  {option.badge}
                </span>
              )}
              <span className="block font-bold">{option.label}</span>
              <span className="mt-1 block text-xs opacity-70">{option.hint}</span>
            </button>
          ))}
        </div>

        {isLocalPayment(method) && (
          <div className="flex gap-3 rounded-lg border-2 border-amber-400/80 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-500/50 dark:bg-amber-950/30 dark:text-amber-100">
            <FiAlertTriangle className="mt-0.5 shrink-0 text-lg text-amber-600 dark:text-amber-400" aria-hidden />
            <p>{LOCAL_PAYMENT_NOTICE}</p>
          </div>
        )}

        <button type="button" onClick={handleContinue} className="btn-primary w-full py-3.5">
          Continuar
        </button>
      </div>
    </CheckoutShell>
  );
}
