import type { OrderItem } from "./types";

export interface OrderItemDisplay {
  title: string;
  lines?: string[];
  addonsNote?: string;
}

function parseComboName(name: string): { title: string; lines: string[] } | null {
  const legacy = name.match(/^Combo — (\d+) marmitas \((.+)\)$/);
  if (legacy) {
    const lines = legacy[2].split(/,\s*/).map((part) => {
      const match = part.match(/^(.+?) ×(\d+)$/);
      if (!match) return part.trim();
      return `${match[2]}× ${match[1]}`;
    });
    return { title: `Combo (${legacy[1]} marmitas)`, lines };
  }

  const compact = name.match(/^Combo \((\d+) marmitas\)$/);
  if (compact) {
    return { title: `Combo (${compact[1]} marmitas)`, lines: [] };
  }

  return null;
}

/** Quantas marmitas de fato um item representa: kits e combos multiplicam por quantas
 *  vêm no nome ("28 unid.", "5 marmitas"); um item avulso é 1 marmita por unidade. */
function getItemMealCount(item: OrderItem): number {
  const kitMatch = item.name.match(/\((\d+)\s*unid\.\)/);
  if (kitMatch) return item.quantity * Number(kitMatch[1]);

  const comboMatch = item.name.match(/(\d+)\s*marmitas/);
  if (comboMatch) return item.quantity * Number(comboMatch[1]);

  return item.quantity;
}

/** Total de marmitas de um pedido (soma expandindo kits/combos), pra exibição no admin. */
export function getOrderMealCount(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + getItemMealCount(item), 0);
}

/** Linhas "N× Item: adicionais" pra listar no admin, uma por item com adicional. */
export function getOrderAddonsLines(items: OrderItem[]): string[] {
  return items
    .filter((item) => item.addons_note?.trim())
    .map((item) => {
      const note = item.addons_note!.trim();
      const withoutPrefix = note.startsWith("Adicionais:")
        ? note.slice("Adicionais:".length).trim()
        : note.replace(/^Adicionais \(.*?\):?\s*/, "");
      const flat = withoutPrefix
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" / ");
      return `${item.quantity}× ${item.name}: ${flat}`;
    });
}

export function getOrderItemDisplay(item: OrderItem): OrderItemDisplay {
  const combo = parseComboName(item.name);
  if (combo) {
    return {
      title: `${item.quantity}× ${combo.title}`,
      lines: combo.lines.length > 0 ? combo.lines : undefined,
      addonsNote: item.addons_note?.trim() || undefined,
    };
  }

  return {
    title: `${item.quantity}× ${item.name}`,
    addonsNote: item.addons_note?.trim() || undefined,
  };
}
