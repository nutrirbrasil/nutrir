import type { KitProduct } from "./menu-data";

export interface KitContentLine {
  label: string;
  count: number;
}

type KitId = KitProduct["id"];

export interface KitContentOptions {
  includeVeg?: boolean;
}

const PREMIUM_LINES: Record<number, KitContentLine[]> = {
  7: [
    { label: "Escondidinho de Frango", count: 2 },
    { label: "Escondidinho de Carne", count: 1 },
    { label: "Escondidinho de Cogu", count: 1 },
    { label: "Strogonoff de Frango", count: 2 },
    { label: "Strogonoff de Carne", count: 1 },
  ],
  14: [
    { label: "Escondidinho de Frango", count: 3 },
    { label: "Escondidinho de Carne", count: 3 },
    { label: "Escondidinho de Cogu", count: 2 },
    { label: "Strogonoff de Frango", count: 3 },
    { label: "Strogonoff de Carne", count: 3 },
  ],
  28: [
    { label: "Escondidinho de Frango", count: 7 },
    { label: "Escondidinho de Carne", count: 7 },
    { label: "Strogonoff de Frango", count: 7 },
    { label: "Strogonoff de Carne", count: 7 },
  ],
};

const FRANGO_LINES: Record<number, KitContentLine[]> = {
  7: [
    { label: "Frango da Casa", count: 2 },
    { label: "Frango ao Sugo", count: 2 },
    { label: "Escondidinho de Frango", count: 1 },
    { label: "Strogonoff de Frango", count: 2 },
  ],
  14: [
    { label: "Frango da Casa", count: 4 },
    { label: "Frango ao Sugo", count: 4 },
    { label: "Escondidinho de Frango", count: 3 },
    { label: "Strogonoff de Frango", count: 3 },
  ],
  28: [
    { label: "Frango da Casa", count: 8 },
    { label: "Frango ao Sugo", count: 7 },
    { label: "Escondidinho de Frango", count: 7 },
    { label: "Strogonoff de Frango", count: 6 },
  ],
};

const CARNE_LINES: Record<number, KitContentLine[]> = {
  7: [
    { label: "Carne da Casa", count: 2 },
    { label: "Ragu à Bolonhesa", count: 2 },
    { label: "Escondidinho de Carne", count: 1 },
    { label: "Strogonoff de Carne", count: 2 },
  ],
  14: [
    { label: "Carne da Casa", count: 4 },
    { label: "Ragu à Bolonhesa", count: 4 },
    { label: "Escondidinho de Carne", count: 3 },
    { label: "Strogonoff de Carne", count: 3 },
  ],
  28: [
    { label: "Carne da Casa", count: 8 },
    { label: "Ragu à Bolonhesa", count: 7 },
    { label: "Escondidinho de Carne", count: 7 },
    { label: "Strogonoff de Carne", count: 6 },
  ],
};

const VEG_LINES: Record<number, KitContentLine[]> = {
  7: [
    { label: "Mix de Ervilha", count: 2 },
    { label: "Mix de Grão de Bico", count: 3 },
    { label: "Escondidinho de Cogu", count: 2 },
  ],
  14: [
    { label: "Mix de Ervilha", count: 5 },
    { label: "Mix de Grão de Bico", count: 5 },
    { label: "Escondidinho de Cogu", count: 4 },
  ],
  28: [
    { label: "Mix de Ervilha", count: 10 },
    { label: "Mix de Grão de Bico", count: 10 },
    { label: "Escondidinho de Cogu", count: 8 },
  ],
};

const MISTO_LINES: Record<number, KitContentLine[]> = {
  // No tier de 7 o Carne da Casa fica de fora (8 opções não cabem em 7 marmitas).
  7: [
    { label: "Frango da Casa", count: 1 },
    { label: "Frango ao Sugo", count: 1 },
    { label: "Escondidinho de Frango", count: 1 },
    { label: "Strogonoff de Frango", count: 1 },
    { label: "Ragu à Bolonhesa", count: 1 },
    { label: "Escondidinho de Carne", count: 1 },
    { label: "Strogonoff de Carne", count: 1 },
  ],
  14: [
    { label: "Frango da Casa", count: 2 },
    { label: "Frango ao Sugo", count: 2 },
    { label: "Escondidinho de Frango", count: 1 },
    { label: "Strogonoff de Frango", count: 2 },
    { label: "Carne da Casa", count: 2 },
    { label: "Ragu à Bolonhesa", count: 2 },
    { label: "Escondidinho de Carne", count: 1 },
    { label: "Strogonoff de Carne", count: 2 },
  ],
  28: [
    { label: "Frango da Casa", count: 4 },
    { label: "Frango ao Sugo", count: 4 },
    { label: "Escondidinho de Frango", count: 3 },
    { label: "Strogonoff de Frango", count: 3 },
    { label: "Carne da Casa", count: 4 },
    { label: "Ragu à Bolonhesa", count: 4 },
    { label: "Escondidinho de Carne", count: 3 },
    { label: "Strogonoff de Carne", count: 3 },
  ],
};

