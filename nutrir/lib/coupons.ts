export interface CouponDefinition {
  /** Percentual de desconto sobre o subtotal (0–100). */
  percent: number;
  label?: string;
}

const COUPONS: Record<string, CouponDefinition> = {
  ZEEDO5: { percent: 5, label: "5% no subtotal" },
};

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export function getCoupon(code?: string | null): CouponDefinition | null {
  if (!code?.trim()) return null;
  return COUPONS[normalizeCouponCode(code)] ?? null;
}

export function isValidCouponCode(code: string): boolean {
  return getCoupon(code) !== null;
}

export function computeCouponDiscountCents(subtotalCents: number, coupon: CouponDefinition): number {
  if (subtotalCents <= 0 || coupon.percent <= 0) return 0;
  return Math.round((subtotalCents * coupon.percent) / 100);
}
