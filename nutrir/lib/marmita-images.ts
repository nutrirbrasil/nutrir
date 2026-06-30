import type { KitProduct } from "./menu-data";
import type { OrderItem } from "./types";

const SEM_FUNDO = "/marmitas/Sem fundo";

function imagePath(filename: string): string {
  return encodeURI(`${SEM_FUNDO}/${filename}`);
}

/** Vista lateral — cardápio, sacola, combos. */
export const MARMITA_IMAGES: Record<string, string> = {
  "frg-batata": imagePath("Escondidinho de frango.jpg"),
  "frg-arroz": imagePath("frango e arroz lado.jpg"),
  "frg-massa": imagePath("frango e massa lado.jpg"),
  "car-batata": imagePath("Escondidinho de carne.jpg"),
  "car-arroz": imagePath("carne e arroz lado.jpg"),
  "car-massa": imagePath("carne e massa lado.jpg"),
  "veg-ervilha": imagePath("ervilha lado.jpg"),
  "veg-grao": imagePath("grao de bico lado.jpg"),
};

/** Vista de cima — miniaturas no modal de adicionais. */
export const MARMITA_IMAGES_TOP: Record<string, string> = {
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

export function resolveMarmitaItemKeyFromLabel(label: string): string | undefined {
  const lower = label.toLowerCase();

  const hasFrango = lower.includes("frango");
  const hasCarne = lower.includes("carne");
  const hasBatata = lower.includes("batata") || lower.includes("escondidinho");
  const hasMassa = lower.includes("massa");
  const hasArroz = lower.includes("arroz");
  const hasErvilha = lower.includes("ervilha");
  const hasGrao = lower.includes("grão") || lower.includes("grao");

  if (hasFrango && hasBatata) return "frg-batata";
  if (hasFrango && hasMassa) return "frg-massa";
  if (hasFrango && hasArroz) return "frg-arroz";
  if (hasCarne && hasBatata) return "car-batata";
  if (hasCarne && hasMassa) return "car-massa";
  if (hasCarne && hasArroz) return "car-arroz";
  if (hasErvilha) return "veg-ervilha";
  if (hasGrao) return "veg-grao";

  return undefined;
}

export function getMarmitaImageSrc(
  itemId?: string,
  view: "side" | "top" = "side"
): string | undefined {
  if (!itemId) return undefined;
  const map = view === "top" ? MARMITA_IMAGES_TOP : MARMITA_IMAGES;
  return map[itemId];
}

export function getMarmitaImageFromLabel(
  label: string,
  view: "side" | "top" = "side"
): string | undefined {
  const key = resolveMarmitaItemKeyFromLabel(label);
  if (!key) return undefined;
  return getMarmitaImageSrc(key, view);
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

/** Rótulo curto para a lista lateral do modal de adicionais. */
export function shortMealLabel(label: string): string {
  return label.replace(/\s*\(\d+\/\d+\)\s*$/, "").trim();
}
