"use client";

import { FiX } from "react-icons/fi";
import { getKitContentLines } from "@/lib/kit-contents-data";
import type { KitProduct } from "@/lib/menu-data";

interface Props {
  kit: KitProduct;
  onClose: () => void;
}

export function KitContentModal({ kit, onClose }: Props) {
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
        className="fixed left-1/2 top-1/2 z-[90] w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-nutrir-cream p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-nutrir-emerald">Conteúdo do Combo</h2>
            <p className="mt-1 text-sm text-nutrir-emerald/65">{kit.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-nutrir-emerald/20 text-nutrir-emerald/70 hover:bg-nutrir-emerald/5"
          >
            <FiX />
          </button>
        </div>

        <p className="mb-4 text-xs text-nutrir-emerald/60">
          O conteúdo é o mesmo nos tamanhos P e G, muda apenas as quantidades.
        </p>

        <ul className="space-y-4">
          {kit.tiers.map((tier) => {
            const lines = getKitContentLines(kit.id, tier.meals);
            return (
              <li
                key={tier.meals}
                className="rounded-xl border border-nutrir-nude-dark/50 bg-nutrir-nude/60 px-4 py-3"
              >
                <p className="font-display text-lg font-bold text-nutrir-emerald">
                  {tier.meals} refeições
                </p>
                <ul className="mt-2 space-y-1 text-sm text-nutrir-emerald/80">
                  {lines.map((line) => (
                    <li key={line.label}>
                      {line.count}× {line.label}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
