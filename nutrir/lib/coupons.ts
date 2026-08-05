export interface CouponDefinition {
  /** Percentual de desconto (0–100) sobre a base informada no checkout. */
  percent: number;
  label?: string;
  /** Só vale se o cliente nunca tiver feito um pedido antes (por telefone). */
  firstPurchaseOnly?: boolean;
  /** Só vale para quem está cadastrado como paciente (ver findPacienteByCpf). */
  patientOnly?: boolean;
  /** Data limite (yyyy-mm-dd, fuso do servidor) até quando o cupom pode ser usado, inclusive. */
  expiresAt?: string;
}

// NUTRIPAULA não entra aqui: é um cupom de parceiro de verdade (nutrir_partners,
// coupon_code = NUTRIPAULA), 5% de desconto pro cliente + pontos pra Paula, igual
// qualquer outro parceiro — ver lib/partners.ts.
const COUPONS: Record<string, CouponDefinition> = {
  PRIMEIRACOMPRA: { percent: 15, label: "15% DE DESCONTO", firstPurchaseOnly: true },
  PACIENTEVIP: { percent: 10, label: "10% DE DESCONTO", patientOnly: true },
  DIADOSPAIS: { percent: 9, label: "9% DE DESCONTO", expiresAt: "2026-08-10" },
};

/** Lista os cupons fixos (não inclui os de parceiro, que vêm do banco — ver lib/partners.ts). */
export function listCoupons(): (CouponDefinition & { code: string })[] {
  return Object.entries(COUPONS).map(([code, coupon]) => ({ code, ...coupon }));
}

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

export interface CouponValidationContext {
  isFirstPurchase?: boolean;
  isPatient?: boolean;
}

/** Confere as restrições de um cupom (primeira compra, paciente, validade). Retorna null se estiver ok, ou a mensagem de erro. */
export function validateCouponRestrictions(
  coupon: CouponDefinition,
  ctx: CouponValidationContext
): string | null {
  if (coupon.expiresAt) {
    const today = new Date().toISOString().slice(0, 10);
    if (today > coupon.expiresAt) return "Este cupom expirou.";
  }
  if (coupon.firstPurchaseOnly && !ctx.isFirstPurchase) {
    return "Este cupom vale apenas na primeira compra.";
  }
  if (coupon.patientOnly && !ctx.isPatient) {
    return "Este cupom é exclusivo para pacientes VIP.";
  }
  return null;
}
