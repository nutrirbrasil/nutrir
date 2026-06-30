import type { KitProduct } from "./menu-data";
import type { OrderItem } from "./types";

const SEM_FUNDO = "/marmitas/Sem fundo";

/** Incremente ao trocar as fotos em public/marmitas para forçar atualização no navegador. */
export const MARMITA_IMAGES_VERSION = "1";

function imagePath(name: string): string {
  return `${encodeURI(`${SEM_FUNDO}/${name}.png`)}?v=${MARMITA_IMAGES_VERSION}`;
}

export const MARMITA_IMAGES: Record<string, string> = {
  "frg-batata": imagePath("Escondidinho de frango"),
  "frg-arroz": imagePath("frango e arroz lado"),
  "frg-massa": imagePath("frango e massa lado"),
  "car-batata": imagePath("Escondidinho de carne"),
  "car-arroz": imagePath("carne e arroz lado"),
  "car-massa": imagePath("carne e massa lado"),
  "veg-ervilha": imagePath("ervilha lado"),
  "veg-grao": imagePath("grao de bico lado"),
};

const MARMITA_IMAGES_TOP: Record<string, string> = {
  "frg-batata": imagePath("Escondidinho de frango"),
  "frg-arroz": imagePath("frango e arroz cima"),
  "frg-massa": imagePath("frango e massa cima"),
  "car-batata": imagePath("Escondidinho de carne"),
  "car-arroz": imagePath("carne e arroz cima"),
  "car-massa": imagePath("carne e massa cima"),
  "veg-ervilha": imagePath("ervilha cima"),
  "veg-grao": imagePath("grao de bico cima"),
};

export const KIT_IMAGES: Record<KitProduct["id"], string> = {
  frango: imagePath("combo frango"),
  carne: imagePath("combo carne"),
  veg: imagePath("combo vegetariano"),
  misto: imagePath("combo misto"),
};

const SECTION_TO_KIT: Record<string, KitProduct["id"]> = {
  frango: "frango",
  carne: "carne",
  vegetariano: "veg",
};

function itemKeyFromLabel(label: string): string | undefined {
  const lower = label.toLowerCase();
  if (lower.includes("frango") && (lower.includes("batata") || lower.includes("escondidinho")))
    return "frg-batata";
  if (lower.includes("frango") && lower.includes("massa")) return "frg-massa";
  if (lower.includes("frango") && lower.includes("arroz")) return "frg-arroz";
  if (lower.includes("carne") && (lower.includes("batata") || lower.includes("escondidinho")))
    return "car-batata";
  if (lower.includes("carne") && lower.includes("massa")) return "car-massa";
  if (lower.includes("carne") && lower.includes("arroz")) return "car-arroz";
  if (lower.includes("ervilha")) return "veg-ervilha";
  if (lower.includes("grão") || lower.includes("grao")) return "veg-grao";
  return undefined;
}

export function getMarmitaImageSrc(itemId?: string, topView = false): string | undefined {
  if (!itemId) return undefined;
  return (topView ? MARMITA_IMAGES_TOP : MARMITA_IMAGES)[itemId];
}

export function getMarmitaImageFromLabel(label: string, topView = false): string | undefined {
  const key = itemKeyFromLabel(label);
  return key ? getMarmitaImageSrc(key, topView) : undefined;
}

export function getCartItemImageSrc(item: OrderItem): string | undefined {
  if (item.item_id?.startsWith("kit-")) {
    const kitId = item.item_id.slice(4).split("-")[0] as KitProduct["id"];
    if (kitId in KIT_IMAGES) return KIT_IMAGES[kitId];
  }
  if (item.section_id === "combo") return KIT_IMAGES.misto;
  if (item.item_id && MARMITA_IMAGES[item.item_id]) return MARMITA_IMAGES[item.item_id];
  const kitId = item.section_id ? SECTION_TO_KIT[item.section_id] : undefined;
  return kitId ? KIT_IMAGES[kitId] : undefined;
}

export function shortMealLabel(label: string): string {
  return label.replace(/\s*\(\d+\/\d+\)\s*$/, "").trim();
}
