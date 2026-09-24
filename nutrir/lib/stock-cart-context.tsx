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
import type { StockSize } from "./stock-catalog";

/** Sacola independente da sacola principal do site — só existe dentro de /estoque, não se mistura com o pedido agendado. */
const STORAGE_KEY = "nutrir-stock-cart";

export interface StockCartItem {
  itemId: string;
  size: StockSize;
  name: string;
  imageSrc?: string;
  quantity: number;
  unitCashCents: number;
  unitCardCents: number;
  /** Adicionais (potes de molho/ketchup/etc.) escolhidos ao adicionar este item, se houver. */
  addonsCents?: number;
  addonsNote?: string;
}

interface StockCartContextValue {
  items: StockCartItem[];
  itemCount: number;
  cashTotalCents: number;
  setQuantity: (item: Omit<StockCartItem, "quantity">, quantity: number) => void;
  removeItem: (itemId: string, size: StockSize) => void;
  clearCart: () => void;
}

const StockCartContext = createContext<StockCartContextValue | null>(null);

function keyOf(itemId: string, size: StockSize): string {
  return `${itemId}::${size}`;
}

function loadCart(): StockCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StockCartItem[]) : [];
  } catch {
    return [];
  }
}

export function StockCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<StockCartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    // Só grava depois de carregar o que já tinha salvo — senão o primeiro
    // render (items ainda vazio) sobrescreve a sacola real com "[]" assim que
    // o provider remonta (ex.: ao sair de /estoque pra logar e voltar).
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, hydrated]);

  const setQuantity = useCallback(
    (item: Omit<StockCartItem, "quantity">, quantity: number) => {
      setItems((prev) => {
        const k = keyOf(item.itemId, item.size);
        const rest = prev.filter((i) => keyOf(i.itemId, i.size) !== k);
        if (quantity <= 0) return rest;
        return [...rest, { ...item, quantity }];
      });
    },
    []
  );

  const removeItem = useCallback((itemId: string, size: StockSize) => {
    setItems((prev) => prev.filter((i) => keyOf(i.itemId, i.size) !== keyOf(itemId, size)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);
  const cashTotalCents = useMemo(
    () => items.reduce((s, i) => s + i.unitCashCents * i.quantity + (i.addonsCents ?? 0), 0),
    [items]
  );

  const value = useMemo(
    () => ({ items, itemCount, cashTotalCents, setQuantity, removeItem, clearCart }),
    [items, itemCount, cashTotalCents, setQuantity, removeItem, clearCart]
  );

  return <StockCartContext.Provider value={value}>{children}</StockCartContext.Provider>;
}

export function useStockCart(): StockCartContextValue {
  const ctx = useContext(StockCartContext);
  if (!ctx) throw new Error("useStockCart precisa estar dentro de StockCartProvider");
  return ctx;
}
