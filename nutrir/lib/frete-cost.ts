/** Preço do litro de gasolina usado de partida na calculadora de frete (R$/L). */
export const DEFAULT_GASOLINE_PRICE = 6.15;

const BASE_KM_PER_LITER = 7;
const MAX_KM_PER_LITER = 12;

/**
 * Consumo (km/l) pela distância até o local de entrega (só ida): até 2 km rende 7 km/l
 * e a cada 2 km a mais sobe 0,5 km/l (até 4 km 7,5, até 6 km 8...), com teto de 12 km/l,
 * já que trajetos mais longos costumam ter consumo melhor.
 */
export function kmPerLiterForDistance(oneWayKm: number): number {
  if (oneWayKm <= 0) return BASE_KM_PER_LITER;
  const tier = Math.ceil(oneWayKm / 2) - 1;
  return Math.min(MAX_KM_PER_LITER, BASE_KM_PER_LITER + 0.5 * tier);
}

export interface TripCost {
  oneWayKm: number;
  roundTripKm: number;
  kmPerLiter: number;
  liters: number;
  gasolinePrice: number;
  costReais: number;
}

/** Custo de combustível da viagem de entrega (ida e volta = distância x 2). */
export function computeTripCost(oneWayKm: number, gasolinePrice: number): TripCost {
  const roundTripKm = oneWayKm * 2;
  const kmPerLiter = kmPerLiterForDistance(oneWayKm);
  const liters = roundTripKm / kmPerLiter;
  return {
    oneWayKm,
    roundTripKm,
    kmPerLiter,
    liters,
    gasolinePrice,
    costReais: liters * gasolinePrice,
  };
}
