"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/api";
import { adminNutrirApi } from "@/lib/admin-api";
import { formatOrderLabel } from "@/lib/order-id";
import { getOrderAddonsLines, getOrderMealCount } from "@/lib/order-item-display";
import { getOrderItemPricingBreakdown } from "@/lib/order-pricing";
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

type StatusFilter = OrderStatus | "all";

const FILTER_TABS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "pending", label: "Pendentes" },
  { id: "paid", label: "Pagos" },
  { id: "delivered", label: "Entregues" },
];

function statusBadgeClass(status: OrderStatus): string {
  if (status === "delivered") return "bg-nutrir-emerald/15 text-nutrir-emerald";
  if (status === "paid") return "bg-nutrir-burgundy/15 text-nutrir-burgundy";
  return "bg-amber-100 text-amber-800";
}

function formatOrderDateTime(iso: string): string {
  const date = new Date(iso);
  const d = date.toLocaleDateString("pt-BR");
  const t = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${d} · ${t}`;
}

function formatShortDate(iso: string): string {
  // delivery_date vem como "AAAA-MM-DD"; monta local pra não perder um dia por fuso.
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
      <span className="font-bold uppercase tracking-wide text-nutrir-emerald/55 text-[11px]">
        {label}:
      </span>
      <span className="text-nutrir-emerald">{value}</span>
    </div>
  );
}

function OrderCard({
  order,
  updating,
  onStatusChange,
}: {
  order: AdminOrderRow;
  updating: boolean;
  onStatusChange: (status: OrderStatus) => void;
}) {
  const isDelivery = order.fulfillment_type === "delivery";
  const mealCount = getOrderMealCount(order.items);
  const addonsLines = getOrderAddonsLines(order.items);
  const pricingByItem = getOrderItemPricingBreakdown(
    order.items,
    order.payment_method,
    order.coupon_discount_cents ?? 0
  );

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="font-display text-lg font-bold text-nutrir-emerald">
            {formatOrderLabel(order.id)}
          </span>
          <span className="ml-2 text-sm text-nutrir-emerald/60">
            {formatOrderDateTime(order.created_at)}
          </span>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusBadgeClass(order.status)}`}
        >
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      <div>
        <p className="font-semibold text-nutrir-emerald">
          {order.customer_name}{" "}
          <span className="font-normal text-nutrir-emerald/55">({order.customer_phone})</span>
        </p>
        {order.is_patient && (
          <p className="mt-0.5 text-sm font-semibold text-amber-700">
            ★ Este cliente é paciente!
          </p>
        )}
      </div>

      <div className="rounded-xl border border-nutrir-hairline bg-nutrir-cream/60 p-3">
        <ul className="space-y-1.5 text-sm text-nutrir-emerald">
          {order.items.map((item, i) => {
            const { paidCents, discountCents } = pricingByItem[i];
            return (
              <li key={i} className="flex items-baseline justify-between gap-3">
                <span className="flex gap-1.5">
                  <span className="text-nutrir-emerald/40">•</span>
                  <span>
                    {item.quantity}× {item.name}
                  </span>
                </span>
                <span className="shrink-0 whitespace-nowrap text-right">
                  <span className="font-semibold">{formatPrice(paidCents)}</span>
                  {discountCents > 0 && (
                    <span className="ml-1 text-xs text-nutrir-burgundy/75">
                      (−{formatPrice(discountCents)})
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 border-t border-nutrir-hairline pt-2 text-xs font-semibold text-nutrir-emerald/70">
          <span>Total de produtos: {order.items.length}</span>
          <span>Total de marmitas: {mealCount}</span>
        </div>
      </div>

      {addonsLines.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-nutrir-emerald/55">
            Adicionais
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-nutrir-emerald/80">
            {addonsLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        <InfoRow
          label="Pagamento"
          value={PAYMENT_METHOD_SHORT_LABELS[order.payment_method ?? "pix"]}
        />
        <InfoRow label="Valor" value={<strong>{formatPrice(order.total_cents)}</strong>} />
        {order.coupon_code && (
          <InfoRow
            label="Cupom"
            value={`${order.coupon_code}${order.partner_name ? ` (${order.partner_name})` : ""}${
              order.coupon_discount_cents
                ? ` (−${formatPrice(order.coupon_discount_cents)})`
                : ""
            }`}
          />
        )}
        {isDelivery ? (
          <>
            <InfoRow label="Entrega" value={formatShortDate(order.delivery_date)} />
            {!!order.delivery_fee_cents && (
              <InfoRow label="Taxa de entrega" value={formatPrice(order.delivery_fee_cents)} />
            )}
          </>
        ) : (
          <InfoRow label="Retirada" value={order.pickup_display ?? formatShortDate(order.delivery_date)} />
        )}
      </div>

      {isDelivery && order.delivery_address && (
        <p className="text-sm text-nutrir-emerald/70">
          <span className="text-[11px] font-bold uppercase tracking-wide text-nutrir-emerald/55">
            Endereço:{" "}
          </span>
          {order.delivery_address}
        </p>
      )}

      {order.user_notes && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm italic text-amber-900">
          Obs: {order.user_notes}
        </p>
      )}

      <div className="pt-1">
        <select
          value={order.status}
          disabled={updating}
          onChange={(e) => onStatusChange(e.target.value as OrderStatus)}
          className="input-field w-auto text-sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <option
              key={s}
              value={s}
              disabled={STATUS_OPTIONS.indexOf(s) < STATUS_OPTIONS.indexOf(order.status)}
            >
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function AdminPedidosPage() {
  const { ready, session } = useRequireAdmin();
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError("");
    try {
      const { orders: rows } = await adminNutrirApi.listOrders(
        session.access_token,
        filter === "all" ? undefined : filter
      );
      setOrders(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, filter]);

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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-nutrir-emerald">Pedidos</h1>
        <button type="button" onClick={load} className="btn-secondary px-4 py-2 text-sm">
          Atualizar
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
              filter === tab.id
                ? "bg-nutrir-burgundy text-nutrir-nude"
                : "bg-nutrir-emerald/10 text-nutrir-emerald hover:bg-nutrir-emerald/20"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-nutrir-emerald/60">Carregando…</p>}

      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            updating={updatingId === order.id}
            onStatusChange={(status) => handleStatusChange(order.id, status)}
          />
        ))}

        {!loading && orders.length === 0 && (
          <p className="text-sm text-nutrir-emerald/60">Nenhum pedido encontrado.</p>
        )}
      </div>
    </div>
  );
}
