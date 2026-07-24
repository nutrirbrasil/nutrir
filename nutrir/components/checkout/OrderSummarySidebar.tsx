"use client";

import { formatPrice } from "@/lib/api";
import type { CheckoutDraft } from "@/lib/checkout-draft";
import { formatItemAddonsLabel } from "@/lib/item-addons-label";
import {
  computeOrderPricing,
  getItemChargeCents,
  getItemListPriceCents,
} from "@/lib/order-pricing";
import { normalizePaymentMethod } from "@/lib/payment-utils";
import { CheckoutPriceSummary } from "@/components/checkout/CheckoutPriceSummary";

export function OrderSummarySidebar({ draft }: { draft: CheckoutDraft }) {
  const method = normalizePaymentMethod(draft.payment_method);
  const couponPercent = draft.coupon_percent ?? 0;
  const pricing = computeOrderPricing(
    draft.items,
    method,
    draft.coupon_code,
    draft.delivery_fee_cents ?? 0,
    couponPercent ? { percent: couponPercent, label: draft.coupon_label } : null,
    draft.points_redeemed_cents ?? 0
  );

  return (
    <aside className="card sticky top-4">
      <h2 className="font-display text-lg font-bold text-nutrir-emerald">
        Sua sacola tem{" "}
        <span className="text-nutrir-burgundy">
          {draft.items.reduce((s, i) => s + i.quantity, 0)} itens
        </span>
      </h2>
      <ul className="mt-4 space-y-3">
        {draft.items.map((item, i) => {
          // Preço "de" (cartão/lista) vs valor efetivo já com desconto de
          // pagamento (pix/dinheiro) e a fatia proporcional do cupom, pra dar
          // visibilidade de quanto cada item realmente rendeu pro caixa.
          const listCents = getItemListPriceCents(item) * item.quantity;
          const chargeCents = getItemChargeCents(item, method) * item.quantity;
          const couponCut = couponPercent
            ? Math.round((chargeCents * couponPercent) / 100)
            : 0;
          const finalCents = Math.max(0, chargeCents - couponCut);
          const hasDiscount = listCents > finalCents;

          return (
            <li key={`${item.name}-${i}`} className="flex justify-between gap-3 text-sm">
              <span className="flex-1 text-nutrir-emerald">
                {item.name}
                <span className="mt-0.5 block text-xs text-nutrir-emerald/55">
                  {formatItemAddonsLabel(item)}
                </span>
              </span>
              <span className="text-right">
                {hasDiscount && (
                  <span className="block text-xs text-nutrir-emerald/45 line-through">
                    {formatPrice(listCents)}
                  </span>
                )}
                <span className="font-semibold text-nutrir-burgundy">
                  {formatPrice(finalCents)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 border-t border-nutrir-nude-dark/40 pt-3">
        <CheckoutPriceSummary pricing={pricing} method={method} compact />
      </div>
    </aside>
  );
}
