const BEBIDA_IMAGES_VERSION = "1";

function imagePath(name: string): string {
  return `${encodeURI(`/bebidas/${name}.png`)}?v=${BEBIDA_IMAGES_VERSION}`;
}

export const BEBIDA_IMAGES: Record<string, string> = {
  "agua-com-gas": imagePath("Agua com Gas"),
  "agua-sem-gas": imagePath("Agua sem Gas"),
};

export function getBebidaImageSrc(itemId?: string): string | undefined {
  if (!itemId) return undefined;
  return BEBIDA_IMAGES[itemId];
}
