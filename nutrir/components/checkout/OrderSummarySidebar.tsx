"use client";

import { formatPrice } from "@/lib/api";
import type { CheckoutDraft } from "@/lib/checkout-draft";
import { draftTotalCents } from "@/lib/checkout-draft";

export function OrderSummarySidebar({ draft }: { draft: CheckoutDraft }) {
  const total = draftTotalCents(draft);

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
            <span className="flex-1 text-nutrir-emerald">{item.name}</span>
            <span className="font-semibold text-nutrir-burgundy">
              {formatPrice(item.price_cents * item.quantity)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-nutrir-nude-dark/40 pt-3">
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span className="text-nutrir-burgundy">{formatPrice(total)}</span>
        </div>
      </div>
    </aside>
  );
}
