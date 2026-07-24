"use client";

import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/api";
import { useAddonsFlow } from "@/lib/addons-flow-context";
import {
  COMBO_MEAL_MAX,
  COMBO_MEAL_MIN,
  calculateComboBuild,
  expandComboMealLabels,
  formatComboSummary,
  getComboCardTotalCents,
  getComboSectionsWithOptions,
} from "@/lib/combo-builder-data";
import type { ComboMarmitaOption } from "@/lib/combo-builder-data";
import type { MarmitaSize } from "@/lib/menu-data";
import { KIT_IMAGES, getMarmitaImageSrc } from "@/lib/marmita-images";
import { MarmitaPhoto } from "@/components/MarmitaPhoto";

const SECTION_KIT: Record<string, keyof typeof KIT_IMAGES> = {
  frango: "frango",
  carne: "carne",
  vegetariano: "veg",
};

function SizeQtyControl({
  size,
  option,
  qty,
  atLimit,
  onDec,
  onInc,
}: {
  size: MarmitaSize;
  option: ComboMarmitaOption;
  qty: number;
  atLimit: boolean;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-4 text-center text-xs font-bold text-nutrir-emerald/70">{size}</span>
      <button
        type="button"
        onClick={onDec}
        disabled={qty === 0}
        className="btn-secondary px-2.5 py-1 text-sm disabled:opacity-40"
      >
        −
      </button>
      <span className="min-w-[1.5rem] text-center text-sm font-bold tabular-nums text-nutrir-emerald">
        {qty}
      </span>
      <button
        type="button"
        onClick={onInc}
        disabled={atLimit}
        className="btn-secondary px-2.5 py-1 text-sm disabled:opacity-40"
        aria-label={`Adicionar ${option.displayName}`}
      >
        +
      </button>
    </div>
  );
}

