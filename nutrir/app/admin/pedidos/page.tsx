"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/api";
import { adminNutrirApi } from "@/lib/admin-api";
import { formatOrderLabel } from "@/lib/order-id";
import { PAYMENT_METHOD_SHORT_LABELS } from "@/lib/payment-labels";
import { useRequireAdmin } from "@/lib/use-require-admin";
import type { AdminOrderRow } from "@/lib/supabase-db";
import type { OrderStatus } from "@/lib/types";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  delivered: "Entregue",
};

const STATUS_OPTIONS: OrderStatus[] = ["pending", "paid", "delivered"];

function statusBadgeClass(status: OrderStatus): string {
  if (status === "delivered") return "bg-nutrir-emerald/15 text-nutrir-emerald";
  if (status === "paid") return "bg-nutrir-burgundy/15 text-nutrir-burgundy";
  return "bg-amber-100 text-amber-800";
}

export default function AdminPedidosPage() {
  const { ready, session } = useRequireAdmin();
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError("");
    try {
      const { orders: rows } = await adminNutrirApi.listOrders(session.access_token);
      setOrders(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    if (!session?.access_token) return;
    setUpdatingId(orderId);
    setError("");
    try {
      const { order: updated } = await adminNutrirApi.updateOrderStatus(
        session.access_token,
        orderId,
        status
      );
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar status.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-nutrir-emerald">Pedidos</h1>
        <button type="button" onClick={load} className="btn-secondary px-4 py-2 text-sm">
          Atualizar
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-nutrir-emerald/60">Carregando…</p>}

      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="card space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-nutrir-emerald">{formatOrderLabel(order.id)}</span>
                <span className="ml-2 text-sm text-nutrir-emerald/70">{order.customer_name}</span>
                <span className="ml-2 text-sm text-nutrir-emerald/50">{order.customer_phone}</span>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusBadgeClass(order.status)}`}>
                {STATUS_LABELS[order.status]}
              </span>
            </div>

            <p className="text-sm text-nutrir-emerald/70">
              {order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-nutrir-emerald/80">
              <span>{PAYMENT_METHOD_SHORT_LABELS[order.payment_method ?? "pix"]}</span>
              <span className="font-semibold">{formatPrice(order.total_cents)}</span>
              <span>{order.fulfillment_type === "delivery" ? "Entrega" : "Retirada"}: {order.pickup_display}</span>
              {order.coupon_code && (
                <span>
                  Cupom {order.coupon_code}
                  {order.partner_name ? ` (${order.partner_name})` : ""}
                </span>
              )}
            </div>

            {order.fulfillment_type === "delivery" && (
              <p className="text-xs text-nutrir-emerald/60">{order.delivery_address}</p>
            )}
            {order.user_notes && (
              <p className="text-xs italic text-nutrir-emerald/60">Obs: {order.user_notes}</p>
            )}

            <div className="pt-1">
              <select
                value={order.status}
                disabled={updatingId === order.id}
                onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                className="input-field w-auto text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} disabled={STATUS_OPTIONS.indexOf(s) < STATUS_OPTIONS.indexOf(order.status)}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}

        {!loading && orders.length === 0 && (
          <p className="text-sm text-nutrir-emerald/60">Nenhum pedido encontrado.</p>
        )}
      </div>
    </div>
  );
}
