"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { nutrirApi, formatPrice } from "@/lib/api";
import { formatOrderLabel } from "@/lib/order-id";
import { getWhatsAppUrl } from "@/lib/payment-utils";
import type { Order } from "@/lib/types";

function EstoqueObrigadoContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) return;
    nutrirApi
      .getOrder(orderId)
      .then((r) => setOrder(r.order))
      .catch(() => setError("Não foi possível carregar o pedido."));
  }, [orderId]);

  if (!orderId) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-nutrir-emerald/70">Pedido não encontrado.</p>
        <Link href="/estoque" className="btn-primary mt-4 inline-block">
          Voltar ao estoque
        </Link>
      </div>
    );
  }

  const label = formatOrderLabel(orderId);
  const message = `Olá! Fiz a reserva de pronta entrega ${label} e gostaria de receber atualizações.`;

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-4xl">🎉</p>
      <h1 className="mt-3 font-display text-2xl font-bold text-nutrir-emerald">Reserva confirmada!</h1>
      <p className="mt-2 text-sm text-nutrir-emerald/70">
        Pedido {label}
        {order ? ` · ${formatPrice(order.total_cents)}` : ""}
      </p>
      {order?.pickup_display && (
        <p className="mt-3 text-sm font-semibold text-nutrir-burgundy">{order.pickup_display}</p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-3">
        <a href={getWhatsAppUrl(message)} target="_blank" rel="noopener noreferrer" className="btn-primary block py-3">
          Falar no WhatsApp
        </a>
        <Link href="/estoque" className="btn-secondary block py-3">
          Voltar ao estoque
        </Link>
      </div>
    </div>
  );
}

export default function EstoqueObrigadoPage() {
  return (
    <Suspense>
      <EstoqueObrigadoContent />
    </Suspense>
  );
}
