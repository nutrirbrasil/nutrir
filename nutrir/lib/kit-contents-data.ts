import type { KitProduct } from "./menu-data";

export interface KitContentLine {
  label: string;
  count: number;
}

type KitId = KitProduct["id"];

export interface KitContentOptions {
  includeVeg?: boolean;
}

const FRANGO_LINES: Record<number, KitContentLine[]> = {
  7: [
    { label: "Frango e arroz", count: 3 },
    { label: "Frango e massa", count: 2 },
    { label: "Escondidinho de Frango", count: 2 },
  ],
  14: [
    { label: "Frango e arroz", count: 5 },
    { label: "Frango e massa", count: 5 },
    { label: "Escondidinho de Frango", count: 4 },
  ],
  28: [
    { label: "Frango e arroz", count: 10 },
    { label: "Frango e massa", count: 10 },
    { label: "Escondidinho de Frango", count: 8 },
  ],
};

const CARNE_LINES: Record<number, KitContentLine[]> = {
  7: [
    { label: "Carne e arroz", count: 3 },
    { label: "Carne e massa", count: 2 },
    { label: "Escondidinho de Carne", count: 2 },
  ],
  14: [
    { label: "Carne e arroz", count: 5 },
    { label: "Carne e massa", count: 5 },
    { label: "Escondidinho de Carne", count: 4 },
  ],
  28: [
    { label: "Carne e arroz", count: 10 },
    { label: "Carne e massa", count: 10 },
    { label: "Escondidinho de Carne", count: 8 },
  ],
};

const VEG_LINES: Record<number, KitContentLine[]> = {
  7: [
    { label: "Ervilha", count: 4 },
    { label: "Grão de Bico", count: 3 },
  ],
  14: [
    { label: "Ervilha", count: 7 },
    { label: "Grão de Bico", count: 7 },
  ],
  28: [
    { label: "Ervilha", count: 14 },
    { label: "Grão de Bico", count: 14 },
  ],
};

const MISTO_LINES: Record<number, KitContentLine[]> = {
  7: [
    { label: "Frango e arroz", count: 2 },
    { label: "Frango e massa", count: 1 },
    { label: "Escondidinho de Frango", count: 1 },
    { label: "Carne e arroz", count: 1 },
    { label: "Carne e massa", count: 1 },
    { label: "Escondidinho de Carne", count: 1 },
  ],
  14: [
    { label: "Frango e arroz", count: 3 },
    { label: "Frango e massa", count: 3 },
    { label: "Escondidinho de Frango", count: 2 },
    { label: "Carne e arroz", count: 2 },
    { label: "Carne e massa", count: 2 },
    { label: "Escondidinho de Carne", count: 2 },
  ],
  28: [
    { label: "Frango e arroz", count: 5 },
    { label: "Frango e massa", count: 5 },
    { label: "Escondidinho de Frango", count: 5 },
    { label: "Carne e arroz", count: 5 },
    { label: "Carne e massa", count: 4 },
    { label: "Escondidinho de Carne", count: 4 },
  ],
};

const MISTO_WITH_VEG_LINES: Record<number, KitContentLine[]> = {
  7: [
    { label: "Frango e arroz", count: 1 },
    { label: "Frango e massa", count: 1 },
    { label: "Escondidinho de Frango", count: 1 },
    { label: "Carne e arroz", count: 1 },
    { label: "Carne e massa", count: 1 },
    { label: "Ervilha", count: 1 },
    { label: "Grão de Bico", count: 1 },
  ],
  14: [
    { label: "Frango e arroz", count: 2 },
    { label: "Frango e massa", count: 2 },
    { label: "Escondidinho de Frango", count: 2 },
    { label: "Carne e arroz", count: 2 },
    { label: "Carne e massa", count: 2 },
    { label: "Escondidinho de Carne", count: 2 },
    { label: "Ervilha", count: 1 },
    { label: "Grão de Bico", count: 1 },
  ],
  28: [
    { label: "Frango e arroz", count: 4 },
    { label: "Frango e massa", count: 4 },
    { label: "Escondidinho de Frango", count: 4 },
    { label: "Carne e arroz", count: 4 },
    { label: "Carne e massa", count: 3 },
    { label: "Escondidinho de Carne", count: 3 },
    { label: "Ervilha", count: 3 },
    { label: "Grão de Bico", count: 3 },
  ],
};

const KIT_CONTENTS: Record<Exclude<KitId, "misto">, Record<number, KitContentLine[]>> = {
  frango: FRANGO_LINES,
  carne: CARNE_LINES,
  veg: VEG_LINES,
};

export function getKitContentLines(
  kitId: KitId,
  meals: number,
  options?: KitContentOptions
): KitContentLine[] {
  if (kitId === "misto") {
    const source = options?.includeVeg ? MISTO_WITH_VEG_LINES : MISTO_LINES;
    return source[meals] ?? [];
  }
  return KIT_CONTENTS[kitId][meals] ?? [];
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
