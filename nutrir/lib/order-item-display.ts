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
