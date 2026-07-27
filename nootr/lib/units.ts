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

const GRAMS_ONLY = /^\d+([.,]\d+)?\s*g$/i;
const HAS_GRAMS_SUFFIX = /\(\s*\d+([.,]\d+)?\s*g\s*\)\s*$/i;

/**
 * Sufixo " (Xg)" pra completar uma medida caseira (ex: "3 unidades" ->
 * " (180g)"). Nunca duplica: se a medida já é só gramas ("150g", sem medida
 * caseira) ou já termina com um "(Xg)" embutido (ex: o que `quantityLabel`
 * acima já produz), devolve vazio.
 */
export function gramsSuffix(quantity: string, grams: number | null | undefined): string {
  const q = (quantity || "").trim();
  if (grams == null || !q) return "";
  if (GRAMS_ONLY.test(q) || HAS_GRAMS_SUFFIX.test(q)) return "";
  return ` (${Math.round(grams)}g)`;
}

/** `quantity` + gramasSuffix num único texto, pra quando o call site não quer montar o layout na mão. */
export function formatQuantityWithGrams(quantity: string, grams: number | null | undefined): string {
  const q = (quantity || "").trim();
  return `${q}${gramsSuffix(q, grams)}`;
}

// Marcas de acento que o NFKD separa da letra. Construído a partir de string
// pra manter o arquivo em ASCII puro (e sem depender da flag `u`, que o
// target do tsconfig não suporta).
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

function normalize(text: string): string {
  return text.normalize("NFKD").replace(COMBINING_MARKS, "").toLowerCase().trim();
}

/**
 * Inverso de `quantityLabel`: lê um rótulo já pronto ("3 fatias (75g)",
 * "1,5 colheres de sopa", "150g") e devolve a quantidade + a unidade em que
 * ele foi escrito. Serve pra reabrir o editor de um alimento NA MESMA medida
 * em que ele está (ver AddedFoodList), em vez de converter tudo pra gramas e
 * fazer o usuário reescolher a medida caseira toda vez.
 *
 * Devolve null quando não reconhece a unidade, aí o chamador cai em gramas.
 */
export function parseQuantityLabel(label: string): { quantity: number; unitId: string } | null {
  const text = normalize(label || "");
  if (!text) return null;

  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(.*)/);
  if (!match) return null;
  const quantity = parseFloat(match[1].replace(",", "."));
  if (!quantity || quantity <= 0) return null;
  // Corta o sufixo "(75g)" que `quantityLabel` acrescenta, senão ele entra
  // na comparação da unidade e nada casa.
  const rest = match[2].replace(/\(.*$/, "").trim();

  if (!rest || /^g(ramas?)?$/.test(rest)) return { quantity, unitId: "g" };

  // Casa pelo rótulo mais longo primeiro: "colher de sopa" antes de "colher",
  // senão "colheres de chá" cairia no genérico e viraria colher de sopa.
  const candidates = UNITS.flatMap((u) => [
    { unitId: u.id, text: normalize(u.labelPlural) },
    { unitId: u.id, text: normalize(u.label) },
  ]).sort((a, b) => b.text.length - a.text.length);

  const hit = candidates.find((c) => rest.startsWith(c.text) || c.text.startsWith(rest));
  return hit ? { quantity, unitId: hit.unitId } : null;
}