export function ComboBuilder({ embedded = false }: { embedded?: boolean }) {
  const { requestAdd } = useAddonsFlow();
  const [targetTotal, setTargetTotal] = useState<number>(14);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [step, setStep] = useState<"total" | "pick">("total");

  const sections = useMemo(() => getComboSectionsWithOptions(), []);
  const build = useMemo(() => calculateComboBuild(quantities, targetTotal), [quantities, targetTotal]);
  const cardTotalCents = getComboCardTotalCents(build.total_cents);

  function clampTarget(value: number) {
    return Math.max(COMBO_MEAL_MIN, Math.min(COMBO_MEAL_MAX, Math.floor(value)));
  }

  function setTarget(next: number) {
    const clamped = clampTarget(next);
    setTargetTotal(clamped);
    setQuantities((prev) => {
      const current = Object.values(prev).reduce((s, q) => s + q, 0);
      if (current <= clamped) return prev;
      return {};
    });
  }

  function setQty(id: string, next: number) {
    const clamped = Math.max(0, Math.floor(next));
    setQuantities((prev) => {
      const copy = { ...prev };
      if (clamped <= 0) delete copy[id];
      else copy[id] = clamped;
      return copy;
    });
  }

  function addOne(id: string) {
    if (build.totalMeals >= targetTotal) return;
    setQty(id, (quantities[id] ?? 0) + 1);
  }

  function handleConfirmTotal() {
    setQuantities({});
    setStep("pick");
  }

  function handleChangeTotal() {
    setStep("total");
  }

  function handleAdd() {
    if (!build.isValid) return;
    requestAdd({
      kind: "combo",
      mealCount: build.totalMeals,
      mealLabels: expandComboMealLabels(build.lines),
      baseItem: {
        menu_id: `combo-build-${Date.now()}`,
        item_id: "combo-build",
        section_id: "combo",
        name: `Combo — ${formatComboSummary(build.lines)}`,
        quantity: 1,
        price_cents: build.total_cents,
      },
    });
    setQuantities({});
    setStep("total");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4">
      {!embedded && (
        <div className="card-dark text-center">
          <h2 className="font-display text-2xl font-bold text-nutrir-nude">Monte seu combo</h2>
          <p className="mt-2 inline-block rounded-full border-2 border-nutrir-nude px-4 py-1 font-display text-lg italic text-nutrir-nude">
            do seu jeito
          </p>
          <p className="mx-auto mt-4 max-w-lg text-sm text-nutrir-nude/80">
            Defina quantas marmitas quer no combo (entre {COMBO_MEAL_MIN} e {COMBO_MEAL_MAX}) e escolha
            cada uma — pode misturar tamanhos P e G.
          </p>
        </div>
      )}

      {step === "total" ? (
        <div className="card space-y-6 text-center">
          <div>
            <h3 className="font-display text-xl font-bold text-nutrir-emerald">
              Quantas marmitas no combo?
            </h3>
            <p className="mt-1 text-sm text-nutrir-emerald/60">
              Escolha de 5 a 28 unidades para o seu combo personalizado
            </p>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setTarget(targetTotal - 1)}
              disabled={targetTotal <= COMBO_MEAL_MIN}
              className="btn-secondary px-4 py-2 text-lg disabled:opacity-40"
            >
              −
            </button>
            <span className="min-w-[4rem] font-display text-5xl font-bold tabular-nums text-nutrir-emerald">
              {targetTotal}
            </span>
            <button
              type="button"
              onClick={() => setTarget(targetTotal + 1)}
              disabled={targetTotal >= COMBO_MEAL_MAX}
              className="btn-secondary px-4 py-2 text-lg disabled:opacity-40"
            >
              +
            </button>
          </div>

          <button type="button" onClick={handleConfirmTotal} className="btn-primary w-full sm:w-auto sm:px-12">
            Escolher marmitas
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-nutrir-burgundy/15 bg-nutrir-nude px-5 py-4 shadow-[0_1px_2px_rgb(10_58_44/0.04),0_6px_18px_rgb(10_58_44/0.08)]">
            <div>
              <p className="text-sm text-nutrir-emerald/70">Combo de {targetTotal} marmitas</p>
              <p className="font-display text-2xl font-bold text-nutrir-emerald">
                {build.totalMeals}{" "}
                <span className="text-base font-normal text-nutrir-emerald/60">
                  / {targetTotal} escolhidas
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleChangeTotal}
              className="text-sm font-semibold text-nutrir-burgundy underline-offset-2 hover:underline"
            >
              Alterar total
            </button>
          </div>

          <div className="space-y-8">
            {sections.map((section) => (
              <section key={section.id} className="card">
                <h3 className="mb-4 flex items-center gap-3 border-b border-nutrir-nude-dark pb-2 font-display text-lg font-bold text-nutrir-emerald">
                  <div className="relative h-10 w-10 shrink-0">
                    {SECTION_KIT[section.id] && (
                      <MarmitaPhoto
                        src={KIT_IMAGES[SECTION_KIT[section.id]]}
                        alt={section.title}
                        className="h-full w-full"
                        sizes="40px"
                      />
                    )}
                  </div>
                  {section.title}
                </h3>
                <div className="space-y-2">
                  {section.items.map((item) => {
                    const atLimit = build.totalMeals >= targetTotal;
                    const qtyP = quantities[item.bySize.P.id] ?? 0;
                    const qtyG = quantities[item.bySize.G.id] ?? 0;
                    return (
                      <div
                        key={item.item_id}
                        className="flex flex-col gap-3 rounded-xl border border-nutrir-nude-dark bg-nutrir-cream/50 px-4 py-3 shadow-[0_1px_2px_rgb(10_58_44/0.04)] sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {getMarmitaImageSrc(item.item_id) && (
                            <div className="relative h-14 w-14 shrink-0">
                              <MarmitaPhoto
                                src={getMarmitaImageSrc(item.item_id)!}
                                alt={item.name}
                                className="h-full w-full"
                                sizes="56px"
                              />
                            </div>
                          )}
                          <p className="min-w-0 font-semibold text-nutrir-emerald">{item.name}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                          <SizeQtyControl
                            size="P"
                            option={item.bySize.P}
                            qty={qtyP}
                            atLimit={atLimit}
                            onDec={() => setQty(item.bySize.P.id, qtyP - 1)}
                            onInc={() => addOne(item.bySize.P.id)}
                          />
                          <SizeQtyControl
                            size="G"
                            option={item.bySize.G}
                            qty={qtyG}
                            atLimit={atLimit}
                            onDec={() => setQty(item.bySize.G.id, qtyG - 1)}
                            onInc={() => addOne(item.bySize.G.id)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {build.totalMeals > 0 && (
            <div className="card space-y-4 !border-nutrir-emerald">
              {build.remaining > 0 && (
                <p className="text-center text-sm text-nutrir-emerald/70">
                  Faltam {build.remaining} marmita{build.remaining === 1 ? "" : "s"} para completar
                </p>
              )}

              <ul className="space-y-1.5 text-sm text-nutrir-emerald">
                {build.lines.map((line) => (
                  <li key={line.option.id}>
                    {line.option.displayName}{" "}
                    <span className="text-nutrir-emerald/50">×{line.quantity}</span>
                  </li>
                ))}
              </ul>

              <div className="rounded-xl bg-nutrir-emerald px-4 py-3 text-center text-lg font-bold leading-snug text-nutrir-nude sm:text-xl">
                De{" "}
                <span className="line-through opacity-75">{formatPrice(cardTotalCents)}</span> por{" "}
                <strong>{formatPrice(build.total_cents)}</strong>
                <span className="mt-1 block text-sm font-normal opacity-90">no Dinheiro ou Pix</span>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                disabled={!build.isValid}
                className="w-full rounded-full bg-nutrir-emerald px-6 py-2.5 text-sm font-semibold text-nutrir-nude shadow-md transition hover:bg-nutrir-emerald-dark disabled:opacity-50"
              >
                Adicionar combo à sacola
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
