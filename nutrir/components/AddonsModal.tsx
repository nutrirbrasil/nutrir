"use client";

import { FiX } from "react-icons/fi";
import { formatPrice } from "@/lib/api";
import {
  computeSameModeAddonsCents,
  getAddonUnitPriceCents,
  getAddonsForMealHint,
  getAddonsForSameSelection,
  MAX_ADDON_PORTIONS,
  type MealAddon,
  selectionMapTotalCents,
  type AddonSelectionMap,
} from "@/lib/addons-data";
import type { PendingCartAdd } from "@/lib/addons-flow-context";
import { getMarmitaImageFromLabel, shortMealLabel } from "@/lib/marmita-images";
import { MarmitaPhoto } from "@/components/MarmitaPhoto";

type ModalStep = "pick_same" | "pick_custom";

interface Props {
  pending: PendingCartAdd;
  step: ModalStep;
  isMultiMeal: boolean;
  sameSelection: AddonSelectionMap;
  perMealSelection: AddonSelectionMap[];
  activeMealIndex: number;
  onClose: () => void;
  onChooseSameMode: () => void;
  onSameSelectionChange: (next: AddonSelectionMap) => void;
  onPerMealSelectionChange: (next: AddonSelectionMap[]) => void;
  onActiveMealIndexChange: (index: number) => void;
  onConfirmSame: () => void;
  onConfirmCustom: () => void;
  onBack: () => void;
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
      <span className="min-w-[1.25rem] text-center text-sm font-bold tabular-nums text-nutrir-emerald">
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

function SubstitutionToggle({ selected, onToggle }: { selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition ${
        selected
          ? "bg-nutrir-burgundy text-nutrir-nude"
          : "border border-nutrir-emerald/30 text-nutrir-emerald hover:bg-nutrir-emerald/5"
      }`}
    >
      {selected ? "Selecionado" : "Selecionar"}
    </button>
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
    <div className="flex flex-col gap-1.5 rounded-xl border border-nutrir-nude-dark/60 bg-nutrir-cream/50 px-2.5 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-nutrir-emerald">{addon.name}</p>
        <span className="shrink-0 text-sm font-bold text-nutrir-burgundy">
          {formatAddonPriceTag(unitCents)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-nutrir-emerald/60">{addon.portionLabel}</span>
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
    <div className="flex flex-col gap-1.5 rounded-xl border border-nutrir-nude-dark/60 bg-white px-2.5 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-nutrir-emerald">{addon.name}</p>
        <span className="shrink-0 text-sm font-bold text-nutrir-burgundy">
          {formatAddonPriceTag(unitCents)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-nutrir-emerald/60">{addon.portionLabel}</span>
        <SubstitutionToggle selected={selected} onToggle={onToggle} />
      </div>
    </div>
  );
}

function AddonPicker({
  addons,
  selection,
  onChange,
  columns,
}: {
  addons: MealAddon[];
  selection: AddonSelectionMap;
  onChange: (next: AddonSelectionMap) => void;
  columns: 2 | 3;
}) {
  function setPortions(id: string, portions: number) {
    const next = { ...selection };
    if (portions <= 0) delete next[id];
    else next[id] = portions;
    onChange(next);
  }

  function toggleSubstitution(addon: MealAddon) {
    const currentlySelected = (selection[addon.id] ?? 0) > 0;
    const next = { ...selection };
    if (currentlySelected) {
      delete next[addon.id];
    } else {
      if (addon.exclusiveGroup) {
        for (const other of addons) {
          if (other.id !== addon.id && other.exclusiveGroup === addon.exclusiveGroup) {
            delete next[other.id];
          }
        }
      }
      next[addon.id] = 1;
    }
    onChange(next);
  }

  const regularAddons = addons.filter((a) => !a.forStarch);
  const substitutionAddons = addons.filter((a) => a.forStarch);
  const gridClass = columns === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className="space-y-4">
      {regularAddons.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-nutrir-emerald/55">
            Adicionais
          </p>
          <div className={`grid gap-2 ${gridClass}`}>
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
        </div>
      )}
      {substitutionAddons.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-nutrir-emerald/55">
            Substituições
          </p>
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
        </div>
      )}
    </div>
  );
}

function MealSidebar({
  labels,
  activeIndex,
  onSelect,
}: {
  labels: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <aside className="flex w-[7.5rem] shrink-0 flex-col gap-1 overflow-y-auto border-r border-nutrir-nude-dark/40 bg-nutrir-nude/70 p-2 sm:w-36">
      {labels.map((label, index) => {
        const thumbSrc = getMarmitaImageFromLabel(label, true);
        const active = activeIndex === index;

        return (
          <button
            key={`${label}-${index}`}
            type="button"
            onClick={() => onSelect(index)}
            className={`flex w-full flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-center transition ${
              active
                ? "border-nutrir-burgundy bg-nutrir-burgundy/10"
                : "border-transparent hover:bg-nutrir-emerald/5"
            }`}
          >
            <div className="relative h-11 w-11 overflow-hidden rounded-md border border-nutrir-nude-dark/40">
              {thumbSrc && (
                <MarmitaPhoto
                  src={thumbSrc}
                  alt={shortMealLabel(label)}
                  className="h-full w-full"
                  sizes="44px"
                />
              )}
            </div>
            <span
              className={`line-clamp-2 text-[10px] font-semibold leading-tight ${
                active ? "text-nutrir-burgundy" : "text-nutrir-emerald"
              }`}
            >
              {shortMealLabel(label)}
            </span>
          </button>
        );
      })}
    </aside>
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
  onChooseSameMode,
  onSameSelectionChange,
  onPerMealSelectionChange,
  onActiveMealIndexChange,
  onConfirmSame,
  onConfirmCustom,
  onBack,
}: Props) {
  const perMealTotal = selectionMapTotalCents(perMealSelection[activeMealIndex] ?? {});
  const previewSameTotal = computeSameModeAddonsCents(pending.mealLabels, sameSelection);
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

  const isCustomStep = step === "pick_custom";
  const reachedSameViaLink = step === "pick_same" && isMultiMeal;

  const title =
    step === "pick_same"
      ? isMultiMeal
        ? "Adicionais em todas as marmitas"
        : "Escolha os adicionais"
      : "Adicionais e Substituições por marmita";

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
        className={`fixed left-1/2 top-1/2 z-[90] flex max-h-[min(90vh,720px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-nutrir-cream shadow-2xl ${
          isCustomStep ? "w-[min(96vw,760px)]" : "w-[min(92vw,480px)]"
        }`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-nutrir-nude-dark/40 px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-bold text-nutrir-emerald">{title}</h2>
            <p className="mt-1 text-sm text-nutrir-emerald/65">{pending.baseItem.name}</p>
            {isCustomStep && (
              <button
                type="button"
                onClick={onChooseSameMode}
                className="mt-1.5 text-xs font-semibold text-nutrir-burgundy underline underline-offset-2 hover:text-nutrir-emerald"
              >
                Adicionar mesmo adicional em todas
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-nutrir-emerald/20 text-nutrir-emerald/70 hover:bg-nutrir-emerald/5"
          >
            <FiX />
          </button>
        </header>

        <div
          className={`flex min-h-0 flex-1 ${isCustomStep ? "flex-row overflow-hidden" : "overflow-y-auto px-5 py-4"}`}
        >
          {isCustomStep && (
            <MealSidebar
              labels={pending.mealLabels}
              activeIndex={activeMealIndex}
              onSelect={onActiveMealIndexChange}
            />
          )}

          <div className={`min-w-0 flex-1 overflow-y-auto ${isCustomStep ? "px-4 py-3" : ""}`}>
            {!isCustomStep && (
              <>
                <AddonPicker
                  columns={2}
                  addons={sameModeAddons}
                  selection={sameSelection}
                  onChange={onSameSelectionChange}
                />
                {previewSameTotal > 0 && (
                  <p className="mt-4 text-center text-sm text-nutrir-emerald/70">
                    Total adicionais:{" "}
                    <strong className="text-nutrir-burgundy">
                      {formatPrice(previewSameTotal)}
                    </strong>
                  </p>
                )}
              </>
            )}

            {isCustomStep && (
              <>
                <p className="mb-2 text-sm font-semibold text-nutrir-emerald">
                  {shortMealLabel(pending.mealLabels[activeMealIndex] ?? "")}
                </p>
                <AddonPicker
                  columns={3}
                  addons={customModeAddons}
                  selection={perMealSelection[activeMealIndex] ?? {}}
                  onChange={(next) => {
                    const copy = [...perMealSelection];
                    copy[activeMealIndex] = next;
                    onPerMealSelectionChange(copy);
                  }}
                />
                {previewCustomTotal > 0 && (
                  <p className="mt-3 text-center text-sm text-nutrir-emerald/70">
                    Total adicionais:{" "}
                    <strong className="text-nutrir-burgundy">
                      {formatPrice(previewCustomTotal)}
                    </strong>
                  </p>
                )}
                {perMealTotal > 0 && (
                  <p className="mt-1 text-center text-xs text-nutrir-emerald/55">
                    Esta marmita: {formatPrice(perMealTotal)}
                  </p>
                )}
                <button
                  type="button"
                  onClick={onConfirmCustom}
                  className="btn-primary mt-4 w-full py-2.5"
                >
                  Adicionar à sacola
                </button>
              </>
            )}
          </div>
        </div>

        {!isCustomStep && (
          <footer className="flex flex-wrap gap-2 border-t border-nutrir-nude-dark/40 px-5 py-4">
            {reachedSameViaLink && (
              <button type="button" onClick={onBack} className="btn-secondary flex-1 py-2.5">
                Voltar
              </button>
            )}
            <button type="button" onClick={onConfirmSame} className="btn-primary flex-1 py-2.5">
              Adicionar à sacola
            </button>
          </footer>
        )}
      </div>
    </>
  );
}
