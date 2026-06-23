import type { OrderItem } from "./types";

export function hasItemAddons(item: OrderItem): boolean {
  return (item.addons_cents ?? 0) > 0 || Boolean(item.addons_note?.trim());
}

export function formatItemAddonsLabel(item: OrderItem): string {
  return hasItemAddons(item) ? "Com adicionais" : "Sem adicionais";
}
