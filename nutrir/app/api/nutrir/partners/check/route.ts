import { NextResponse } from "next/server";
import { verifyUserEmail } from "@/lib/session-auth";
import { findPartnerByEmail } from "@/lib/partners";

// Resolve sempre pela sessão verificada (Bearer token), nunca por e-mail/CPF
// enviado solto — o saldo em R$ é dado sensível, diferente do simples
// booleano de /api/nutrir/pacientes/check.
export async function GET(request: Request) {
  const email = await verifyUserEmail(request);
  if (!email) {
    return NextResponse.json({ isPartner: false });
  }

  const partner = await findPartnerByEmail(email);
  if (!partner) {
    return NextResponse.json({ isPartner: false });
  }

  return NextResponse.json({
    isPartner: true,
    name: partner.name,
    couponCode: partner.coupon_code,
    pointsBalanceCents: partner.points_balance_cents,
  });
}
