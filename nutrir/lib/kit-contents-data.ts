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
    { label: "Escondidinho de Frango", count: 6 },
    { label: "Escondidinho de Carne", count: 6 },
    { label: "Escondidinho de Cogu", count: 4 },
    { label: "Strogonoff de Frango", count: 6 },
    { label: "Strogonoff de Carne", count: 6 },
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
    { label: "Escondidinho de Frango", count: 2 },
    { label: "Strogonoff de Frango", count: 2 },
    { label: "Carne da Casa", count: 2 },
    { label: "Ragu à Bolonhesa", count: 2 },
    { label: "Escondidinho de Carne", count: 1 },
    { label: "Strogonoff de Carne", count: 1 },
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

function linesFor(source: Record<number, KitContentLine[]>, meals: number): KitContentLine[] {
  return source[meals] ?? [];
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
