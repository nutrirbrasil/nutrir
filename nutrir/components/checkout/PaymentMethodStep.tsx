"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CheckoutShell, useCheckoutGuard } from "@/components/checkout/CheckoutShell";
import { useCheckout } from "@/lib/checkout-context";
import { hasFiscalData } from "@/lib/checkout-draft";
import { analyzeCartItems } from "@/lib/pickup-schedule";
import { normalizePaymentMethod } from "@/lib/payment-utils";
import type { PaymentMethod } from "@/lib/types";

interface PaymentOption {
  id: PaymentMethod;
  label: string;
  hint: string;
  badge?: string;
}

const ONLINE_OPTIONS: PaymentOption[] = [
  {
    id: "pix",
    label: "Pix",
    hint: "Pagamento imediato, produção imediata.",
    badge: "10% OFF",
  },
  {
    id: "card",
    label: "Cartão",
    hint: "Pagamento imediato, produção imediata.",
  },
];

const LOCAL_OPTIONS: PaymentOption[] = [
  {
    id: "local_cash",
    label: "Dinheiro",
    hint: "10% de desconto igual ao Pix",
    badge: "10% OFF",
  },
  {
    id: "local_card",
    label: "Cartão",
    hint: "Valor igual do cartão online",
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
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMethod(option.id)}
              className={`relative rounded-xl border-2 px-4 py-4 text-left transition ${
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

        {cartAnalysis.hasCombo && (
          <p className="text-sm text-nutrir-emerald/70">
            Após a confirmação, você deve efetuar o pagamento dentro de 48 horas!
          </p>
        )}

        <button type="button" onClick={handleContinue} className="btn-primary w-full py-3.5">
          Continuar
        </button>
      </div>
    </CheckoutShell>
  );
}
