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

  // Cupom tipo ENTREGA: o desconto no frete é sempre 0%, 50% ou 100% (nunca
  // intermediário, ver computeSpendBasedFreeDeliveryCents), então dá pra saber
  // exatamente qual marco foi batido só olhando quais shortfalls sumiram.
  const isSpendBasedDelivery = typeof pricing.free_delivery_progress_fraction === "number";
  const hasDeliveryFee = pricing.delivery_fee_cents > 0;
  const achievedFreeDelivery =
    isSpendBasedDelivery && hasDeliveryFee && !pricing.free_delivery_shortfall_cents;
  const achievedHalfDelivery =
    isSpendBasedDelivery &&
    hasDeliveryFee &&
    !achievedFreeDelivery &&
    !pricing.free_delivery_half_shortfall_cents;
  const freeDeliveryTierLabel = achievedFreeDelivery ? " (GRÁTIS)" : achievedHalfDelivery ? " (50%)" : "";

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
            {freeDeliveryTierLabel}
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

      {isSpendBasedDelivery &&
        hasDeliveryFee &&
        (achievedFreeDelivery ||
          !!pricing.free_delivery_half_shortfall_cents ||
          !!pricing.free_delivery_shortfall_cents) && (
          <div className="mt-3 space-y-2">
            {achievedFreeDelivery ? (
              <p className="text-sm font-bold text-nutrir-emerald">
                Parabéns! Você atingiu o valor necessário para receber Frete Grátis.
              </p>
            ) : (
              <p className="text-sm text-nutrir-emerald">
                Adicione mais{" "}
                <strong className="font-bold text-nutrir-burgundy">
                  {formatPrice(
                    pricing.free_delivery_half_shortfall_cents ?? pricing.free_delivery_shortfall_cents ?? 0
                  )}
                </strong>{" "}
                para ganhar:{" "}
                <strong className="font-bold text-nutrir-burgundy">
                  {pricing.free_delivery_half_shortfall_cents ? "50% de desconto no frete" : "Frete Grátis"}
                </strong>
              </p>
            )}
            <div className="relative h-2 rounded-full bg-nutrir-nude-dark/40">
              <div
                className="h-2 rounded-full bg-nutrir-burgundy transition-[width]"
                style={{ width: `${Math.round((pricing.free_delivery_progress_fraction ?? 0) * 100)}%` }}
              />
              <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-nutrir-burgundy bg-white" />
              <span className="absolute right-0 top-1/2 h-4 w-4 translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-nutrir-burgundy bg-white" />
            </div>
          </div>
        )}
    </div>
  );
}
