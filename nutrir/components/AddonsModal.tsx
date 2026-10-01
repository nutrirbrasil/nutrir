"use client";

import { FiCheck, FiX } from "react-icons/fi";
import { formatPrice } from "@/lib/api";
import {
  computeSameModeAddonsCents,
  getAddonUnitPriceCents,
  getAddonsForSameSelection,
  MAX_ADDON_PORTIONS,
  type MealAddon,
  type AddonSelectionMap,
} from "@/lib/addons-data";
import type { PendingCartAdd } from "@/lib/addons-flow-context";
import { MarmitaPhoto } from "@/components/MarmitaPhoto";

type ModalStep = "substitution" | "addon";

interface Props {
  pending: PendingCartAdd;
  step: ModalStep;
  isMultiMeal: boolean;
  selection: AddonSelectionMap;
  onClose: () => void;
  onSelectionChange: (next: AddonSelectionMap) => void;
  onContinue: () => void;
}

function QtyStepper({
  qty,
  onDec,
  onInc,
}: {
  qty: number;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={onDec}
        disabled={qty <= 0}
        className="btn-secondary px-2 py-0.5 text-sm disabled:opacity-40"
      >
        −
      </button>
      <span className="min-w-[1.25rem] text-center text-sm font-bold tabular-nums text-nutrir-ink">
        {qty}
      </span>
      <button
        type="button"
        onClick={onInc}
        disabled={qty >= MAX_ADDON_PORTIONS}
        className="btn-secondary px-2 py-0.5 text-sm disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

function formatAddonPriceTag(unitCents: number): string {
  return unitCents > 0 ? `+${formatPrice(unitCents)}` : formatPrice(unitCents);
}

function CircularCheck({ selected }: { selected: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
        selected
          ? "border-nutrir-burgundy bg-nutrir-burgundy text-nutrir-nude"
          : "border-nutrir-ink/25 text-transparent"
      }`}
    >
      <FiCheck className="h-3.5 w-3.5" strokeWidth={3} />
    </span>
  );
}

function AddonThumb({ addon }: { addon: MealAddon }) {
  if (!addon.imageSrc) return null;
  return (
    <MarmitaPhoto src={addon.imageSrc} alt="" className="h-10 w-10 shrink-0" sizes="40px" />
  );
}

function AddonCard({
  addon,
  qty,
  onDec,
  onInc,
}: {
  addon: MealAddon;
  qty: number;
  onDec: () => void;
  onInc: () => void;
}) {
  const unitCents = getAddonUnitPriceCents(addon);
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-nutrir-nude-dark/60 bg-nutrir-canvas-alt/50 px-2.5 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <AddonThumb addon={addon} />
          <p className="text-sm font-semibold text-nutrir-ink">{addon.name}</p>
        </div>
        <span className="shrink-0 text-sm font-bold text-nutrir-burgundy">
          {formatAddonPriceTag(unitCents)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-nutrir-ink/60">{addon.portionLabel}</span>
        <QtyStepper qty={qty} onDec={onDec} onInc={onInc} />
      </div>
    </div>
  );
}

function SubstitutionCard({
  addon,
  selected,
  onToggle,
}: {
  addon: MealAddon;
  selected: boolean;
  onToggle: () => void;
}) {
  const unitCents = getAddonUnitPriceCents(addon);
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
        selected
          ? "border-nutrir-burgundy bg-nutrir-burgundy/5"
          : "border-nutrir-nude-dark/60 bg-white hover:border-nutrir-burgundy/30"
      }`}
    >
      <CircularCheck selected={selected} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-nutrir-ink">{addon.name}</p>
          <span className="shrink-0 text-sm font-bold text-nutrir-burgundy">
            {formatAddonPriceTag(unitCents)}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-nutrir-ink/60">{addon.portionLabel}</p>
      </div>
    </button>
  );
}

export function AddonsModal({
  pending,
  step,
  isMultiMeal,
  selection,
  onClose,
  onSelectionChange,
  onContinue,
}: Props) {
  const allAddons = getAddonsForSameSelection(pending.mealLabels, pending.baseItem.item_id);
  const substitutionAddons = allAddons.filter((a) => a.forStarch);
  const regularAddons = allAddons.filter((a) => !a.forStarch);
  const stepAddons = step === "substitution" ? substitutionAddons : regularAddons;

  const previewTotal = computeSameModeAddonsCents(pending.mealLabels, selection);
  const hasSelectionInStep = stepAddons.some((addon) => (selection[addon.id] ?? 0) > 0);

  function setPortions(id: string, portions: number) {
    const next = { ...selection };
    if (portions <= 0) delete next[id];
    else next[id] = portions;
    onSelectionChange(next);
  }

  function toggleSubstitution(addon: MealAddon) {
    const currentlySelected = (selection[addon.id] ?? 0) > 0;
    const next = { ...selection };
    if (currentlySelected) {
      delete next[addon.id];
    } else {
      if (addon.exclusiveGroup) {
        for (const other of substitutionAddons) {
          if (other.id !== addon.id && other.exclusiveGroup === addon.exclusiveGroup) {
            delete next[other.id];
          }
        }
      }
      next[addon.id] = 1;
    }
    onSelectionChange(next);
  }

  const title =
    step === "substitution"
      ? isMultiMeal
        ? "Deseja alguma substituição em todas as marmitas?"
        : "Deseja alguma substituição?"
      : "Deseja algum adicional?";

  const skipLabel = step === "substitution" ? "Não desejo substituições" : "Não desejo adicionais";
  const continueLabel = hasSelectionInStep ? "Continuar" : skipLabel;

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
        className="fixed left-1/2 top-1/2 z-[90] flex max-h-[min(90vh,720px)] w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-nutrir-canvas-alt shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-nutrir-nude-dark/40 px-5 py-4">
          <h2 className="font-display text-xl font-bold text-nutrir-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-nutrir-emerald/20 text-nutrir-ink/70 hover:bg-nutrir-emerald/5"
          >
            <FiX />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {step === "substitution" ? (
            <div className="space-y-2">
              {substitutionAddons.map((addon) => {
                const selected = (selection[addon.id] ?? 0) > 0;
                return (
                  <SubstitutionCard
                    key={addon.id}
                    addon={addon}
                    selected={selected}
                    onToggle={() => toggleSubstitution(addon)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {regularAddons.map((addon) => (
                <AddonCard
                  key={addon.id}
                  addon={addon}
                  qty={selection[addon.id] ?? 0}
                  onDec={() => setPortions(addon.id, (selection[addon.id] ?? 0) - 1)}
                  onInc={() => setPortions(addon.id, (selection[addon.id] ?? 0) + 1)}
                />
              ))}
            </div>
          )}

          {previewTotal > 0 && (
            <p className="mt-4 text-center text-sm text-nutrir-ink/70">
              Total adicionais:{" "}
              <strong className="text-nutrir-burgundy">{formatPrice(previewTotal)}</strong>
            </p>
          )}
        </div>

        <footer className="border-t border-nutrir-nude-dark/40 px-5 py-4">
          <button type="button" onClick={onContinue} className="btn-primary w-full py-2.5">
            {continueLabel}
          </button>
        </footer>
      </div>
    </>
  );
}
