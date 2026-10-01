import { NextResponse } from "next/server";
import { getCoupon, validateCouponRestrictions } from "@/lib/coupons";
import { findPartnerByCouponCode, PARTNER_COUPON_PERCENT } from "@/lib/partners";
import {
  findPacienteByCpf,
  hasPriorOrdersByEmail,
  hasPriorOrdersByPhone,
  hasUsedCouponByEmail,
  hasUsedCouponByPhone,
} from "@/lib/supabase-db";
import { verifyUser } from "@/lib/session-auth";

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
  // Identidade autenticada (e-mail ou telefone da sessão), não campo livre do
  // formulário — restrição de "1ª compra"/"uma vez por conta" só considera
  // "novo" quem realmente não fez pedido com esse login. Conta pode ter sido
  // criada só com telefone (sem e-mail), então aceita os dois.
  const authUser = await verifyUser(request);
  const email = authUser?.email ?? null;
  const phone = authUser?.phone ?? null;

  const [paciente, hasPriorOrders, alreadyUsedByCustomer] = await Promise.all([
    cpf ? findPacienteByCpf(cpf) : Promise.resolve(null),
    email ? hasPriorOrdersByEmail(email) : phone ? hasPriorOrdersByPhone(phone) : Promise.resolve(false),
    !coupon.oncePerCustomer
      ? Promise.resolve(false)
      : email
        ? hasUsedCouponByEmail(email, code)
        : phone
          ? hasUsedCouponByPhone(phone, code)
          : Promise.resolve(false),
  ]);
  const isFirstPurchase = !hasPriorOrders;

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
