"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckoutShell } from "@/components/checkout/CheckoutShell";
import { nutrirApi } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { useCheckout } from "@/lib/checkout-context";
import { saveOrderToHistory } from "@/lib/order-history";

export function CheckoutSuccessStep() {
  const searchParams = useSearchParams();
  const cart = useCart();
  const { resetCheckout } = useCheckout();
  const orderId = searchParams.get("order");
  const [status, setStatus] = useState<"loading" | "confirmed" | "pending">("loading");

  useEffect(() => {
    if (!orderId) {
      setStatus("confirmed");
      return;
    }

    const transactionNsu = searchParams.get("transaction_nsu") ?? undefined;
    const slug =
      searchParams.get("slug") ?? searchParams.get("invoice_slug") ?? undefined;

    const id = orderId;

    async function load() {
      try {
        if (transactionNsu || slug) {
          await nutrirApi.verifyOrderPayment({
            order_id: id,
            transaction_nsu: transactionNsu,
            slug,
          });
        }

        const { order } = await nutrirApi.getOrder(id);
        if (order.payment_status === "confirmed") {
          saveOrderToHistory({
            id: order.id,
            customer_phone: order.customer_phone,
            customer_name: order.customer_name,
            created_at: order.created_at,
            items: order.items,
            total_cents: order.total_cents,
            payment_method: order.payment_method,
            pickup_display: order.pickup_display ?? "",
            notes: order.user_notes,
          });
          cart.clearCart();
          resetCheckout();
          setStatus("confirmed");
          return;
        }

        setStatus("pending");
      } catch {
        setStatus("pending");
      }
    }

    load();
  }, [orderId, searchParams, cart, resetCheckout]);

  if (status === "loading") {
    return (
      <CheckoutShell title="Confirmando pagamento…">
        <div className="card text-center">
          <p className="text-nutrir-emerald/70">Aguarde enquanto verificamos seu pagamento.</p>
        </div>
      </CheckoutShell>
    );
  }

  if (status === "pending") {
    return (
      <CheckoutShell title="Pagamento pendente">
        <div className="card text-center">
          <p className="text-4xl">⏳</p>
          <h2 className="mt-4 font-display text-xl font-bold text-nutrir-emerald">
            Ainda não confirmamos o pagamento
          </h2>
          <p className="mt-2 text-nutrir-emerald/70">
            {orderId
              ? `Pedido ${orderId.replace("order-", "#")} — se você já pagou, aguarde alguns instantes.`
              : "Se você já pagou, aguarde alguns instantes."}
          </p>
          <Link href="/checkout/revisar" className="btn-primary mt-6 inline-block">
            Voltar ao checkout
          </Link>
        </div>
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell title="Pedido confirmado!">
      <div className="card text-center">
        <p className="text-4xl">✅</p>
        <h2 className="mt-4 font-display text-xl font-bold text-nutrir-emerald">
          Pagamento confirmado!
        </h2>
        <p className="mt-2 text-nutrir-emerald/70">
          {orderId
            ? `Pedido ${orderId.replace("order-", "#")} confirmado.`
            : "Seu pedido foi registrado."}
        </p>
        <p className="mt-2 text-sm text-nutrir-emerald/60">
          Em breve começaremos a produção e entraremos em contato para confirmar a retirada.
        </p>
        <Link href="/" className="btn-primary mt-6 inline-block">
          Voltar ao cardápio
        </Link>
      </div>
    </CheckoutShell>
  );
}
