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
  computeMealAddonsCents,
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

type ModalStep = "closed" | "ask" | "mode" | "pick_same" | "pick_custom";

function emptyPerMeal(count: number): AddonSelectionMap[] {
  return Array.from({ length: count }, () => ({}));
}

export function AddonsFlowProvider({ children }: { children: ReactNode }) {
  const { addItem } = useCart();
  const [pending, setPending] = useState<PendingCartAdd | null>(null);
  const [step, setStep] = useState<ModalStep>("closed");
  const [sameSelection, setSameSelection] = useState<AddonSelectionMap>({});
  const [perMealSelection, setPerMealSelection] = useState<AddonSelectionMap[]>([]);
  const [activeMealIndex, setActiveMealIndex] = useState(0);

  const close = useCallback(() => {
    setPending(null);
    setStep("closed");
    setSameSelection({});
    setPerMealSelection([]);
    setActiveMealIndex(0);
  }, []);

  const finalizeAdd = useCallback(
    (
      mode: "none" | "same" | "custom" | "single",
      same?: AddonSelectionMap,
      perMeal?: AddonSelectionMap[]
    ) => {
      if (!pending) return;

      const addons_cents =
        mode === "none"
          ? 0
          : computeMealAddonsCents(
              mode === "single" ? "single" : mode,
              pending.mealCount,
              same,
              perMeal
            );

      const addons_note =
        mode === "none"
          ? undefined
          : buildAddonsNote(
              mode === "single" ? "single" : mode,
              pending.mealLabels,
              same,
              perMeal
            );

      const menuSuffix =
        addons_cents > 0
          ? `-addons-${mode}-${JSON.stringify(same ?? perMeal ?? {})}`
          : "";

      addItem({
        ...pending.baseItem,
        menu_id: `${pending.baseItem.menu_id ?? pending.baseItem.name}${menuSuffix}`,
        addons_cents: addons_cents > 0 ? addons_cents : undefined,
        addons_note,
      });
      close();
    },
    [addItem, close, pending]
  );

  const requestAdd = useCallback((next: PendingCartAdd) => {
    setPending(next);
    setSameSelection({});
    setPerMealSelection(emptyPerMeal(next.mealCount));
    setActiveMealIndex(0);
    setStep("ask");
  }, []);

  const value = useMemo(() => ({ requestAdd }), [requestAdd]);

  const isMultiMeal = (pending?.mealCount ?? 0) > 1;

  return (
    <AddonsFlowContext.Provider value={value}>
      {children}
      {pending && step !== "closed" && (
        <AddonsModal
          pending={pending}
          step={step}
          isMultiMeal={isMultiMeal}
          sameSelection={sameSelection}
          perMealSelection={perMealSelection}
          activeMealIndex={activeMealIndex}
          onClose={close}
          onDeclineAddons={() => finalizeAdd("none")}
          onAcceptAddons={() => {
            if (isMultiMeal) setStep("mode");
            else setStep("pick_same");
          }}
          onChooseSameMode={() => setStep("pick_same")}
          onChooseCustomMode={() => setStep("pick_custom")}
          onSameSelectionChange={setSameSelection}
          onPerMealSelectionChange={setPerMealSelection}
          onActiveMealIndexChange={setActiveMealIndex}
          onConfirmSame={() => finalizeAdd(isMultiMeal ? "same" : "single", sameSelection)}
          onConfirmCustom={() => finalizeAdd("custom", undefined, perMealSelection)}
          onBack={() => {
            if (step === "pick_same" || step === "pick_custom") {
              setStep(isMultiMeal ? "mode" : "ask");
            } else if (step === "mode") {
              setStep("ask");
            }
          }}
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
