"use client";

import { FiX } from "react-icons/fi";
import { formatPrice } from "@/lib/api";
import { getOrderItemDisplay } from "@/lib/order-item-display";
import type { SavedOrder } from "@/lib/order-history";
import { PAYMENT_METHOD_SHORT_LABELS } from "@/lib/payment-labels";

interface Props {
  order: SavedOrder;
  onClose: () => void;
}

export function OrderDetailsModal({ order, onClose }: Props) {
  const dateStr = new Date(order.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const paymentLabel =
    PAYMENT_METHOD_SHORT_LABELS[order.payment_method] ?? order.payment_method;

  return (
    <>
      <button
        type="button"
        aria-label="Fechar"
        className="fixed inset-0 z-[80] bg-black/45"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 z-[90] flex max-h-[min(90vh,640px)] w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-nutrir-cream shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-nutrir-nude-dark/40 px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-bold text-nutrir-emerald">Detalhes do pedido</h2>
            <p className="mt-1 text-sm text-nutrir-emerald/65">
              {dateStr} · {formatPrice(order.total_cents)} · {paymentLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-nutrir-emerald/20 text-nutrir-emerald/70 hover:bg-nutrir-emerald/5"
          >
            <FiX />
          </button>
        </div>

        <ul className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {order.items.map((item, index) => {
            const display = getOrderItemDisplay(item);
            return (
              <li
                key={`${order.id}-${index}`}
                className="rounded-xl border border-nutrir-nude-dark/50 bg-nutrir-nude/60 px-4 py-3"
              >
                <p className="font-display text-base font-bold text-nutrir-emerald">{display.title}</p>
                {display.lines && display.lines.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-nutrir-emerald/80">
                    {display.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
                {display.addonsNote && (
                  <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-nutrir-emerald/60">
                    {display.addonsNote}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
