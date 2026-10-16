"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { adminNutrirApi, type FreteDistanceResult } from "@/lib/admin-api";
import { formatPrice } from "@/lib/api";
import { computeTripCost, DEFAULT_GASOLINE_PRICE } from "@/lib/frete-cost";
import { useRequireAdmin } from "@/lib/use-require-admin";

function fmtNumber(value: number, digits = 1): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default function CalculadoraFretePage() {
  const { ready, session } = useRequireAdmin();
  const [address, setAddress] = useState("");
  const [gasoline, setGasoline] = useState(String(DEFAULT_GASOLINE_PRICE).replace(".", ","));
  const [manualKm, setManualKm] = useState("");
  const [result, setResult] = useState<FreteDistanceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gasolinePrice = Number(gasoline.replace(",", "."));
  const manualDistance = Number(manualKm.replace(",", "."));
  const oneWayKm = manualKm.trim() && manualDistance > 0 ? manualDistance : result?.distanceKm ?? null;

  const cost = useMemo(() => {
    if (oneWayKm == null || !(gasolinePrice > 0)) return null;
    return computeTripCost(oneWayKm, gasolinePrice);
  }, [oneWayKm, gasolinePrice]);

  async function calculate() {
    if (!session?.access_token || address.trim().length < 5) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await adminNutrirApi.calculateFreteDistance(session.access_token, address.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao calcular.");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/admin" className="mb-4 inline-block text-sm font-semibold text-nutrir-ink/70 hover:text-nutrir-ink">
        ← Voltar
      </Link>
      <h1 className="font-display text-2xl font-bold text-nutrir-ink">Calculadora de frete</h1>
      <p className="mt-1 text-sm text-nutrir-ink/60">
        Digite o endereço de entrega e veja quanto a viagem de ida e volta custa de combustível.
      </p>

      <div className="card mt-6 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-nutrir-ink">Endereço de entrega</label>
          <input
            className="input-field"
            placeholder="Rua, número, bairro, cidade"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && calculate()}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-40">
            <label className="mb-1 block text-sm font-medium text-nutrir-ink">Gasolina (R$/L)</label>
            <input
              className="input-field"
              inputMode="decimal"
              value={gasoline}
              onChange={(e) => setGasoline(e.target.value)}
            />
          </div>
          <div className="sm:w-48">
            <label className="mb-1 block text-sm font-medium text-nutrir-ink">Ou distância (km, só ida)</label>
            <input
              className="input-field"
              inputMode="decimal"
              placeholder="opcional"
              value={manualKm}
              onChange={(e) => setManualKm(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={calculate}
            disabled={loading || address.trim().length < 5}
            className="btn-primary sm:ml-auto"
          >
            {loading ? "Calculando…" : "Calcular"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
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
            <dd className="text-right font-semibold text-nutrir-ink">{formatPrice(Math.round(cost.gasolinePrice * 100))}</dd>
          </dl>
          {result && !manualKm.trim() && (
            <p className="text-xs text-nutrir-ink/50">
              Destino encontrado: {result.destination.label}.{" "}
              <a
                className="font-semibold underline"
                href={`https://www.openstreetmap.org/?mlat=${result.destination.lat}&mlon=${result.destination.lon}#map=16/${result.destination.lat}/${result.destination.lon}`}
                target="_blank"
                rel="noreferrer"
              >
                Ver no mapa
              </a>
            </p>
          )}
          <p className="text-xs text-nutrir-ink/50">
            Consumo: 7 km/l até 2 km, mais 0,5 km/l a cada 2 km, até 12 km/l. Distância pelo trajeto de
            carro, via OpenStreetMap (confira o destino encontrado, endereços podem cair no lugar errado).
          </p>
        </div>
      )}
    </div>
  );
}
