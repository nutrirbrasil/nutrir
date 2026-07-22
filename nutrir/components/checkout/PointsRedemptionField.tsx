"use client";

import { formatPrice } from "@/lib/api";
import { formatPoints } from "@/lib/points";

interface Props {
  balanceCents: number;
  maxCents: number;
  valueCents: number;
  onChange: (cents: number) => void;
}

export function PointsRedemptionField({ balanceCents, maxCents, valueCents, onChange }: Props) {
  const cap = Math.max(0, Math.min(balanceCents, maxCents));
  if (cap <= 0) return null;

  const valueReais = (valueCents / 100).toFixed(2);

  function handleChange(raw: string) {
    const reais = Number(raw.replace(",", "."));
    if (Number.isNaN(reais)) {
      onChange(0);
      return;
    }
    const cents = Math.round(reais * 100);
    onChange(Math.max(0, Math.min(cents, cap)));
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase text-nutrir-emerald/60">
        Seus pontos ({formatPoints(balanceCents)} disponíveis)
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={cap / 100}
          step="0.01"
          value={valueCents > 0 ? valueReais : ""}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="0,00"
          className="input-field w-full min-w-0 flex-1 sm:min-w-[8rem]"
        />
        <button
          type="button"
          onClick={() => onChange(cap)}
          className="btn-secondary w-full shrink-0 px-4 py-2.5 text-xs font-bold uppercase sm:w-auto"
        >
          Usar máximo
        </button>
      </div>
      {valueCents > 0 && (
        <p className="mt-1.5 text-sm text-nutrir-emerald/70">
          Desconto de {formatPrice(valueCents)} em pontos.
        </p>
      )}
    </div>
  );
}
