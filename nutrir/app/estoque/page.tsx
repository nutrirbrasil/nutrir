"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FiCheckCircle } from "react-icons/fi";
import { nutrirApi, formatPrice } from "@/lib/api";
import { PageHero } from "@/components/PageHero";
import { MarmitaPhoto } from "@/components/MarmitaPhoto";
import { STOCK_CATALOG, quantityFor, type StockCatalogItem } from "@/lib/stock-catalog";
import type { StockRow } from "@/lib/stock-db";

function SizeBadge({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-nutrir-emerald/10 text-xs font-bold text-nutrir-ink">
      {children}
    </span>
  );
}

function StockRowLine({
  label,
  price,
  available,
}: {
  label: string;
  price: number;
  available: number;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
        available > 0
          ? "border-nutrir-emerald/30 bg-nutrir-emerald/10"
          : "border-nutrir-nude-dark/50 bg-nutrir-canvas-alt/10"
      }`}
    >
      <SizeBadge>{label}</SizeBadge>
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${available > 0 ? "text-nutrir-ink" : "text-nutrir-ink/50 line-through"}`}>
          {formatPrice(price)}
        </p>
        <p className="text-[11px] text-nutrir-ink/60">
          {available > 0
            ? `${available} ${available === 1 ? "unidade disponível" : "unidades disponíveis"}`
            : "Esgotado"}
        </p>
      </div>
    </div>
  );
}

function StockItemCard({ item, stock }: { item: StockCatalogItem; stock: StockRow[] }) {
  return (
    <div className="card flex items-start gap-4">
      {item.imageSrc && (
        <MarmitaPhoto src={item.imageSrc} alt={item.name} className="h-16 w-16 shrink-0" sizes="64px" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-bold text-nutrir-ink">{item.name}</p>
        <div className="mt-2 space-y-2">
          {item.sizes.map((s) => (
            <StockRowLine
              key={s.size}
              label={s.size === "UN" ? "UN" : s.size}
              price={s.cashCents}
              available={quantityFor(stock, item.itemId, s.size)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function EstoquePage() {
  const [stock, setStock] = useState<StockRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    nutrirApi
      .listStock()
      .then((r) => setStock(r.stock))
      .catch(() => setError("Não foi possível carregar o estoque agora."));
  }, []);

  return (
    <div>
      <PageHero
        eyebrow="Atualizado ao vivo"
        title="Estoque"
        subtitle="Quantidade disponível agora na loja. Para reservar, fale com a gente pelo WhatsApp."
      />

      <div className="mx-auto max-w-3xl px-4 py-8">
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
        {!stock && !error && (
          <p className="text-center text-sm text-nutrir-ink/60">Carregando estoque…</p>
        )}

        {stock && (
          <div className="space-y-8">
            {(["marmita", "suco", "bebida"] as const).map((kind) => {
              const kindItems = STOCK_CATALOG.filter((i) => i.kind === kind);
              if (kindItems.length === 0) return null;
              const title = kind === "marmita" ? "Marmitas" : kind === "suco" ? "Sucos" : "Bebidas";
              return (
                <section key={kind}>
                  <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-nutrir-ink/60">
                    <FiCheckCircle aria-hidden />
                    {title}
                  </h2>
                  <div className="space-y-3">
                    {kindItems.map((item) => (
                      <StockItemCard key={item.itemId} item={item} stock={stock} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
