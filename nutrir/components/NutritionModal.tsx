"use client";

import { FiX } from "react-icons/fi";
import { NutritionTable } from "@/components/NutritionTable";
import type { MarmitaNutritionFacts } from "@/lib/marmita-nutrition";

interface Props {
  marmitaName: string;
  facts: MarmitaNutritionFacts;
  onClose: () => void;
}

export function NutritionModal({ marmitaName, facts, onClose }: Props) {
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
        aria-labelledby="nutrition-modal-title"
        className="fixed left-1/2 top-1/2 z-[90] flex max-h-[min(90vh,640px)] w-[min(94vw,460px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-nutrir-cream shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-nutrir-nude-dark/40 px-5 py-4">
          <div>
            <h2
              id="nutrition-modal-title"
              className="font-display text-lg font-bold text-nutrir-emerald"
            >
              Tabela nutricional
            </h2>
            <p className="mt-1 text-sm text-nutrir-emerald/65">
              {marmitaName} — tamanho {facts.size}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-nutrir-emerald/20 text-nutrir-emerald/70 hover:bg-nutrir-emerald/5"
          >
            <FiX />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <NutritionTable facts={facts} />
        </div>
      </div>
    </>
  );
}
