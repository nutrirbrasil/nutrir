"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  buildAddonsNote,
  collectAddonIds,
  computeSameModeAddonsCents,
  type AddonSelectionMap,
} from "@/lib/addons-data";
import { useCart } from "@/lib/cart-context";
import type { OrderItem } from "@/lib/types";
import { AddonsModal } from "@/components/AddonsModal";

export type AddonsFlowKind = "marmita" | "kit" | "combo";

export interface PendingCartAdd {
  kind: AddonsFlowKind;
  baseItem: OrderItem;
  mealCount: number;
  mealLabels: string[];
}

interface AddonsFlowContextValue {
  requestAdd: (pending: PendingCartAdd) => void;
}

const AddonsFlowContext = createContext<AddonsFlowContextValue | null>(null);

/**
 * Fluxo de 2 passos (marmita avulsa) ou 1 passo (combo/kit, sem adicionais,
 * só substituição igual em todas as marmitas que aceitam).
 */
type ModalStep = "closed" | "substitution" | "addon";

export function AddonsFlowProvider({ children }: { children: ReactNode }) {
  const { addItem } = useCart();
  const [pending, setPending] = useState<PendingCartAdd | null>(null);
  const [step, setStep] = useState<ModalStep>("closed");
  const [selection, setSelection] = useState<AddonSelectionMap>({});

  const close = useCallback(() => {
    setPending(null);
    setStep("closed");
    setSelection({});
  }, []);

  const finalizeAdd = useCallback(() => {
    if (!pending) return;

    const addons_cents = computeSameModeAddonsCents(pending.mealLabels, selection);
    const addons_note = buildAddonsNote(pending.mealLabels, selection);
    const addon_ids = collectAddonIds(selection);

    const menuSuffix = addons_cents > 0 ? `-addons-${JSON.stringify(selection)}` : "";

    addItem({
      ...pending.baseItem,
      menu_id: `${pending.baseItem.menu_id ?? pending.baseItem.name}${menuSuffix}`,
      addons_cents: addons_cents > 0 ? addons_cents : undefined,
      addons_note,
      addon_ids: addon_ids.length > 0 ? addon_ids : undefined,
    });
    close();
  }, [addItem, close, pending, selection]);

  const requestAdd = useCallback((next: PendingCartAdd) => {
    setPending(next);
    setSelection({});
    setStep("substitution");
  }, []);

  const isMultiMeal = (pending?.mealCount ?? 0) > 1;

  // Combo/kit não tem passo de adicionais, confirma direto depois das substituições.
  const handleContinue = useCallback(() => {
    if (step === "substitution" && !isMultiMeal) {
      setStep("addon");
    } else {
      finalizeAdd();
    }
  }, [step, isMultiMeal, finalizeAdd]);

  const value = useMemo(() => ({ requestAdd }), [requestAdd]);

  return (
    <AddonsFlowContext.Provider value={value}>
      {children}
      {pending && step !== "closed" && (
        <AddonsModal
          pending={pending}
          step={step}
          isMultiMeal={isMultiMeal}
          selection={selection}
          onClose={close}
          onSelectionChange={setSelection}
          onContinue={handleContinue}
        />
      )}
    </AddonsFlowContext.Provider>
  );
}

export function useAddonsFlow() {
  const ctx = useContext(AddonsFlowContext);
  if (!ctx) throw new Error("useAddonsFlow must be used within AddonsFlowProvider");
  return ctx;
}
