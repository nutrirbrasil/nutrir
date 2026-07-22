"use client";

import { formatPrice } from "@/lib/api";
import type { OrderPricing } from "@/lib/order-pricing";
import type { PaymentMethod } from "@/lib/types";

interface Props {
  pricing: OrderPricing;
  method?: PaymentMethod;
  compact?: boolean;
}

export function CheckoutPriceSummary({ pricing, method, compact = false }: Props) {
  const discountLabel =
    method === "local_cash" ? "Desconto Dinheiro" : "Desconto Pix";

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {!compact && <h3 className="font-bold text-nutrir-emerald">Resumo da compra</h3>}

      {pricing.show_pix_discount ? (
        <>
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatPrice(pricing.subtotal_cents)}</span>
          </div>
          <div className="flex justify-between text-sm text-nutrir-emerald/75">
            <span>{discountLabel}</span>
            <span>− {formatPrice(pricing.pix_discount_cents)}</span>
          </div>
        </>
      ) : (
        (!compact || pricing.show_coupon_discount) && (
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatPrice(pricing.subtotal_cents)}</span>
          </div>
        )
      )}

      {pricing.show_coupon_discount && (
        <div className="flex justify-between text-sm text-nutrir-emerald/75">
          <span>Cupom {pricing.coupon_code}</span>
          <span>− {formatPrice(pricing.coupon_discount_cents)}</span>
        </div>
      )}

      {pricing.show_points_discount && (
        <div className="flex justify-between text-sm text-nutrir-emerald/75">
          <span>Pontos</span>
          <span>− {formatPrice(pricing.points_discount_cents)}</span>
        </div>
      )}

      {pricing.delivery_fee_cents > 0 && (
        <div className="flex justify-between text-sm">
          <span>Taxa de entrega</span>
          <span>{formatPrice(pricing.delivery_fee_cents)}</span>
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
