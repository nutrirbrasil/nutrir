import type { KitProduct } from "./menu-data";
import type { OrderItem } from "./types";

const SEM_FUNDO = "/marmitas/Sem fundo";

function imagePath(filename: string): string {
  return encodeURI(`${SEM_FUNDO}/${filename}`);
}

export const MARMITA_IMAGES: Record<string, string> = {
  "frg-batata": imagePath("Escondidinho de frango.jpg"),
  "frg-arroz": imagePath("frango e arroz cima.jpg"),
  "frg-massa": imagePath("frango e massa cima.jpg"),
  "car-batata": imagePath("Escondidinho de carne.jpg"),
  "car-arroz": imagePath("carne e arroz cima.jpg"),
  "car-massa": imagePath("carne e massa cima.jpg"),
  "veg-ervilha": imagePath("ervilha cima.jpg"),
  "veg-grao": imagePath("grao de bico cima.jpg"),
};

export const KIT_IMAGES: Record<KitProduct["id"], string> = {
  frango: imagePath("combo frango.jpg"),
  carne: imagePath("combo carne.jpg"),
  veg: imagePath("combo vegetariano.jpg"),
  misto: imagePath("combo misto.jpg"),
};

export const SECTION_IMAGES: Record<string, string> = {
  frango: KIT_IMAGES.frango,
  carne: KIT_IMAGES.carne,
  vegetariano: KIT_IMAGES.veg,
};

export function getMarmitaImageSrc(itemId?: string): string | undefined {
  if (!itemId) return undefined;
  return MARMITA_IMAGES[itemId];
}

export function getKitImageSrc(kitId: KitProduct["id"]): string {
  return KIT_IMAGES[kitId];
}

export function parseKitIdFromItemId(itemId?: string): KitProduct["id"] | undefined {
  if (!itemId?.startsWith("kit-")) return undefined;
  const kitId = itemId.slice(4).split("-")[0];
  if (kitId === "frango" || kitId === "carne" || kitId === "veg" || kitId === "misto") {
    return kitId;
  }
  return undefined;
}

export function getCartItemImageSrc(item: OrderItem): string | undefined {
  const kitId = parseKitIdFromItemId(item.item_id);
  if (kitId) return KIT_IMAGES[kitId];

  if (item.section_id === "combo") return KIT_IMAGES.misto;

  const marmitaSrc = getMarmitaImageSrc(item.item_id);
  if (marmitaSrc) return marmitaSrc;

  if (item.section_id) return SECTION_IMAGES[item.section_id];
  return undefined;
}
