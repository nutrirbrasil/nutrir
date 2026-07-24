"use client";

import Link from "next/link";
import { useEffect } from "react";
import { OrderForm } from "@/components/OrderForm";
import { useCart } from "@/lib/cart-context";
import { useCheckout } from "@/lib/checkout-context";
import { useRequireLogin } from "@/lib/use-require-login";

export default function AgendarPage() {
  const { items, replaceItems } = useCart();
  const { draft, hydrated } = useCheckout();
  const { ready: authReady } = useRequireLogin();

  useEffect(() => {
    if (!hydrated || items.length > 0 || !draft?.items.length) return;
    replaceItems(draft.items);
  }, [hydrated, items.length, draft?.items, replaceItems]);

  const hasItems = items.length > 0 || (hydrated && (draft?.items.length ?? 0) > 0);

  if (!authReady) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center text-nutrir-emerald/70">
        Carregando…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 text-center">
        <p className="eyebrow text-nutrir-burgundy/70">Nutrir · Seu pedido</p>
        <h1 className="section-title mt-2">Agendar retirada</h1>
        <p className="mt-2 text-sm text-nutrir-emerald/70">
          Escolha a data e confirme seus dados para retirar na Nutrir.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-nutrir-burgundy hover:underline">
          ← Voltar ao cardápio
        </Link>
      </div>
      {!hasItems ? (
        <div className="card text-center">
          <p className="text-nutrir-emerald/70">Sua sacola está vazia.</p>
          <Link href="/" className="btn-primary mt-4 inline-block">
            Ver cardápio
          </Link>
        </div>
      ) : (
        <OrderForm />
      )}
    </div>
  );
}
