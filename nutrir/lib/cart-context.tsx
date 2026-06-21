"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { OrderItem } from "./types";
import { getItemCashTotalCents } from "./order-pricing";

const STORAGE_KEY = "nutrir-cart";

interface CartContextValue {
  items: OrderItem[];
  isOpen: boolean;
  itemCount: number;
  totalCents: number;
  addItem: (item: OrderItem) => void;
  updateQty: (index: number, delta: number) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
  replaceItems: (items: OrderItem[]) => void;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function itemKey(item: OrderItem): string {
  const addonsPart = item.addons_note ? `::${item.addons_note}` : "";
  return `${item.menu_id ?? `${item.name}-${item.price_cents}`}${addonsPart}`;
}

function loadCart(): OrderItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OrderItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((item: OrderItem) => {
    setItems((prev) => {
      const key = itemKey(item);
      const idx = prev.findIndex((i) => itemKey(i) === key);
      if (idx >= 0) {
        return prev.map((i, n) =>
          n === idx ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, item];
    });
    setIsOpen(true);
  }, []);

  const updateQty = useCallback((index: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((item, i) =>
          i === index ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const replaceItems = useCallback((next: OrderItem[]) => {
    setItems(next);
  }, []);

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const totalCents = useMemo(
    () => items.reduce((sum, i) => sum + getItemCashTotalCents(i) * i.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      isOpen,
      itemCount,
      totalCents,
      addItem,
      updateQty,
      removeItem,
      clearCart,
      replaceItems,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
    }),
    [items, isOpen, itemCount, totalCents, addItem, updateQty, removeItem, clearCart, replaceItems]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
