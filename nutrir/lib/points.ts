/** 1 ponto = R$ 0,20 (ou seja, valor em reais × 5), sempre arredondado. */
export function pointsFromCents(cents: number): number {
  return Math.round((cents / 100) * 5);
}

export function formatPoints(cents: number): string {
  return pointsFromCents(cents).toLocaleString("pt-BR");
}
