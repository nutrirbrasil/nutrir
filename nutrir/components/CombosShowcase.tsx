"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiShoppingBag, FiX } from "react-icons/fi";
import { formatPrice } from "@/lib/api";
import { useAddonsFlow } from "@/lib/addons-flow-context";
import { track } from "@/lib/analytics";
import { getKitContentLines, getKitMealLabels } from "@/lib/kit-contents-data";
import { KIT_IMAGES } from "@/lib/marmita-images";
import {
  KIT_PRODUCTS,
  MARMITA_WEIGHT_G,
  MENU_SECTIONS,
  type KitProduct,
  type MarmitaSize,
} from "@/lib/menu-data";
import { MarmitaPhoto } from "./MarmitaPhoto";

type KitId = KitProduct["id"];

interface Plan {
  id: string;
  eyebrow: string;
  name: string;
  tagline: string;
  /** Opções de total de marmitas; o mensal tem 30 (7 por semana) ou 60 (14 por semana). */
  options: { meals: number; perWeek?: number }[];
}

const PLANS: Plan[] = [
  {
    id: "semanal",
    eyebrow: "Combo",
    name: "Semanal",
    tagline: "Inicie a organização da sua semana!",
    options: [{ meals: 7 }],
  },
  {
    id: "duo",
    eyebrow: "Combo",
    name: "Duo",
    tagline: "Semana resolvida: almoço e janta garantidos!",
    options: [{ meals: 14 }],
  },
  {
    id: "mensal",
    eyebrow: "Recorrente",
    name: "Mensal",
    tagline: "Pague uma vez, receba toda semana!",
    options: [
      { meals: 30, perWeek: 7 },
      { meals: 60, perWeek: 14 },
    ],
  },
];

const KIT_TYPES: { id: KitId; label: string }[] = [
  { id: "premium", label: "Premium" },
  { id: "frango", label: "Frango" },
  { id: "misto", label: "Misto" },
  { id: "carne", label: "Carne" },
];

/** Preço avulso (pix) de cada marmita pelo nome, pra comparar com o combo. */
const AVULSO_BY_NAME = (() => {
  const map = new Map<string, Record<MarmitaSize, number>>();
  for (const section of MENU_SECTIONS) {
    for (const item of section.items) {
      if (!map.has(item.name)) map.set(item.name, item.prices);
    }
  }
  return map;
})();

function getKit(id: KitId): KitProduct {
  return KIT_PRODUCTS.find((k) => k.id === id)!;
}

function getTier(id: KitId, meals: number) {
  return getKit(id).tiers.find((t) => t.meals === meals)!;
}

function ConfiguratorModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const { requestAdd } = useAddonsFlow();
  const [option, setOption] = useState(plan.options[0]);
  const meals = option.meals;
  const [size, setSize] = useState<MarmitaSize>("P");
  const [kitId, setKitId] = useState<KitId>("premium");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const kit = getKit(kitId);
  const tier = getTier(kitId, meals);
  const pricing = tier.prices[size];
  const lines = useMemo(
    () => [...getKitContentLines(kitId, meals)].sort((a, b) => b.count - a.count),
    [kitId, meals]
  );

  const avulsoTotalCents = useMemo(
    () =>
      lines.reduce((sum, line) => sum + (AVULSO_BY_NAME.get(line.label)?.[size] ?? 0) * line.count, 0),
    [lines, size]
  );
  const avulsoPerMealCents = Math.round(avulsoTotalCents / meals);
  const showSavings = avulsoTotalCents > pricing.cash_total_cents;

  function addToBag(buyNow: boolean) {
    track(buyNow ? "combo_buy_now" : "combo_add_to_bag", { kit_id: kitId, meals, size });
    requestAdd({
      kind: "kit",
      mealCount: meals,
      mealLabels: getKitMealLabels(kitId, meals),
      redirectTo: buyNow ? "/agendar" : undefined,
      baseItem: {
        menu_id: `kit-${kitId}-${meals}-${size}`,
        item_id: `kit-${kitId}-${meals}`,
        section_id: "kit",
        size,
        name: `${kit.name} ${size} (${meals} unid.)${option.perWeek ? ` - ${option.perWeek} por semana` : ""}`,
        quantity: 1,
        price_cents: pricing.cash_total_cents,
        meal_count: meals,
      },
    });
    onClose();
  }

  const priceBlock = (
    <div className="text-center">
      <p className="font-display text-2xl font-normal leading-tight text-nutrir-ink">
        {showSavings && (
          <span className="mr-2 text-nutrir-ink/50 line-through">{formatPrice(avulsoTotalCents)}</span>
        )}
        {formatPrice(pricing.cash_total_cents)}
        <span className="ml-1.5 font-sans text-sm text-nutrir-ink/60">no pix</span>
      </p>
      <p className="mt-1 text-lg font-bold text-nutrir-ink">
        {formatPrice(pricing.cash_per_meal_cents)} por marmita
      </p>
      <div className="mt-4 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => addToBag(false)}
          aria-label="Adicionar à sacola"
          title="Adicionar à sacola"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-nutrir-burgundy text-nutrir-burgundy transition hover:bg-nutrir-burgundy hover:text-nutrir-nude dark:text-nutrir-nude dark:border-nutrir-nude/60 dark:hover:bg-nutrir-nude/10"
        >
          <FiShoppingBag className="text-xl" />
        </button>
        <button type="button" onClick={() => addToBag(true)} className="btn-primary flex-1 py-3.5 text-base">
          Comprar Agora
        </button>
      </div>
      {showSavings && (
        <p className="mt-2 text-[10px] leading-snug text-nutrir-ink/55">
          Você está economizando muito! O valor médio por marmita fora do combo seria{" "}
          {formatPrice(avulsoPerMealCents)}
        </p>
      )}
    </div>
  );

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Fechar"
        className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${plan.eyebrow} ${plan.name}`}
        className="fixed inset-x-0 bottom-0 z-[90] flex h-[92vh] flex-col overflow-hidden rounded-t-3xl bg-nutrir-canvas shadow-2xl md:inset-auto md:left-1/2 md:top-1/2 md:h-[min(88vh,600px)] md:w-[min(94vw,880px)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl"
      >
        <header className="card-dark relative flex items-center justify-between gap-4 rounded-none px-6 py-5">
          <div>
            <p className="eyebrow text-[10px] text-nutrir-nude/60">
              {plan.eyebrow} {plan.name}
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold leading-none text-nutrir-nude md:text-3xl">
              {meals} marmitas
              {option.perWeek && (
                <span className="ml-2 text-base font-medium text-nutrir-nude/75 md:text-lg">
                  · {option.perWeek} por semana
                </span>
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-nutrir-nude/25 text-nutrir-nude transition hover:bg-nutrir-nude/10"
          >
            <FiX />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-5 py-5 md:grid-cols-[1.1fr_1fr] md:gap-8 md:px-7 md:py-6">
          <div className="space-y-5">
            {plan.options.length > 1 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-nutrir-ink/55">
                  Entrega por semana
                </p>
                <div className="mt-2 inline-flex rounded-full border border-nutrir-nude-dark/70 bg-nutrir-canvas-alt p-1">
                  {plan.options.map((o) => (
                    <button
                      key={o.meals}
                      type="button"
                      onClick={() => {
                        setOption(o);
                        track("combo_monthly_option_selected", { meals: o.meals });
                      }}
                      className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
                        option.meals === o.meals
                          ? "bg-nutrir-emerald text-nutrir-nude shadow-md"
                          : "text-nutrir-ink/70 hover:text-nutrir-ink"
                      }`}
                    >
                      {o.perWeek} por semana
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-nutrir-ink/55">
                Tamanho
              </p>
              <div className="mt-2 inline-flex rounded-full border border-nutrir-nude-dark/70 bg-nutrir-canvas-alt p-1">
                {(["P", "G"] as MarmitaSize[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`rounded-full px-6 py-1.5 text-sm font-bold transition ${
                      size === s
                        ? "bg-nutrir-emerald text-nutrir-nude shadow-md"
                        : "text-nutrir-ink/70 hover:text-nutrir-ink"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <span className="ml-3 text-xs text-nutrir-ink/50">Total: {MARMITA_WEIGHT_G[size]}g</span>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-nutrir-ink/55">
                Tipo de combo
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {KIT_TYPES.map((type) => {
                  const selected = kitId === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setKitId(type.id);
                        track("combo_type_selected", { meals, kit_id: type.id });
                      }}
                      aria-pressed={selected}
                      className={`group flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                        selected
                          ? "border-nutrir-emerald bg-nutrir-emerald/10 shadow-[0_6px_18px_rgb(10_58_44/0.14)]"
                          : "border-nutrir-nude-dark/60 bg-nutrir-canvas-alt hover:border-nutrir-emerald/40"
                      }`}
                    >
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-nutrir-emerald">
                        <MarmitaPhoto
                          src={KIT_IMAGES[type.id]}
                          alt=""
                          className="h-full w-full"
                          sizes="48px"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-base font-bold text-nutrir-ink">
                          {type.label}
                        </span>
                      </span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          selected
                            ? "border-nutrir-emerald bg-nutrir-emerald text-nutrir-nude"
                            : "border-nutrir-ink/25 text-transparent"
                        }`}
                      >
                        <FiCheck className="h-3 w-3" strokeWidth={3} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="hidden pt-2 md:block">{priceBlock}</div>
          </div>

          <div className="flex flex-col">
            <div className="rounded-2xl border border-nutrir-nude-dark/60 bg-nutrir-canvas-alt p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-nutrir-ink/55">
                O que vem no combo
              </p>
              <ul className="mt-3 divide-y divide-nutrir-nude-dark/50">
                {lines.map((line) => (
                  <li key={line.label} className="flex items-baseline gap-2 py-2 text-sm">
                    <span className="min-w-[1.75rem] font-display text-lg font-bold text-nutrir-burgundy">
                      {line.count}×
                    </span>
                    <span className="text-nutrir-ink">{line.label}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

export function CombosShowcase() {
  const [openPlan, setOpenPlan] = useState<Plan | null>(null);

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6">
        {PLANS.map((plan) => {
          const fromPerMeal = Math.min(
            ...plan.options.map((o) => getTier("frango", o.meals).prices.P.cash_per_meal_cents)
          );
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => {
                track("combo_tier_selected", { plan: plan.id });
                setOpenPlan(plan);
              }}
              className="card-dark card-lift group relative isolate flex flex-col items-center overflow-hidden !px-2 !py-5 text-center transition duration-300 hover:-translate-y-1 sm:!px-6 sm:!py-9"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-0 -z-10 h-56 w-72 -translate-x-1/2 opacity-80 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(50% 50% at 50% 40%, rgb(243 232 220 / 0.18), transparent 70%)",
                }}
              />
              <p className="eyebrow text-[8px] text-nutrir-nude/60 sm:text-[10px]">{plan.eyebrow}</p>
              <h3 className="mt-1 font-display text-lg font-bold tracking-tight text-nutrir-nude sm:text-3xl">
                {plan.name}
              </h3>
              <div aria-hidden className="mt-2 flex items-center gap-1.5 sm:mt-3 sm:gap-3">
                <span className="h-px w-4 bg-nutrir-nude/25 sm:w-8" />
                <span className="h-1 w-1 rotate-45 bg-nutrir-nude/45 sm:h-1.5 sm:w-1.5" />
                <span className="h-px w-4 bg-nutrir-nude/25 sm:w-8" />
              </div>
              <p className="mt-3 font-display text-3xl font-black leading-none text-nutrir-nude sm:mt-5 sm:text-6xl lg:text-7xl">
                {plan.options.map((o, i) => (
                  <span key={o.meals}>
                    {i > 0 && (
                      <span className="mx-0.5 font-sans text-xs font-semibold sm:mx-1.5 sm:text-xl">
                        ou
                      </span>
                    )}
                    {o.perWeek ?? o.meals}
                  </span>
                ))}
              </p>
              <p className="mt-1 flex min-h-[1.5rem] items-start text-center text-[8px] font-semibold uppercase tracking-[0.14em] text-nutrir-nude/70 sm:min-h-0 sm:text-xs sm:tracking-[0.22em]">
                {plan.options[0].perWeek ? "marmitas por semana" : "marmitas"}
              </p>
              <p className="mt-3 min-h-[4.5rem] text-[10px] leading-snug text-nutrir-nude/80 sm:mt-4 sm:min-h-[3rem] sm:max-w-[15rem] sm:text-sm">
                {plan.tagline}
              </p>
              <p className="mt-3 text-[8px] uppercase tracking-wider text-nutrir-nude/65 sm:mt-5 sm:text-xs">
                A partir de
              </p>
              <p className="font-display text-lg font-bold leading-tight text-nutrir-nude sm:text-3xl">
                {formatPrice(fromPerMeal)}
              </p>
              <p className="text-[9px] font-medium text-nutrir-nude/70 sm:text-sm">por marmita</p>
              <span className="mt-4 inline-flex items-center rounded-full border border-nutrir-nude/40 px-3 py-1.5 text-[10px] font-bold text-nutrir-nude transition group-hover:bg-nutrir-nude group-hover:text-nutrir-emerald-dark sm:mt-6 sm:px-6 sm:py-2 sm:text-sm">
                Escolher
              </span>
            </button>
          );
        })}
      </div>

      {openPlan && <ConfiguratorModal plan={openPlan} onClose={() => setOpenPlan(null)} />}
    </>
  );
}
