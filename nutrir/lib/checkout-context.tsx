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
import {
  clearCheckoutDraft,
  loadCheckoutDraft,
  saveCheckoutDraft,
  type CheckoutDraft,
} from "./checkout-draft";

interface CheckoutContextValue {
  draft: CheckoutDraft | null;
  hydrated: boolean;
  setDraft: (draft: CheckoutDraft) => void;
  patchDraft: (data: Partial<CheckoutDraft>) => void;
  resetCheckout: () => void;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<CheckoutDraft | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDraftState(loadCheckoutDraft());
    setHydrated(true);
  }, []);

  const setDraft = useCallback((next: CheckoutDraft) => {
    setDraftState(next);
    saveCheckoutDraft(next);
  }, []);

  const patchDraft = useCallback((data: Partial<CheckoutDraft>) => {
    setDraftState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...data };
      saveCheckoutDraft(next);
      return next;
    });
  }, []);

  const resetCheckout = useCallback(() => {
    setDraftState(null);
    clearCheckoutDraft();
  }, []);

  const value = useMemo(
    () => ({ draft, hydrated, setDraft, patchDraft, resetCheckout }),
    [draft, hydrated, setDraft, patchDraft, resetCheckout]
  );

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout() {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used within CheckoutProvider");
  return ctx;
}
