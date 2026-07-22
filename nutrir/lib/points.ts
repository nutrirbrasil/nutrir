/** 1 ponto = R$ 0,001 (ou seja, valor em reais × 1000), sempre arredondado. */
export function pointsFromCents(cents: number): number {
  return Math.round((cents / 100) * 1000);
}

export function formatPoints(cents: number): string {
  return pointsFromCents(cents).toLocaleString("pt-BR");
}
