"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { FiCheckCircle, FiClock, FiTruck } from "react-icons/fi";
import { nutrirApi, formatPrice } from "@/lib/api";
import { PageHero } from "@/components/PageHero";
import { MarmitaPhoto } from "@/components/MarmitaPhoto";
import { useStockCart } from "@/lib/stock-cart-context";
import { STOCK_CATALOG, type StockCatalogItem, type StockSize } from "@/lib/stock-catalog";
import type { StockRow } from "@/lib/stock-db";

function quantityFor(stock: StockRow[], itemId: string, size: StockSize): number {
  return stock.find((s) => s.item_id === itemId && s.size === size)?.quantity ?? 0;
}

function SizeBadge({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-nutrir-emerald/10 text-xs font-bold text-nutrir-emerald">
      {children}
    </span>
  );
}

function QtyStepper({
  item,
  size,
  available,
  cashCents,
  cardCents,
  label,
}: {
  item: StockCatalogItem;
  size: StockSize;
  available: number;
  cashCents: number;
  cardCents: number;
  label: string;
}) {
  const { items, setQuantity } = useStockCart();
  const inCart = items.find((i) => i.itemId === item.itemId && i.size === size)?.quantity ?? 0;

  function change(delta: number) {
    const next = Math.max(0, Math.min(available, inCart + delta));
    setQuantity(
      { itemId: item.itemId, size, name: item.name, imageSrc: item.imageSrc, unitCashCents: cashCents, unitCardCents: cardCents },
      next
    );
  }

  const priceBlock =
    cashCents === cardCents ? (
      <p className="font-semibold">{formatPrice(cashCents)}</p>
    ) : (
      <p>
        <span className="line-through opacity-60">{formatPrice(cardCents)}</span>{" "}
        <span className="font-semibold">{formatPrice(cashCents)} (dinheiro ou pix)</span>
      </p>
    );

  if (available <= 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-nutrir-nude-dark/50 bg-nutrir-nude-dark/10 px-3 py-2">
        <SizeBadge>{label}</SizeBadge>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-nutrir-emerald/60">Esgotado</p>
          <div className="text-[11px] text-nutrir-emerald/40">{priceBlock}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-nutrir-emerald/30 bg-nutrir-emerald/10 px-3 py-2">
      <SizeBadge>{label}</SizeBadge>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-nutrir-emerald">{priceBlock}</div>
        <p className="text-[11px] text-nutrir-emerald/60">
          {available} {available === 1 ? "unidade disponível" : "unidades disponíveis"}
        </p>
      </div>
      <button
        type="button"
        onClick={() => change(-1)}
        disabled={inCart <= 0}
        className="btn-secondary px-2 py-0.5 text-sm disabled:opacity-40"
      >
        −
      </button>
      <span className="min-w-[1.25rem] text-center text-sm font-bold tabular-nums text-nutrir-emerald">
        {inCart}
      </span>
      <button
        type="button"
        onClick={() => change(1)}
        disabled={inCart >= available}
        className="btn-secondary px-2 py-0.5 text-sm disabled:opacity-40"
      >
        +
      </button>
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
        <p className="font-display text-base font-bold text-nutrir-emerald">{item.name}</p>
        <div className="mt-2 space-y-2">
          {item.sizes.map((s) => (
            <QtyStepper
              key={s.size}
              item={item}
              size={s.size}
              available={quantityFor(stock, item.itemId, s.size)}
              cashCents={s.cashCents}
              cardCents={s.cardCents}
              label={s.size === "UN" ? "UN" : s.size}
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
  const { itemCount, cashTotalCents } = useStockCart();

  useEffect(() => {
    nutrirApi
      .listStock()
      .then((r) => setStock(r.stock))
      .catch(() => setError("Não foi possível carregar o estoque agora."));
  }, []);

  const withStock = stock
    ? STOCK_CATALOG.filter((item) => item.sizes.some((s) => quantityFor(stock, item.itemId, s.size) > 0))
    : [];
  const marmitasSemEstoque = stock
    ? STOCK_CATALOG.filter((item) => item.kind === "marmita" && !withStock.includes(item))
    : [];

  return (
    <div>
      <PageHero
        eyebrow={
          <>
            <FiTruck aria-hidden />
            Entrega em Piçarras e Penha
          </>
        }
        title="Marmitas congeladas prontas"
        tagline="Pronta entrega | Retirada Imediata"
        subtitle="Sem necessidade de agendamento, reserve para retirada ou peça para entregar."
      />

      <div className="mx-auto max-w-3xl px-4 py-8 pb-28">
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
        {!stock && !error && (
          <p className="text-center text-sm text-nutrir-emerald/60">Carregando estoque…</p>
        )}

        {stock && (
          <div className="space-y-8">
            {(["marmita", "suco", "bebida"] as const).map((kind) => {
              const kindItems = withStock.filter((i) => i.kind === kind);
              if (kindItems.length === 0) return null;
              const title = kind === "marmita" ? "Marmitas" : kind === "suco" ? "Sucos" : "Bebidas";
              return (
                <section key={kind}>
                  <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-nutrir-emerald/60">
                    <FiCheckCircle aria-hidden />
                    {title} disponíveis agora
                  </h2>
                  <div className="space-y-3">
                    {kindItems.map((item) => (
                      <StockItemCard key={item.itemId} item={item} stock={stock} />
                    ))}
                  </div>
                </section>
              );
            })}

            {marmitasSemEstoque.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-nutrir-emerald/60">
                  Esgotados (Disponíveis apenas para pedidos agendados)
                </h2>
                <div className="space-y-2">
                  {marmitasSemEstoque.map((item) => (
                    <div key={item.itemId} className="card flex items-center gap-3 py-3">
                      {item.imageSrc && (
                        <MarmitaPhoto
                          src={item.imageSrc}
                          alt={item.name}
                          className="h-11 w-11 shrink-0 opacity-70"
                          sizes="44px"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-nutrir-emerald">{item.name}</p>
                        <p className="flex items-center gap-1 text-xs text-nutrir-emerald/60">
                          <FiClock aria-hidden />
                          Disponível apenas para pedido agendado
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="text-center">
              <Link href="/marmitas" className="btn-secondary inline-block">
                Ver cardápio completo (pedido agendado)
              </Link>
            </div>
          </div>
        )}
      </div>

      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-[4.75rem] z-30 border-t border-nutrir-nude-dark/60 bg-nutrir-cream/95 px-4 py-3 shadow-[0_-4px_24px_rgba(28,28,28,0.08)] backdrop-blur-md md:bottom-0">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <span className="text-sm font-semibold text-nutrir-emerald">
              {itemCount} {itemCount === 1 ? "item" : "itens"} ·{" "}
              {(cashTotalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
            <Link href="/estoque/checkout" className="btn-primary px-6 py-2.5">
              Continuar
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
