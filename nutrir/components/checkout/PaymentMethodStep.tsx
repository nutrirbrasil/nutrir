"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckoutShell, useCheckoutGuard } from "@/components/checkout/CheckoutShell";
import { useCheckout } from "@/lib/checkout-context";
import { hasFiscalData } from "@/lib/checkout-draft";
import type { PaymentMethod } from "@/lib/types";

const OPTIONS: { id: PaymentMethod; label: string; hint: string }[] = [
  {
    id: "pix",
    label: "Pix",
    hint: "Pagamento online · produção após confirmação",
  },
  {
    id: "card",
    label: "Cartão",
    hint: "Pagamento online · produção após confirmação",
  },
  {
    id: "local",
    label: "Pagamento no local",
    hint: "Dinheiro ou cartão · até 48h para pagar",
  },
];

export function PaymentMethodStep() {
  const router = useRouter();
  const { patchDraft } = useCheckout();
  const { draft, ready } = useCheckoutGuard();
  const [method, setMethod] = useState<PaymentMethod>(draft?.payment_method ?? "pix");

  if (!ready || !draft) return null;

  function handleContinue() {
    const next = { ...draft!, payment_method: method };
    patchDraft({ payment_method: method });

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
          {OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMethod(option.id)}
              className={`rounded-xl border-2 px-4 py-4 text-left transition ${
                method === option.id
                  ? "border-nutrir-emerald bg-nutrir-emerald/10 text-nutrir-emerald"
                  : "border-nutrir-burgundy/30 bg-nutrir-nude hover:border-nutrir-burgundy"
              }`}
            >
              <span className="block font-bold">{option.label}</span>
              <span className="mt-1 block text-xs opacity-70">{option.hint}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={handleContinue} className="btn-primary w-full py-3.5">
          Continuar
        </button>
      </div>
    </CheckoutShell>
  );
}
