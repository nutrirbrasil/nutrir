"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/api";
import { computeTripCost, DEFAULT_GASOLINE_PRICE } from "@/lib/frete-cost";
import { useRequireAdmin } from "@/lib/use-require-admin";

function fmtNumber(value: number, digits = 1): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default function CalculadoraFretePage() {
  const { ready } = useRequireAdmin();
  const [distance, setDistance] = useState("");
  const [gasoline, setGasoline] = useState(String(DEFAULT_GASOLINE_PRICE).replace(".", ","));

  const oneWayKm = Number(distance.replace(",", "."));
  const gasolinePrice = Number(gasoline.replace(",", "."));

  const cost = useMemo(() => {
    if (!(oneWayKm > 0) || !(gasolinePrice > 0)) return null;
    return computeTripCost(oneWayKm, gasolinePrice);
  }, [oneWayKm, gasolinePrice]);

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/admin" className="mb-4 inline-block text-sm font-semibold text-nutrir-ink/70 hover:text-nutrir-ink">
        ← Voltar
      </Link>
      <h1 className="font-display text-2xl font-bold text-nutrir-ink">Calculadora de frete</h1>
      <p className="mt-1 text-sm text-nutrir-ink/60">
        Digite a distância até o local de entrega (só ida, pelo Maps) e veja quanto a viagem de ida e volta
        custa de combustível.
      </p>

      <div className="card mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-nutrir-ink">Distância (km, só ida)</label>
          <input
            className="input-field"
            inputMode="decimal"
            placeholder="ex: 5,4"
            autoFocus
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
        </div>
        <div className="sm:w-44">
          <label className="mb-1 block text-sm font-medium text-nutrir-ink">Gasolina (R$/L)</label>
          <input
            className="input-field"
            inputMode="decimal"
            value={gasoline}
            onChange={(e) => setGasoline(e.target.value)}
          />
        </div>
      </div>

      {cost && (
        <div className="card mt-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-nutrir-ink/70">Custo da viagem</h2>
          <p className="font-display text-4xl font-bold text-nutrir-burgundy">
            {formatPrice(Math.round(cost.costReais * 100))}
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-nutrir-ink/60">Distância até o local (ida)</dt>
            <dd className="text-right font-semibold text-nutrir-ink">{fmtNumber(cost.oneWayKm)} km</dd>
            <dt className="text-nutrir-ink/60">Ida e volta</dt>
            <dd className="text-right font-semibold text-nutrir-ink">{fmtNumber(cost.roundTripKm)} km</dd>
            <dt className="text-nutrir-ink/60">Consumo aplicado</dt>
            <dd className="text-right font-semibold text-nutrir-ink">{fmtNumber(cost.kmPerLiter)} km/l</dd>
            <dt className="text-nutrir-ink/60">Gasolina gasta</dt>
            <dd className="text-right font-semibold text-nutrir-ink">{fmtNumber(cost.liters, 2)} L</dd>
            <dt className="text-nutrir-ink/60">Preço do litro</dt>
            <dd className="text-right font-semibold text-nutrir-ink">
              {formatPrice(Math.round(cost.gasolinePrice * 100))}
            </dd>
          </dl>
          <p className="text-xs text-nutrir-ink/50">
            Consumo: 7 km/l até 2 km, mais 0,5 km/l a cada 2 km, até 12 km/l.
          </p>
        </div>
      )}
    </div>
  );
}
