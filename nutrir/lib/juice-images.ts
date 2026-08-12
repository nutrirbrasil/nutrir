const JUICE_IMAGES_VERSION = "1";

function imagePath(name: string): string {
  return `${encodeURI(`/sucos/${name}.png`)}?v=${JUICE_IMAGES_VERSION}`;
}

export const JUICE_IMAGES: Record<string, string> = {
  "suco-uva": imagePath("Uva"),
  "suco-morango": imagePath("Morango"),
  "suco-abacaxi": imagePath("Abacaxi"),
  "suco-limao": imagePath("Limao"),
  "suco-laranja": imagePath("Laranja"),
  "suco-acerola": imagePath("Acerola"),
  "suco-graviola": imagePath("Graviola"),
  "suco-acerola-laranja": imagePath("Acerola-Laranja"),
};

export function getJuiceImageSrc(itemId?: string): string | undefined {
  if (!itemId) return undefined;
  return JUICE_IMAGES[itemId];
}
