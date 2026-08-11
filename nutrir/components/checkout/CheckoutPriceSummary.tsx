"use client";

import { formatPrice } from "@/lib/api";
import type { OrderPricing } from "@/lib/order-pricing";
import type { PaymentMethod } from "@/lib/types";

interface Props {
  pricing: OrderPricing;
  method?: PaymentMethod;
  compact?: boolean;
}

/** "10" -> "10%", "7.5" -> "7,5%" (sem casa decimal quando é inteiro). */
function formatPercent(pct: number): string {
  const rounded = Math.round(pct * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
  return `${text}%`;
}

/** Arredonda pra cima até o 0,5 mais próximo (6,1 -> 6,5; 5,6 -> 6) — só pro rótulo do desconto extra, o valor em R$ continua exato. */
function roundUpToHalf(pct: number): number {
  return Math.ceil(pct * 2) / 2;
}

const BASE_DISCOUNT_PERCENT = 10;

export function CheckoutPriceSummary({ pricing, method, compact = false }: Props) {
  const discountLabel =
    method === "local_cash" ? "Desconto Dinheiro" : "Desconto Pix";

  // Sempre que o desconto passar de 10%, destrincha em "base" (10%, o que o
  // cliente já espera) + "extra especial" (o resto) — mesmo valor final, só
  // exibido em duas linhas pra reforçar que ele ganhou mais que o normal.
  const discountPercent =
    pricing.subtotal_cents > 0 ? (pricing.pix_discount_cents / pricing.subtotal_cents) * 100 : 0;
  const hasExtraDiscount = discountPercent > BASE_DISCOUNT_PERCENT + 0.05;
  const baseDiscountCents = hasExtraDiscount
    ? Math.round((pricing.subtotal_cents * BASE_DISCOUNT_PERCENT) / 100)
    : pricing.pix_discount_cents;
  const extraDiscountCents = pricing.pix_discount_cents - baseDiscountCents;
  const extraDiscountPercent = roundUpToHalf(discountPercent - BASE_DISCOUNT_PERCENT);

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {!compact && <h3 className="font-bold text-nutrir-emerald">Resumo da compra</h3>}

      {(!compact || pricing.show_coupon_discount || pricing.show_pix_discount) && (
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>{formatPrice(pricing.subtotal_cents)}</span>
        </div>
      )}

      {pricing.delivery_fee_cents > 0 && (
        <div className="flex justify-between text-sm">
          <span>Taxa de entrega</span>
          <span>{formatPrice(pricing.delivery_fee_cents)}</span>
        </div>
      )}

      {pricing.show_pix_discount &&
        (hasExtraDiscount ? (
          <>
            <div className="flex justify-between text-sm text-nutrir-emerald/75">
              <span>
                {discountLabel} ({formatPercent(BASE_DISCOUNT_PERCENT)})
              </span>
              <span>− {formatPrice(baseDiscountCents)}</span>
            </div>
            <div className="flex justify-between text-sm text-nutrir-burgundy">
              <span>Desconto Extra Especial ({formatPercent(extraDiscountPercent)})</span>
              <span>− {formatPrice(extraDiscountCents)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-sm text-nutrir-emerald/75">
            <span>
              {discountLabel}
              {discountPercent >= BASE_DISCOUNT_PERCENT - 0.05
                ? ` (${formatPercent(discountPercent)})`
                : ""}
            </span>
            <span>− {formatPrice(pricing.pix_discount_cents)}</span>
          </div>
        ))}

      {pricing.show_coupon_discount && (
        <div className="flex justify-between text-sm text-nutrir-emerald/75">
          <span>
            Cupom {pricing.coupon_code}
            {pricing.coupon_percent ? ` (${formatPercent(pricing.coupon_percent)})` : ""}
          </span>
          <span>− {formatPrice(pricing.coupon_discount_cents)}</span>
        </div>
      )}

      {pricing.show_points_discount && (
        <div className="flex justify-between text-sm text-nutrir-emerald/75">
          <span>Pontos</span>
          <span>− {formatPrice(pricing.points_discount_cents)}</span>
        </div>
      )}

      <div
        className={`flex justify-between font-bold ${
          compact ? "text-sm" : "border-t border-nutrir-nude-dark/40 pt-3 text-lg"
        }`}
      >
        <span>Total</span>
        <span className="text-nutrir-burgundy">{formatPrice(pricing.total_cents)}</span>
      </div>
    </div>
  );
}
