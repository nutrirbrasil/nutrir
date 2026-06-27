"use client";

import { FiX } from "react-icons/fi";
import { formatPrice } from "@/lib/api";
import {
  getAddonUnitPriceCents,
  getAddonsForMealHint,
  getAddonsForSameSelection,
  MAX_ADDON_PORTIONS,
  type MealAddon,
  selectionMapTotalCents,
  type AddonSelectionMap,
} from "@/lib/addons-data";
import type { PendingCartAdd } from "@/lib/addons-flow-context";

type ModalStep = "ask" | "mode" | "pick_same" | "pick_custom";

interface Props {
  pending: PendingCartAdd;
  step: ModalStep;
  isMultiMeal: boolean;
  sameSelection: AddonSelectionMap;
  perMealSelection: AddonSelectionMap[];
  activeMealIndex: number;
  onClose: () => void;
  onDeclineAddons: () => void;
  onAcceptAddons: () => void;
  onChooseSameMode: () => void;
  onChooseCustomMode: () => void;
  onSameSelectionChange: (next: AddonSelectionMap) => void;
  onPerMealSelectionChange: (next: AddonSelectionMap[]) => void;
  onActiveMealIndexChange: (index: number) => void;
  onConfirmSame: () => void;
  onConfirmCustom: () => void;
  onBack: () => void;
}

