import { NextResponse } from "next/server";
import { getCoupon } from "@/lib/coupons";
import { findPartnerByCouponCode, PARTNER_COUPON_PERCENT } from "@/lib/partners";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ valid: false });
  }

  const partner = await findPartnerByCouponCode(code);
  if (partner) {
    return NextResponse.json({
      valid: true,
      percent: PARTNER_COUPON_PERCENT,
      label: `${PARTNER_COUPON_PERCENT}% DE DESCONTO`,
    });
  }

  const coupon = getCoupon(code);
  if (coupon) {
    return NextResponse.json({ valid: true, percent: coupon.percent, label: coupon.label });
  }

  return NextResponse.json({ valid: false });
}
