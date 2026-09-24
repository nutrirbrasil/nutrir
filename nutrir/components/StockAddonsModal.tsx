"use client";

import { FiX } from "react-icons/fi";
import { formatPrice } from "@/lib/api";
import {
  getAddonById,
  getAddonUnitPriceCents,
  MAX_ADDON_PORTIONS,
  selectionMapTotalCents,
  type AddonSelectionMap,
  type MealAddon,
} from "@/lib/addons-data";
import { MarmitaPhoto } from "@/components/MarmitaPhoto";

/** Só os adicionais que já vêm prontos em pote (não exigem preparo, dá pra colocar direto no saco da pronta entrega). */
const STOCK_ADDON_IDS = ["add-molho", "add-ketchup", "add-mostarda", "add-azeite"];

function QtyStepper({ qty, onDec, onInc }: { qty: number; onDec: () => void; onInc: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={onDec}
        disabled={qty <= 0}
        className="btn-secondary px-2 py-0.5 text-sm disabled:opacity-40"
      >
        −
      </button>
      <span className="min-w-[1.25rem] text-center text-sm font-bold tabular-nums text-nutrir-emerald">
        {qty}
      </span>
      <button
        type="button"
        onClick={onInc}
        disabled={qty >= MAX_ADDON_PORTIONS}
        className="btn-secondary px-2 py-0.5 text-sm disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

function formatAddonPriceTag(unitCents: number): string {
  return unitCents > 0 ? `+${formatPrice(unitCents)}` : formatPrice(unitCents);
}

function AddonCard({
  addon,
  qty,
  onDec,
  onInc,
}: {
  addon: MealAddon;
  qty: number;
  onDec: () => void;
  onInc: () => void;
}) {
  const unitCents = getAddonUnitPriceCents(addon);
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-nutrir-nude-dark/60 bg-nutrir-cream/50 px-2.5 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {addon.imageSrc && (
            <MarmitaPhoto src={addon.imageSrc} alt="" className="h-10 w-10 shrink-0" sizes="40px" />
          )}
          <p className="text-sm font-semibold text-nutrir-emerald">{addon.name}</p>
        </div>
        <span className="shrink-0 text-sm font-bold text-nutrir-burgundy">
          {formatAddonPriceTag(unitCents)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-nutrir-emerald/60">{addon.portionLabel}</span>
        <QtyStepper qty={qty} onDec={onDec} onInc={onInc} />
      </div>
    </div>
  );
}

interface Props {
  itemName: string;
  selection: AddonSelectionMap;
  onChange: (next: AddonSelectionMap) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function StockAddonsModal({ itemName, selection, onChange, onConfirm, onClose }: Props) {
  const addons = STOCK_ADDON_IDS.map(getAddonById).filter((a): a is MealAddon => Boolean(a));
  const total = selectionMapTotalCents(selection);

  function setPortions(id: string, portions: number) {
    const next = { ...selection };
    if (portions <= 0) delete next[id];
    else next[id] = portions;
    onChange(next);
  }

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
          <div>
            <h2 className="font-display text-xl font-bold text-nutrir-emerald">Adicionais</h2>
            <p className="mt-1 text-sm text-nutrir-emerald/65">{itemName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-nutrir-emerald/20 text-nutrir-emerald/70 hover:bg-nutrir-emerald/5"
          >
            <FiX />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-4 rounded-xl border border-nutrir-nude-dark/50 bg-nutrir-nude-dark/10 px-3 py-2 text-xs text-nutrir-emerald/70">
            Opções de substituição e outros adicionais estão disponíveis apenas em pedidos agendados.
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {addons.map((addon) => (
              <AddonCard
                key={addon.id}
                addon={addon}
                qty={selection[addon.id] ?? 0}
                onDec={() => setPortions(addon.id, (selection[addon.id] ?? 0) - 1)}
                onInc={() => setPortions(addon.id, (selection[addon.id] ?? 0) + 1)}
              />
            ))}
          </div>

          {total > 0 && (
            <p className="mt-4 text-center text-sm text-nutrir-emerald/70">
              Total adicionais: <strong className="text-nutrir-burgundy">{formatPrice(total)}</strong>
            </p>
          )}
        </div>

        <footer className="border-t border-nutrir-nude-dark/40 px-5 py-4">
          <button type="button" onClick={onConfirm} className="btn-primary w-full py-2.5">
            Adicionar à sacola
          </button>
        </footer>
      </div>
    </>
  );
}
