import type { OrderItem, PaymentMethod } from "./types";

export interface SavedOrder {
  id: string;
  customer_phone: string;
  customer_name: string;
  created_at: string;
  items: OrderItem[];
  total_cents: number;
  payment_method: PaymentMethod;
  pickup_display: string;
  notes?: string;
}

const STORAGE_KEY = "nutrir-order-history";
const MAX_ORDERS = 20;

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function loadAll(): SavedOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedOrder[]) : [];
  } catch {
    return [];
  }
}

function saveAll(orders: SavedOrder[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders.slice(0, MAX_ORDERS)));
}

export function saveOrderToHistory(order: SavedOrder): void {
  const all = loadAll();
  saveAll([order, ...all.filter((o) => o.id !== order.id)]);
}

export function getRecentOrdersForPhone(phone: string, limit = 2): SavedOrder[] {
  const key = normalizePhone(phone);
  if (!key) return [];
  return loadAll()
    .filter((o) => normalizePhone(o.customer_phone) === key)
    .slice(0, limit);
}
