import { NextResponse } from "next/server";
import { getCoupon, validateCouponRestrictions } from "@/lib/coupons";
import { findPartnerByCouponCode, PARTNER_COUPON_PERCENT } from "@/lib/partners";
import { findPacienteByCpf, hasPriorOrdersByEmail, hasUsedCouponByEmail } from "@/lib/supabase-db";
import { verifyUserEmail } from "@/lib/session-auth";

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
  // E-mail autenticado (do token de sessão), não telefone (fácil de trocar)
  // nem campo livre do formulário — restrição de "1ª compra"/"uma vez por
  // conta" só considera "novo" quem realmente não fez pedido com esse login.
  const email = await verifyUserEmail(request);

  const [paciente, emailIsNew, usedByEmail] = await Promise.all([
    cpf ? findPacienteByCpf(cpf) : Promise.resolve(null),
    email ? hasPriorOrdersByEmail(email).then((has) => !has) : Promise.resolve(false),
    email && coupon.oncePerCustomer ? hasUsedCouponByEmail(email, code) : Promise.resolve(false),
  ]);
  const isFirstPurchase = emailIsNew;
  const alreadyUsedByCustomer = usedByEmail;

  const restrictionError = validateCouponRestrictions(coupon, {
    isPatient: !!paciente,
    isFirstPurchase,
    alreadyUsedByCustomer,
  });
  if (restrictionError) {
    return NextResponse.json({ valid: false, error: restrictionError });
  }

  return NextResponse.json({
    valid: true,
    percent: coupon.percent,
    label: coupon.label,
    freeDelivery: coupon.freeDelivery,
    spendBasedFreeDelivery: coupon.spendBasedFreeDelivery,
    progressiveDayDish: coupon.progressiveDayDish,
    flatPerComboCents: coupon.flatPerComboCents,
  });
}
