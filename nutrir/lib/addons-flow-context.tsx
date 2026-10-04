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
import { useRouter } from "next/navigation";
import { AddonsModal } from "@/components/AddonsModal";
import { track } from "@/lib/analytics";
import { getBebidaById } from "@/lib/bebida-data";
import { JUICE_CATEGORIES, type JuiceSize } from "@/lib/juice-data";

export type AddonsFlowKind = "marmita" | "kit" | "combo";

export interface PendingCartAdd {
  kind: AddonsFlowKind;
  baseItem: OrderItem;
  mealCount: number;
  mealLabels: string[];
  /** Se definido, depois de adicionar à sacola vai direto pra essa rota (ex.: "Comprar agora"). */
  redirectTo?: string;
}

interface AddonsFlowContextValue {
  requestAdd: (pending: PendingCartAdd) => void;
}

const AddonsFlowContext = createContext<AddonsFlowContextValue | null>(null);

/**
 * Marmita avulsa: substituição, adicional e bebida (3 passos). Combo/kit: sem
 * adicionais, só substituição igual em todas as marmitas que aceitam e bebida (2 passos).
 */
type ModalStep = "closed" | "substitution" | "addon" | "drink";

/** Bebidas escolhidas no último passo: chave "id|tamanho" (água usa "UN") -> quantidade. */
export type DrinkSelectionMap = Record<string, number>;

function buildDrinkItem(key: string, quantity: number): OrderItem | null {
  const [id, size] = key.split("|");
  const bebida = getBebidaById(id);
  if (bebida) {
    return {
      menu_id: bebida.id,
      item_id: bebida.id,
      section_id: "bebida",
      size: "UN",
      name: bebida.name,
      quantity,
      price_cents: bebida.price_cents,
    };
  }
  const juice = JUICE_CATEGORIES.flatMap((c) => c.items).find((j) => j.id === id);
  if (!juice || (size !== "P" && size !== "G")) return null;
  return {
    menu_id: `${juice.id}-${size}`,
    item_id: juice.id,
    section_id: "suco",
    size,
    name: `${juice.name} (${size})`,
    quantity,
    price_cents: juice.prices[size].cash_cents,
  };
}

export function AddonsFlowProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { addItem, closeCart } = useCart();
  const [pending, setPending] = useState<PendingCartAdd | null>(null);
  const [step, setStep] = useState<ModalStep>("closed");
  const [selection, setSelection] = useState<AddonSelectionMap>({});
  const [drinks, setDrinks] = useState<DrinkSelectionMap>({});

  const close = useCallback(() => {
    setPending(null);
    setStep("closed");
    setSelection({});
    setDrinks({});
  }, []);

  const finalizeAdd = useCallback(() => {
    if (!pending) return;

    const addons_cents = computeSameModeAddonsCents(pending.mealLabels, selection);
    const addons_note = buildAddonsNote(pending.mealLabels, selection);
    const addon_ids = collectAddonIds(selection);

    const menuSuffix = addons_cents > 0 ? `-addons-${JSON.stringify(selection)}` : "";

    track("add_to_cart", {
      kind: pending.kind,
      item_name: pending.baseItem.name,
      item_id: pending.baseItem.item_id,
      section_id: pending.baseItem.section_id,
      size: pending.baseItem.size,
      meal_count: pending.mealCount,
      price_cents: pending.baseItem.price_cents,
      addons_cents,
      addon_ids,
      has_addons: addon_ids.length > 0,
    });
    addItem({
      ...pending.baseItem,
      menu_id: `${pending.baseItem.menu_id ?? pending.baseItem.name}${menuSuffix}`,
      addons_cents: addons_cents > 0 ? addons_cents : undefined,
      addons_note,
      addon_ids: addon_ids.length > 0 ? addon_ids : undefined,
    });
    for (const [key, quantity] of Object.entries(drinks)) {
      if (quantity <= 0) continue;
      const drinkItem = buildDrinkItem(key, quantity);
      if (!drinkItem) continue;
      track("drink_added_from_flow", { item_id: drinkItem.item_id, quantity });
      addItem(drinkItem);
    }
    if (pending.redirectTo) {
      closeCart();
      router.push(pending.redirectTo);
    }
    close();
  }, [addItem, closeCart, close, pending, router, selection, drinks]);

  const requestAdd = useCallback((next: PendingCartAdd) => {
    track("add_to_cart_started", {
      kind: next.kind,
      item_name: next.baseItem.name,
      meal_count: next.mealCount,
    });
    setPending(next);
    setSelection({});
    setDrinks({});
    setStep("substitution");
  }, []);

  const isMultiMeal = (pending?.mealCount ?? 0) > 1;

  // Combo/kit não tem passo de adicionais: vai direto das substituições para a bebida.
  const handleContinue = useCallback(() => {
    track("addons_step_completed", {
      step,
      has_selection: Object.keys(selection).length > 0,
      item_name: pending?.baseItem.name,
    });
    if (step === "substitution" && !isMultiMeal) {
      setStep("addon");
    } else if (step === "substitution" || step === "addon") {
      setStep("drink");
    } else {
      finalizeAdd();
    }
  }, [step, isMultiMeal, finalizeAdd, selection, pending]);

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
          drinks={drinks}
          onDrinksChange={setDrinks}
          onClose={() => {
            track("addons_modal_dismissed", { step, item_name: pending.baseItem.name });
            close();
          }}
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
