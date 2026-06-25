export interface CouponDefinition {
  /** Percentual de desconto (0–100) sobre a base informada no checkout. */
  percent: number;
  label?: string;
}

const COUPONS: Record<string, CouponDefinition> = {
  ZEEDO5: { percent: 5, label: "5% DE DESCONTO" },
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

export function computeCouponDiscountCents(baseCents: number, coupon: CouponDefinition): number {
  if (baseCents <= 0 || coupon.percent <= 0) return 0;
  return Math.round((baseCents * coupon.percent) / 100);
}
