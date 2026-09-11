"use client";

import { formatPrice } from "@/lib/api";
import type { CheckoutDraft } from "@/lib/checkout-draft";
import { formatItemAddonsLabel } from "@/lib/item-addons-label";
import { getCartItemImageSrc } from "@/lib/marmita-images";
import {
  computeOrderPricing,
  getItemChargeCents,
  getItemListPriceCents,
} from "@/lib/order-pricing";
import { normalizePaymentMethod } from "@/lib/payment-utils";
import { CheckoutPriceSummary } from "@/components/checkout/CheckoutPriceSummary";
import { MarmitaPhoto } from "@/components/MarmitaPhoto";
import type { OrderItem } from "@/lib/types";

function cartItemImageBg(item: OrderItem): string {
  if (
    item.section_id === "kit" ||
    item.section_id === "combo" ||
    item.item_id?.startsWith("kit-") ||
    item.menu_id?.startsWith("combo-build")
  ) {
    return "bg-nutrir-emerald";
  }
  return "bg-nutrir-burgundy";
}

export function OrderSummarySidebar({ draft }: { draft: CheckoutDraft }) {
  const method = normalizePaymentMethod(draft.payment_method);
  const couponPercent = draft.coupon_percent ?? 0;
  const pricing = computeOrderPricing(
    draft.items,
    method,
    draft.coupon_code,
    draft.delivery_fee_cents ?? 0,
    draft.coupon_code
      ? {
          percent: couponPercent,
          label: draft.coupon_label,
          freeDelivery: draft.coupon_free_delivery,
          spendBasedFreeDelivery: draft.coupon_spend_based_free_delivery,
          progressiveDayDish: draft.coupon_progressive_day_dish,
          flatPerComboCents: draft.coupon_flat_per_combo_cents,
        }
      : null,
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

          const imageSrc = getCartItemImageSrc(item);

          return (
            <li key={`${item.name}-${i}`} className="flex gap-3 text-sm">
              <div
                className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg ${cartItemImageBg(item)}`}
              >
                {imageSrc && (
                  <MarmitaPhoto src={imageSrc} alt={item.name} className="h-full w-full" sizes="48px" />
                )}
              </div>
              <span className="flex-1 text-nutrir-emerald">
                {item.quantity}x {item.name}
                <span className="mt-0.5 block text-xs text-nutrir-emerald/55">
                  {formatItemAddonsLabel(item)}
                </span>
              </span>
              <span className="shrink-0 text-right">
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