const MISTO_WITH_VEG_LINES: Record<number, KitContentLine[]> = {
  7: [
    { label: "Frango da Casa", count: 1 },
    { label: "Frango ao Sugo", count: 1 },
    { label: "Escondidinho de Frango", count: 1 },
    { label: "Carne da Casa", count: 1 },
    { label: "Ragu à Bolonhesa", count: 1 },
    { label: "Mix de Ervilha", count: 1 },
    { label: "Mix de Grão de Bico", count: 1 },
  ],
  14: [
    { label: "Frango da Casa", count: 2 },
    { label: "Frango ao Sugo", count: 2 },
    { label: "Escondidinho de Frango", count: 2 },
    { label: "Carne da Casa", count: 2 },
    { label: "Ragu à Bolonhesa", count: 2 },
    { label: "Escondidinho de Carne", count: 1 },
    { label: "Escondidinho de Cogu", count: 1 },
    { label: "Mix de Ervilha", count: 1 },
    { label: "Mix de Grão de Bico", count: 1 },
  ],
  28: [
    { label: "Frango da Casa", count: 4 },
    { label: "Frango ao Sugo", count: 4 },
    { label: "Escondidinho de Frango", count: 3 },
    { label: "Carne da Casa", count: 3 },
    { label: "Ragu à Bolonhesa", count: 3 },
    { label: "Escondidinho de Carne", count: 3 },
    { label: "Escondidinho de Cogu", count: 2 },
    { label: "Mix de Ervilha", count: 3 },
    { label: "Mix de Grão de Bico", count: 3 },
  ],
};

const KIT_CONTENTS: Record<Exclude<KitId, "misto">, Record<number, KitContentLine[]>> = {
  premium: PREMIUM_LINES,
  frango: FRANGO_LINES,
  carne: CARNE_LINES,
  veg: VEG_LINES,
};

/** Escala a composição de 28 marmitas pra outro total (maior resto), mantendo a proporção. */
function scaleLines(base: KitContentLine[], total: number): KitContentLine[] {
  const baseTotal = base.reduce((sum, l) => sum + l.count, 0);
  const raw = base.map((l) => (l.count * total) / baseTotal);
  const counts = raw.map((r) => Math.floor(r));
  let remaining = total - counts.reduce((sum, c) => sum + c, 0);
  const order = raw
    .map((r, index) => ({ index, frac: r - Math.floor(r) }))
    .sort((x, y) => y.frac - x.frac || x.index - y.index);
  for (const { index } of order) {
    if (remaining <= 0) break;
    counts[index] += 1;
    remaining -= 1;
  }
  return base.map((l, i) => ({ label: l.label, count: counts[i] }));
}

function linesFor(source: Record<number, KitContentLine[]>, meals: number): KitContentLine[] {
  if (source[meals]) return source[meals];
  if (source[28] && (meals === 30 || meals === 60)) return scaleLines(source[28], meals);
  return [];
}

export function getKitContentLines(
  kitId: KitId,
  meals: number,
  options?: KitContentOptions
): KitContentLine[] {
  if (kitId === "misto") {
    return linesFor(options?.includeVeg ? MISTO_WITH_VEG_LINES : MISTO_LINES, meals);
  }
  return linesFor(KIT_CONTENTS[kitId], meals);
}

/** Lista expandida de rótulos por marmita (para adicionais personalizados). */
export function getKitMealLabels(
  kitId: KitId,
  meals: number,
  options?: KitContentOptions
): string[] {
  const lines = getKitContentLines(kitId, meals, options);
  const labels: string[] = [];
  for (const line of lines) {
    for (let i = 0; i < line.count; i++) {
      labels.push(line.count > 1 ? `${line.label} (${i + 1}/${line.count})` : line.label);
    }
  }
  return labels;
}
