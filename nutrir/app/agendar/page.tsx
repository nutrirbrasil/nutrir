"use client";

import Link from "next/link";
import { OrderForm } from "@/components/OrderForm";
import { useCart } from "@/lib/cart-context";

export default function AgendarPage() {
  const { items } = useCart();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="section-title">Agendar retirada</h1>
        <p className="mt-2 text-sm text-nutrir-emerald/70">
          Escolha a data e confirme seus dados para retirar na Nutrir.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-nutrir-burgundy hover:underline">
          ← Voltar ao cardápio
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="card text-center">
          <p className="text-nutrir-emerald/70">Sua sacola está vazia.</p>
          <Link href="/" className="btn-primary mt-4 inline-block">
            Ver cardápio
          </Link>
        </div>
      ) : (
        <OrderForm mode="pickup" />
      )}
    </div>
  );
}