function AddonPicker({
  addons,
  selection,
  onChange,
}: {
  addons: MealAddon[];
  selection: AddonSelectionMap;
  onChange: (next: AddonSelectionMap) => void;
}) {
  function setPortions(id: string, portions: number) {
    const next = { ...selection };
    if (portions <= 0) delete next[id];
    else next[id] = portions;
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {addons.map((addon) => {
        const qty = selection[addon.id] ?? 0;
        const unitCents = getAddonUnitPriceCents(addon);
        return (
          <div
            key={addon.id}
            className="flex flex-col gap-2 rounded-xl border border-nutrir-nude-dark/60 bg-nutrir-cream/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-semibold text-nutrir-emerald">{addon.name}</p>
              <p className="text-xs text-nutrir-emerald/60">
                {addon.portionLabel} · {formatPrice(unitCents)} cada
              </p>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setPortions(addon.id, qty - 1)}
                disabled={qty <= 0}
                className="btn-secondary px-3 py-1 text-sm disabled:opacity-40"
              >
                −
              </button>
              <span className="min-w-[1.5rem] text-center text-sm font-bold tabular-nums text-nutrir-emerald">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setPortions(addon.id, qty + 1)}
                disabled={qty >= MAX_ADDON_PORTIONS}
                className="btn-secondary px-3 py-1 text-sm disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AddonsModal({
  pending,
  step,
  isMultiMeal,
  sameSelection,
  perMealSelection,
  activeMealIndex,
  onClose,
  onDeclineAddons,
  onAcceptAddons,
  onChooseSameMode,
  onChooseCustomMode,
  onSameSelectionChange,
  onPerMealSelectionChange,
  onActiveMealIndexChange,
  onConfirmSame,
  onConfirmCustom,
  onBack,
}: Props) {
  const perMealTotal = selectionMapTotalCents(perMealSelection[activeMealIndex] ?? {});
  const sameTotalPerMeal = selectionMapTotalCents(sameSelection);
  const previewSameTotal = sameTotalPerMeal * pending.mealCount;
  const previewCustomTotal = perMealSelection.reduce(
    (sum, meal) => sum + selectionMapTotalCents(meal),
    0
  );

  const sameModeAddons = getAddonsForSameSelection(
    pending.mealLabels,
    pending.baseItem.item_id
  );
  const customModeAddons = getAddonsForMealHint(
    pending.mealLabels[activeMealIndex] ?? ""
  );

  const title =
    step === "ask"
      ? "Deseja adicionais?"
      : step === "mode"
        ? "Como aplicar os adicionais?"
        : step === "pick_same"
          ? isMultiMeal
            ? "Adicionais em todas as marmitas"
            : "Escolha os adicionais"
          : "Adicionais por marmita";

  return (
    <>
      <button
        type="button"
        aria-label="Fechar"
        className="fixed inset-0 z-[80] bg-black/45"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 z-[90] flex max-h-[min(90vh,720px)] w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-nutrir-cream shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-nutrir-nude-dark/40 px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-bold text-nutrir-emerald">{title}</h2>
            <p className="mt-1 text-sm text-nutrir-emerald/65">{pending.baseItem.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-nutrir-emerald/20 text-nutrir-emerald/70 hover:bg-nutrir-emerald/5"
          >
            <FiX />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === "mode" && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={onChooseSameMode}
                className="w-full rounded-xl border-2 border-nutrir-emerald/25 bg-nutrir-nude px-4 py-4 text-left transition hover:border-nutrir-burgundy"
              >
                <p className="font-semibold text-nutrir-emerald">Mesmo adicional em todas</p>
                <p className="mt-1 text-xs text-nutrir-emerald/60">
                  Escolha uma vez para todas marmitas.
                </p>
              </button>
              <button
                type="button"
                onClick={onChooseCustomMode}
                className="w-full rounded-xl border-2 border-nutrir-emerald/25 bg-nutrir-nude px-4 py-4 text-left transition hover:border-nutrir-burgundy"
              >
                <p className="font-semibold text-nutrir-emerald">Personalizar por marmita</p>
                <p className="mt-1 text-xs text-nutrir-emerald/60">
                  Escolha adicionais individualmente para cada marmita.
                </p>
              </button>
            </div>
          )}

          {step === "pick_same" && (
            <>
              <AddonPicker
                addons={sameModeAddons}
                selection={sameSelection}
                onChange={onSameSelectionChange}
              />
              {previewSameTotal > 0 && (
                <p className="mt-4 text-center text-sm text-nutrir-emerald/70">
                  Total adicionais:{" "}
                  <strong className="text-nutrir-burgundy">{formatPrice(previewSameTotal)}</strong>
                  {isMultiMeal && (
                    <span className="block text-xs">
                      ({formatPrice(sameTotalPerMeal)} × {pending.mealCount} marmitas)
                    </span>
                  )}
                </p>
              )}
            </>
          )}

          {step === "pick_custom" && (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {pending.mealLabels.map((label, index) => (
                  <button
                    key={`${label}-${index}`}
                    type="button"
                    onClick={() => onActiveMealIndexChange(index)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      activeMealIndex === index
                        ? "bg-nutrir-burgundy text-nutrir-nude"
                        : "bg-nutrir-emerald/10 text-nutrir-emerald hover:bg-nutrir-emerald/20"
                    }`}
                  >
                    {index + 1}. {label}
                  </button>
                ))}
              </div>
              <p className="mb-3 text-sm font-medium text-nutrir-emerald">
                {pending.mealLabels[activeMealIndex]}
              </p>
              <AddonPicker
                addons={customModeAddons}
                selection={perMealSelection[activeMealIndex] ?? {}}
                onChange={(next) => {
                  const copy = [...perMealSelection];
                  copy[activeMealIndex] = next;
                  onPerMealSelectionChange(copy);
                }}
              />
              {previewCustomTotal > 0 && (
                <p className="mt-4 text-center text-sm text-nutrir-emerald/70">
                  Total adicionais:{" "}
                  <strong className="text-nutrir-burgundy">{formatPrice(previewCustomTotal)}</strong>
                </p>
              )}
              {perMealTotal > 0 && (
                <p className="mt-1 text-center text-xs text-nutrir-emerald/55">
                  Esta marmita: {formatPrice(perMealTotal)}
                </p>
              )}
            </>
          )}
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-nutrir-nude-dark/40 px-5 py-4">
          {step === "ask" ? (
            <>
              <button type="button" onClick={onDeclineAddons} className="btn-secondary flex-1 py-2.5">
                Não, obrigado
              </button>
              <button type="button" onClick={onAcceptAddons} className="btn-primary flex-1 py-2.5">
                Sim, quero adicionais
              </button>
            </>
          ) : step === "mode" ? (
            <button type="button" onClick={onBack} className="btn-secondary w-full py-2.5">
              Voltar
            </button>
          ) : (
            <>
              <button type="button" onClick={onBack} className="btn-secondary flex-1 py-2.5">
                Voltar
              </button>
              <button
                type="button"
                onClick={step === "pick_same" ? onConfirmSame : onConfirmCustom}
                className="btn-primary flex-1 py-2.5"
              >
                Adicionar à sacola
              </button>
            </>
          )}
        </footer>
      </div>
    </>
  );
}
