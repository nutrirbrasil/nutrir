// Medidas caseiras → gramas (aproximações de porções típicas).
// Espelha os pesos usados no backend (backend/app/services/portion.py).
export interface Unit {
  id: string;
  label: string;       // singular
  labelPlural: string;
  grams: number;
}

export const UNITS: Unit[] = [
  { id: "g", label: "grama", labelPlural: "gramas", grams: 1 },
  { id: "colher_sopa", label: "colher de sopa", labelPlural: "colheres de sopa", grams: 15 },
  { id: "colher_cha", label: "colher de chá", labelPlural: "colheres de chá", grams: 5 },
  { id: "fatia", label: "fatia", labelPlural: "fatias", grams: 25 },
  { id: "unidade", label: "unidade", labelPlural: "unidades", grams: 60 },
  { id: "xicara", label: "xícara", labelPlural: "xícaras", grams: 120 },
  { id: "copo", label: "copo (200 ml)", labelPlural: "copos (200 ml)", grams: 200 },
  { id: "concha", label: "concha", labelPlural: "conchas", grams: 80 },
  { id: "pote", label: "pote", labelPlural: "potes", grams: 170 },
  { id: "prato", label: "prato", labelPlural: "pratos", grams: 400 },
];

export function toGrams(quantity: number, unitId: string): number {
  const unit = UNITS.find((u) => u.id === unitId);
  return Math.round(quantity * (unit?.grams ?? 1) * 10) / 10;
}

export function quantityLabel(quantity: number, unitId: string): string {
  const unit = UNITS.find((u) => u.id === unitId);
  if (!unit || unit.id === "g") return `${Math.round(quantity)}g`;
  const name = quantity === 1 ? unit.label : unit.labelPlural;
  const qty = Number.isInteger(quantity) ? quantity : quantity.toFixed(1).replace(".", ",");
  return `${qty} ${name} (${Math.round(toGrams(quantity, unitId))}g)`;
}
