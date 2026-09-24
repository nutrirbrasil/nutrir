"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiCheckCircle, FiClock, FiTruck } from "react-icons/fi";
import { nutrirApi } from "@/lib/api";
import { PageHero } from "@/components/PageHero";
import { MarmitaPhoto } from "@/components/MarmitaPhoto";
import { StockItemCard, quantityFor } from "@/components/StockPieces";
import { StockAddonsModal } from "@/components/StockAddonsModal";
import { BebidaModal } from "@/components/BebidaModal";
import { useStockCart } from "@/lib/stock-cart-context";
import { STOCK_CATALOG, type StockCatalogItem, type StockSize } from "@/lib/stock-catalog";
import type { StockRow } from "@/lib/stock-db";
import {
  formatSelectionMap,
  selectionMapTotalCents,
  type AddonSelectionMap,
} from "@/lib/addons-data";

interface PendingAddonsAdd {
  item: StockCatalogItem;
  size: StockSize;
  cashCents: number;
  cardCents: number;
}

export default function EstoquePage() {
  const [stock, setStock] = useState<StockRow[] | null>(null);
  const [error, setError] = useState("");
  const { itemCount, cashTotalCents, setQuantity } = useStockCart();

  const [pendingAddons, setPendingAddons] = useState<PendingAddonsAdd | null>(null);
  const [addonsSelection, setAddonsSelection] = useState<AddonSelectionMap>({});
  const [showBebida, setShowBebida] = useState(false);

  useEffect(() => {
    nutrirApi
      .listStock()
      .then((r) => setStock(r.stock))
      .catch(() => setError("Não foi possível carregar o estoque agora."));
  }, []);

  function handleFirstAdd(item: StockCatalogItem, size: StockSize, cashCents: number, cardCents: number) {
    setAddonsSelection({});
    setPendingAddons({ item, size, cashCents, cardCents });
  }

  function handleConfirmAddons() {
    if (!pendingAddons) return;
    const wasEmpty = itemCount === 0;
    const addonsCents = selectionMapTotalCents(addonsSelection);
    const addonsText = formatSelectionMap(addonsSelection);

    setQuantity(
      {
        itemId: pendingAddons.item.itemId,
        size: pendingAddons.size,
        name: pendingAddons.item.name,
        imageSrc: pendingAddons.item.imageSrc,
        unitCashCents: pendingAddons.cashCents,
        unitCardCents: pendingAddons.cardCents,
        addonsCents: addonsCents > 0 ? addonsCents : undefined,
        addonsNote: addonsText ? `Adicionais: ${addonsText}` : undefined,
      },
      1
    );

    setPendingAddons(null);
    setAddonsSelection({});
    if (wasEmpty) setShowBebida(true);
  }

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
            {(["marmita", "suco"] as const).map((kind) => {
              const kindItems = withStock.filter((i) => i.kind === kind);
              if (kindItems.length === 0) return null;
              const title = kind === "marmita" ? "Marmitas" : "Sucos";
              return (
                <section key={kind}>
                  <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-nutrir-emerald/60">
                    <FiCheckCircle aria-hidden />
                    {title} disponíveis agora
                  </h2>
                  <div className="space-y-3">
                    {kindItems.map((item) => (
                      <StockItemCard
                        key={item.itemId}
                        item={item}
                        stock={stock}
                        onFirstAdd={kind === "marmita" ? handleFirstAdd : undefined}
                      />
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

      {pendingAddons && (
        <StockAddonsModal
          itemName={`${pendingAddons.item.name} (${pendingAddons.size})`}
          selection={addonsSelection}
          onChange={setAddonsSelection}
          onConfirm={handleConfirmAddons}
          onClose={() => {
            setPendingAddons(null);
            setAddonsSelection({});
          }}
        />
      )}

      {showBebida && stock && <BebidaModal stock={stock} onClose={() => setShowBebida(false)} />}
    </div>
  );
}
