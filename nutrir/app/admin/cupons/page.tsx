"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/api";
import { adminNutrirApi } from "@/lib/admin-api";
import { listCoupons } from "@/lib/coupons";
import { useRequireAdmin } from "@/lib/use-require-admin";
import type { PartnerRecord } from "@/lib/partners";

const FIXED_COUPONS = listCoupons();

function couponRestrictions(coupon: ReturnType<typeof listCoupons>[number]): string[] {
  const items: string[] = [];
  if (coupon.firstPurchaseOnly) items.push("Só na primeira compra (por telefone)");
  if (coupon.patientOnly) items.push("Só para pacientes VIP");
  if (coupon.expiresAt) {
    const [y, m, d] = coupon.expiresAt.split("-");
    items.push(`Expira em ${d}/${m}/${y}`);
  }
  return items;
}

export default function AdminCuponsPage() {
  const { ready, session } = useRequireAdmin();
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready || !session?.access_token) return;
    adminNutrirApi
      .listPartners(session.access_token)
      .then((r) => setPartners(r.partners))
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar parceiros."))
      .finally(() => setLoading(false));
  }, [ready, session?.access_token]);

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-nutrir-emerald">Cupons</h1>
      <p className="mt-1 text-sm text-nutrir-emerald/60">
        Todos os cupons ativos no site, pra consulta rápida sem precisar mexer no código.
      </p>

      <h2 className="mt-8 text-xs font-bold uppercase tracking-widest text-nutrir-emerald/55">
        Cupons fixos
      </h2>
      <div className="mt-3 space-y-3">
        {FIXED_COUPONS.map((coupon) => {
          const restrictions = couponRestrictions(coupon);
          return (
            <div key={coupon.code} className="card space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-lg font-bold text-nutrir-emerald">
                  {coupon.code}
                </span>
                <span className="rounded-full bg-nutrir-burgundy/10 px-3 py-1 text-sm font-bold text-nutrir-burgundy">
                  {coupon.percent}% de desconto
                </span>
              </div>
              {restrictions.length > 0 ? (
                <ul className="space-y-0.5 text-sm text-nutrir-emerald/70">
                  {restrictions.map((r) => (
                    <li key={r}>• {r}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-nutrir-emerald/50">Sem restrição, qualquer cliente pode usar.</p>
              )}
            </div>
          );
        })}
      </div>

      <h2 className="mt-8 text-xs font-bold uppercase tracking-widest text-nutrir-emerald/55">
        Cupons de parceiro
      </h2>
      <p className="mt-1 text-xs text-nutrir-emerald/50">
        5% de desconto pro cliente, mais pontos creditados pro parceiro em cada pedido pago.
      </p>

      {loading && <p className="mt-3 text-sm text-nutrir-emerald/60">Carregando…</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-3 space-y-3">
        {partners.map((partner) => (
          <div key={partner.id} className="card space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-lg font-bold text-nutrir-emerald">
                {partner.coupon_code}
              </span>
              <span className="rounded-full bg-nutrir-burgundy/10 px-3 py-1 text-sm font-bold text-nutrir-burgundy">
                5% de desconto
              </span>
            </div>
            <p className="text-sm text-nutrir-emerald/70">
              {partner.name} · {partner.email}
            </p>
            <p className="text-xs text-nutrir-emerald/50">
              Saldo de pontos: {formatPrice(partner.points_balance_cents)}
            </p>
          </div>
        ))}

        {!loading && partners.length === 0 && (
          <p className="text-sm text-nutrir-emerald/60">Nenhum parceiro cadastrado.</p>
        )}
      </div>
    </div>
  );
}
