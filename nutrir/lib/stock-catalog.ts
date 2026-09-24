import { MENU_SECTIONS, type MarmitaSize } from "./menu-data";
import { JUICE_CATEGORIES, type JuiceSize } from "./juice-data";
import { getMarmitaCardPriceCents } from "./order-pricing";
import { getMarmitaImageSrc } from "./marmita-images";
import { getJuiceImageSrc } from "./juice-images";
import { getBebidaImageSrc } from "./bebida-images";

/** "UN" cobre itens sem tamanho P/G (ex.: água). */
export type StockSize = MarmitaSize | "UN";

/** Marmita de pronta entrega custa R$1,00 a mais que a mesma marmita agendada, pix/dinheiro e cartão. */
const STOCK_MARMITA_SURCHARGE_CENTS = 100;

export interface StockCatalogSizeOption {
  size: StockSize;
  label: string;
  cashCents: number;
  cardCents: number;
}

export type StockCatalogKind = "marmita" | "suco" | "bebida";

export interface StockCatalogItem {
  itemId: string;
  name: string;
  kind: StockCatalogKind;
  imageSrc?: string;
  sizes: StockCatalogSizeOption[];
}

/** Água com/sem gás — só existem aqui (não fazem parte do cardápio principal), preço único (sem diferença pix/cartão). */
const BEBIDAS: StockCatalogItem[] = [
  {
    itemId: "agua-com-gas",
    name: "Água com Gás",
    kind: "bebida",
    imageSrc: getBebidaImageSrc("agua-com-gas"),
    sizes: [{ size: "UN", label: "Unidade", cashCents: 499, cardCents: 499 }],
  },
  {
    itemId: "agua-sem-gas",
    name: "Água sem Gás",
    kind: "bebida",
    imageSrc: getBebidaImageSrc("agua-sem-gas"),
    sizes: [{ size: "UN", label: "Unidade", cashCents: 499, cardCents: 499 }],
  },
];

function buildMarmitaCatalog(): StockCatalogItem[] {
  const seen = new Set<string>();
  const items: StockCatalogItem[] = [];
  for (const section of MENU_SECTIONS) {
    if (section.id === "premium") continue; // duplica itens já listados nas seções normais
    for (const item of section.items) {
      if (seen.has(item.id) || item.comingSoon) continue;
      seen.add(item.id);
      items.push({
        itemId: item.id,
        name: item.name,
        kind: "marmita",
        imageSrc: getMarmitaImageSrc(item.id),
        // Pronta entrega custa R$1,00 a mais que a marmita normal, no pix/dinheiro e no cartão.
        sizes: (["P", "G"] as MarmitaSize[]).map((size) => ({
          size,
          label: size,
          cashCents: item.prices[size] + STOCK_MARMITA_SURCHARGE_CENTS,
          cardCents: getMarmitaCardPriceCents(item.prices[size]) + STOCK_MARMITA_SURCHARGE_CENTS,
        })),
      });
    }
  }
  return items;
}

function buildJuiceCatalog(): StockCatalogItem[] {
  const items: StockCatalogItem[] = [];
  for (const category of JUICE_CATEGORIES) {
    if (category.comingSoon) continue;
    for (const juice of category.items) {
      items.push({
        itemId: juice.id,
        name: juice.name,
        kind: "suco",
        imageSrc: getJuiceImageSrc(juice.id),
        sizes: (["P", "G"] as JuiceSize[]).map((size) => ({
          size,
          label: `${size} (${juice.prices[size].ml}ml)`,
          cashCents: juice.prices[size].cash_cents,
          cardCents: juice.prices[size].card_cents,
        })),
      });
    }
  }
  return items;
}

export const STOCK_CATALOG: StockCatalogItem[] = [
  ...buildMarmitaCatalog(),
  ...buildJuiceCatalog(),
  ...BEBIDAS,
];

const STOCK_CATALOG_BY_ID = new Map(STOCK_CATALOG.map((item) => [item.itemId, item]));

export function getStockCatalogItem(itemId: string): StockCatalogItem | undefined {
  return STOCK_CATALOG_BY_ID.get(itemId);
}

export function getStockCatalogSizeOption(
  itemId: string,
  size: string
): StockCatalogSizeOption | undefined {
  return getStockCatalogItem(itemId)?.sizes.find((s) => s.size === size);
}
