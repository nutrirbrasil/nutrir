"use client";

import { formatPrice } from "@/lib/api";
import type { CheckoutDraft } from "@/lib/checkout-draft";
import { formatItemAddonsLabel } from "@/lib/item-addons-label";
import {
  computeCheckoutDisplayPricing,
  getCheckoutLineItemCents,
} from "@/lib/order-pricing";
import { normalizePaymentMethod } from "@/lib/payment-utils";
import { CheckoutPriceSummary } from "@/components/checkout/CheckoutPriceSummary";

export function OrderSummarySidebar({ draft }: { draft: CheckoutDraft }) {
  const method = normalizePaymentMethod(draft.payment_method);
  const pricing = computeCheckoutDisplayPricing(draft.items, method, draft.coupon_code);

  return (
    <aside className="card sticky top-4">
      <h2 className="font-display text-lg font-bold text-nutrir-emerald">
        Sua sacola tem{" "}
        <span className="text-nutrir-burgundy">
          {draft.items.reduce((s, i) => s + i.quantity, 0)} itens
        </span>
      </h2>
      <ul className="mt-4 space-y-3">
        {draft.items.map((item, i) => (
          <li key={`${item.name}-${i}`} className="flex justify-between gap-3 text-sm">
            <span className="flex-1 text-nutrir-emerald">
              {item.name}
              <span className="mt-0.5 block text-xs text-nutrir-emerald/55">
                {formatItemAddonsLabel(item)}
              </span>
            </span>
            <span className="font-semibold text-nutrir-burgundy">
              {formatPrice(getCheckoutLineItemCents(item, method) * item.quantity)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-nutrir-nude-dark/40 pt-3">
        <CheckoutPriceSummary pricing={pricing} method={method} compact />
      </div>
    </aside>
  );
}
