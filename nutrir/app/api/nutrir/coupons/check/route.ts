import { NextResponse } from "next/server";
import { getCoupon, validateCouponRestrictions } from "@/lib/coupons";
import { findPartnerByCouponCode, PARTNER_COUPON_PERCENT } from "@/lib/partners";
import { findPacienteByCpf, hasPriorOrdersByPhone } from "@/lib/supabase-db";

// Sem isso o Next cacheia a resposta estaticamente (a rota nao usa nada
// "dinamico" aos olhos dele) e restricoes que dependem de CPF/telefone na
// query string ficam presas na primeira resposta gerada.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim();
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
  if (!coupon) {
    return NextResponse.json({ valid: false });
  }

  const cpf = url.searchParams.get("cpf")?.trim() || null;
  const phone = url.searchParams.get("phone")?.trim() || null;

  const [paciente, isFirstPurchase] = await Promise.all([
    cpf ? findPacienteByCpf(cpf) : Promise.resolve(null),
    phone ? hasPriorOrdersByPhone(phone).then((has) => !has) : Promise.resolve(false),
  ]);

  const restrictionError = validateCouponRestrictions(coupon, {
    cpf,
    isPatient: !!paciente,
    isFirstPurchase,
  });
  if (restrictionError) {
    return NextResponse.json({ valid: false, error: restrictionError });
  }

  return NextResponse.json({ valid: true, percent: coupon.percent, label: coupon.label });
}
