"use client";

import { FiX } from "react-icons/fi";
import { STOCK_CATALOG, quantityFor } from "@/lib/stock-catalog";
import { StockItemCard } from "@/components/StockPieces";
import type { StockRow } from "@/lib/stock-db";

interface Props {
  stock: StockRow[];
  onClose: () => void;
}

export function BebidaModal({ stock, onClose }: Props) {
  const sucos = STOCK_CATALOG.filter((item) => item.kind === "suco");
  const sucosComEstoque = sucos.filter((item) =>
    item.sizes.some((s) => quantityFor(stock, item.itemId, s.size) > 0)
  );
  const aguas = STOCK_CATALOG.filter((item) => item.kind === "bebida");

  return (
    <>
      <button
        type="button"
        aria-label="Fechar"
        className="fixed inset-0 z-[80] bg-black/45"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 z-[90] flex max-h-[min(90vh,720px)] w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-nutrir-cream shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-nutrir-nude-dark/40 px-5 py-4">
          <h2 className="font-display text-xl font-bold text-nutrir-emerald">Deseja uma bebida?</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-nutrir-emerald/20 text-nutrir-emerald/70 hover:bg-nutrir-emerald/5"
          >
            <FiX />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4">
          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-nutrir-emerald/55">
              {sucosComEstoque.length > 0 ? "Sucos do Dia" : "Sucos"}
            </p>
            {sucosComEstoque.length > 0 ? (
              <div className="space-y-3">
                {sucosComEstoque.map((item) => (
                  <StockItemCard key={item.itemId} item={item} stock={stock} />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-nutrir-nude-dark/50 bg-nutrir-nude-dark/10 px-3 py-2 text-xs text-nutrir-emerald/70">
                No momento, nossos sucos estão disponíveis apenas para pedidos agendados.
              </p>
            )}
          </section>

          {aguas.length > 0 && (
            <section>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-nutrir-emerald/55">
                Água
              </p>
              <div className="space-y-3">
                {aguas.map((item) => (
                  <StockItemCard key={item.itemId} item={item} stock={stock} />
                ))}
              </div>
            </section>
          )}
        </div>

        <footer className="border-t border-nutrir-nude-dark/40 px-5 py-4">
          <button type="button" onClick={onClose} className="btn-primary w-full py-2.5">
            Concluir
          </button>
        </footer>
      </div>
    </>
  );
}
