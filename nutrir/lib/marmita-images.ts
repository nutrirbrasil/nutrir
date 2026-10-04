import type { KitProduct } from "./menu-data";
import type { OrderItem } from "./types";
import { getBebidaById } from "./bebida-data";
import { getJuiceImageSrc } from "./juice-images";

const COM_FUNDO = "/marmitas/V3";
const SEM_FUNDO = "/marmitas/Sem fundo";

/** Incremente ao trocar as fotos em public/marmitas para forçar atualização no navegador. */
export const MARMITA_IMAGES_VERSION = "8";

function imagePath(name: string): string {
  return `${encodeURI(`${COM_FUNDO}/${name}.png`)}?v=${MARMITA_IMAGES_VERSION}`;
}

/** Fotos de kit/combo continuam na pasta antiga (sem fundo), não fazem parte do Marmitas V2. */
function kitImagePath(name: string): string {
  return `${encodeURI(`${SEM_FUNDO}/${name}.png`)}?v=${MARMITA_IMAGES_VERSION}`;
}

export const MARMITA_IMAGES: Record<string, string> = {
  "frg-batata": imagePath("Escondidinho de Frango"),
  "frg-arroz": imagePath("Frango da Casa"),
  "frg-massa": imagePath("Frango ao Sugo"),
  "frg-estrogonofe": imagePath("Strogonoff de Frango"),
  "car-batata": imagePath("Escondidinho de Carne"),
  "car-arroz": imagePath("Carne da Casa"),
  "car-massa": imagePath("Ragu à Bolonhesa"),
  "car-estrogonofe": imagePath("Strogonoff de Carne"),
  "veg-ervilha": imagePath("Mix de Ervilha"),
  "veg-grao": imagePath("Mix de Grão de Bico"),
  "veg-cogumelo": imagePath("Escondidinho de Cogumelos"),
};

const MARMITA_IMAGES_TOP: Record<string, string> = {
  "frg-batata": imagePath("Escondidinho de Frango"),
  "frg-arroz": imagePath("Frango da Casa"),
  "frg-massa": imagePath("Frango ao Sugo"),
  "frg-estrogonofe": imagePath("Strogonoff de Frango"),
  "car-batata": imagePath("Escondidinho de Carne"),
  "car-arroz": imagePath("Carne da Casa"),
  "car-massa": imagePath("Ragu à Bolonhesa"),
  "car-estrogonofe": imagePath("Strogonoff de Carne"),
  "veg-ervilha": imagePath("Mix de Ervilha"),
  "veg-grao": imagePath("Mix de Grão de Bico"),
  "veg-cogumelo": imagePath("Escondidinho de Cogumelos"),
};

export const KIT_IMAGES: Record<KitProduct["id"], string> = {
  premium: kitImagePath("Escondidinho de carne"),
  frango: kitImagePath("combo frango"),
  carne: kitImagePath("combo carne"),
  misto: kitImagePath("combo misto"),
};

/** Imagem de capa por seção do cardápio (Monte seu Combo e fallback da sacola). */
export const SECTION_IMAGES: Record<string, string> = {
  frango: KIT_IMAGES.frango,
  carne: KIT_IMAGES.carne,
  vegetariano: kitImagePath("Combo Veg"),
};

export function getMarmitaImageSrc(itemId?: string, topView = false): string | undefined {
  if (!itemId) return undefined;
  return (topView ? MARMITA_IMAGES_TOP : MARMITA_IMAGES)[itemId];
}

export function getCartItemImageSrc(item: OrderItem): string | undefined {
  if (item.item_id?.startsWith("kit-")) {
    const kitId = item.item_id.slice(4).split("-")[0] as KitProduct["id"];
    if (kitId in KIT_IMAGES) return KIT_IMAGES[kitId];
  }
  if (item.section_id === "combo") return KIT_IMAGES.misto;
  if (item.section_id === "suco" && item.item_id) return getJuiceImageSrc(item.item_id);
  if (item.section_id === "bebida") return getBebidaById(item.item_id)?.imageSrc;
  if (item.item_id && MARMITA_IMAGES[item.item_id]) return MARMITA_IMAGES[item.item_id];
  return item.section_id ? SECTION_IMAGES[item.section_id] : undefined;
}
