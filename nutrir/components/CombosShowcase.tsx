"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiX } from "react-icons/fi";
import { formatPrice } from "@/lib/api";
import { useAddonsFlow } from "@/lib/addons-flow-context";
import { track } from "@/lib/analytics";
import { getKitContentLines, getKitMealLabels } from "@/lib/kit-contents-data";
import { KIT_IMAGES } from "@/lib/marmita-images";
import { KIT_PRODUCTS, MARMITA_WEIGHT_G, type KitProduct, type MarmitaSize } from "@/lib/menu-data";
import { MarmitaPhoto } from "./MarmitaPhoto";

type KitId = KitProduct["id"];

const PLANS = [
  { meals: 7, name: "Semanal", tagline: "Uma semana resolvida" },
  { meals: 14, name: "Duplo", tagline: "Duas semanas sem pensar em comida" },
  { meals: 28, name: "Mensal", tagline: "O mês inteiro organizado" },
] as const;

const KIT_TYPES: { id: KitId; label: string; hint: string }[] = [
  { id: "premium", label: "Premium", hint: "Escondidinhos e Strogonoffs" },
  { id: "frango", label: "Frango", hint: "Leveza e praticidade" },
  { id: "carne", label: "Carne", hint: "Patinho, sabor e textura" },
  { id: "misto", label: "Misto", hint: "Frango e carne" },
  { id: "veg", label: "Vegetariano", hint: "Proteína vegetal" },
];

function getKit(id: KitId): KitProduct {
  return KIT_PRODUCTS.find((k) => k.id === id)!;
}

function getTier(id: KitId, meals: number) {
  return getKit(id).tiers.find((t) => t.meals === meals)!;
}

function ConfiguratorModal({ meals, onClose }: { meals: number; onClose: () => void }) {
  const { requestAdd } = useAddonsFlow();
  const plan = PLANS.find((p) => p.meals === meals)!;
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
  const lines = useMemo(() => getKitContentLines(kitId, meals), [kitId, meals]);

  function handleAdd() {
    requestAdd({
      kind: "kit",
      mealCount: meals,
      mealLabels: getKitMealLabels(kitId, meals),
      baseItem: {
        menu_id: `kit-${kitId}-${meals}-${size}`,
        item_id: `kit-${kitId}-${meals}`,
        section_id: "kit",
        size,
        name: `${kit.name} ${size} (${meals} unid.)`,
        quantity: 1,
        price_cents: pricing.cash_total_cents,
        meal_count: meals,
      },
    });
    onClose();
  }

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
        aria-label={`Combo ${plan.name}`}
        className="fixed inset-x-0 bottom-0 z-[90] flex max-h-[92vh] flex-col overflow-hidden rounded-t-3xl bg-nutrir-canvas shadow-2xl md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[min(88vh,760px)] md:w-[min(94vw,880px)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl"
      >
        <header className="card-dark relative flex items-center justify-between gap-4 rounded-none px-6 py-5">
          <div>
            <p className="eyebrow text-[10px] text-nutrir-nude/60">Combo {plan.name}</p>
            <h2 className="mt-1 font-display text-2xl font-bold leading-none text-nutrir-nude md:text-3xl">
              {meals} marmitas
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
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                        <span className="block text-[11px] leading-tight text-nutrir-ink/60">
                          {type.hint}
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
          </div>

          <div className="flex flex-col">
            <div className="rounded-2xl border border-nutrir-nude-dark/60 bg-nutrir-canvas-alt p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-nutrir-ink/55">
                O que vem no combo
              </p>
              <ul className="mt-3 divide-y divide-nutrir-nude-dark/50">
                {lines.map((line) => (
                  <li key={line.label} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-nutrir-ink">{line.label}</span>
                    <span className="font-display text-lg font-bold text-nutrir-burgundy">
                      {line.count}×
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] leading-snug text-nutrir-ink/50">
                Substituições (arroz integral, leite vegetal e outras) você escolhe no próximo passo.
              </p>
            </div>

            <div className="mt-4 text-center md:mt-auto md:pt-4">
              <p className="text-sm text-nutrir-ink/60">
                <span className="line-through">{formatPrice(pricing.card_total_cents)}</span>
              </p>
              <p className="font-display text-4xl font-bold leading-tight text-nutrir-ink">
                {formatPrice(pricing.cash_total_cents)}
                <span className="ml-1.5 text-sm font-medium text-nutrir-ink/60">no pix</span>
              </p>
              <p className="mt-0.5 text-sm text-nutrir-ink/70">
                {formatPrice(pricing.cash_per_meal_cents)} por marmita
              </p>
              <button type="button" onClick={handleAdd} className="btn-primary mt-4 w-full py-3.5 text-base">
                Adicionar à sacola
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

export function CombosShowcase({ onBuild }: { onBuild: () => void }) {
  const [openMeals, setOpenMeals] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
        {PLANS.map((plan) => {
          const from = getTier("frango", plan.meals).prices.P;
          return (
            <button
              key={plan.meals}
              type="button"
              onClick={() => {
                track("combo_tier_selected", { meals: plan.meals });
                setOpenMeals(plan.meals);
              }}
              className="card-dark card-lift group relative isolate flex flex-col items-center overflow-hidden !px-3 !py-6 text-center transition duration-300 hover:-translate-y-1 sm:!px-6 sm:!py-9"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-0 -z-10 h-56 w-72 -translate-x-1/2 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  opacity: 0.8,
                  background:
                    "radial-gradient(50% 50% at 50% 40%, rgb(243 232 220 / 0.18), transparent 70%)",
                }}
              />
              <p className="eyebrow text-[10px] text-nutrir-nude/60">Combo</p>
              <h3 className="mt-1 font-display text-2xl font-bold tracking-tight text-nutrir-nude sm:text-3xl">
                {plan.name}
              </h3>
              <div aria-hidden className="mt-3 flex items-center gap-3">
                <span className="h-px w-8 bg-nutrir-nude/25" />
                <span className="h-1.5 w-1.5 rotate-45 bg-nutrir-nude/45" />
                <span className="h-px w-8 bg-nutrir-nude/25" />
              </div>
              <p className="mt-4 font-display text-5xl font-black leading-none text-nutrir-nude sm:mt-5 sm:text-7xl">
                {plan.meals}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-nutrir-nude/70">
                marmitas
              </p>
              <p className="mt-3 min-h-[2.5rem] max-w-[14rem] text-xs leading-snug text-nutrir-nude/75 sm:mt-4 sm:text-sm">
                {plan.tagline}
              </p>
              <p className="mt-5 text-[10px] uppercase tracking-wider text-nutrir-nude/65 sm:mt-6 sm:text-xs">A partir de</p>
              <p className="font-display text-2xl font-bold leading-tight text-nutrir-nude sm:text-3xl">
                {formatPrice(from.cash_per_meal_cents)}
                <span className="block text-xs font-medium text-nutrir-nude/70 sm:ml-1.5 sm:inline sm:text-sm">
                  por marmita
                </span>
              </p>
              <p className="mt-1 text-[11px] text-nutrir-nude/75 sm:text-sm">
                <span className="line-through opacity-70">{formatPrice(from.card_total_cents)}</span>{" "}
                <strong className="font-bold text-nutrir-nude">
                  {formatPrice(from.cash_total_cents)}
                </strong>{" "}
                no pix
              </p>
              <span className="mt-5 sm:mt-6" />
              <span className="mt-auto inline-flex items-center rounded-full border border-nutrir-nude/40 px-4 py-2 text-xs font-bold sm:px-6 sm:text-sm text-nutrir-nude transition group-hover:bg-nutrir-nude group-hover:text-nutrir-emerald-dark">
                Escolher combo
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            track("combo_builder_card_clicked");
            onBuild();
          }}
          className="card-dark card-lift group relative isolate flex flex-col items-center overflow-hidden !px-3 !py-6 text-center ring-1 ring-inset ring-nutrir-nude/25 transition duration-300 hover:-translate-y-1 sm:!px-6 sm:!py-9"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 -z-10 h-56 w-72 -translate-x-1/2 opacity-80 transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(50% 50% at 50% 40%, rgb(243 232 220 / 0.18), transparent 70%)",
            }}
          />
          <p className="eyebrow text-[10px] text-nutrir-nude/60">Combo</p>
          <h3 className="mt-1 font-display text-2xl font-bold leading-tight tracking-tight text-nutrir-nude sm:text-3xl">
            Monte seu Combo
          </h3>
          <div aria-hidden className="mt-3 flex items-center gap-3">
            <span className="h-px w-8 bg-nutrir-nude/25" />
            <span className="h-1.5 w-1.5 rotate-45 bg-nutrir-nude/45" />
            <span className="h-px w-8 bg-nutrir-nude/25" />
          </div>
          <p className="mt-4 font-display text-4xl font-black leading-none text-nutrir-nude sm:mt-5 sm:text-6xl">
            5-60
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-nutrir-nude/70 sm:text-xs">
            marmitas
          </p>
          <p className="mt-3 min-h-[2.5rem] max-w-[14rem] text-xs leading-snug text-nutrir-nude/75 sm:mt-4 sm:text-sm">
            Personalize seu combo
          </p>
          <p className="mt-5 text-[10px] uppercase tracking-wider text-nutrir-nude/65 sm:mt-6 sm:text-xs">
            Valor variável
          </p>
          <p className="mt-1 text-[11px] leading-snug text-nutrir-nude/75 sm:text-sm">
            Depende de quantidade e sabor
          </p>
          <p className="mt-2 rounded-full bg-nutrir-nude/12 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-nutrir-nude sm:text-xs">
            Desconto progressivo
          </p>
          <span className="mt-5 sm:mt-6" />
          <span className="mt-auto inline-flex items-center rounded-full border border-nutrir-nude/40 px-4 py-2 text-xs font-bold text-nutrir-nude transition group-hover:bg-nutrir-nude group-hover:text-nutrir-emerald-dark sm:px-6 sm:text-sm">
            Montar meu combo
          </span>
        </button>
      </div>

      {openMeals !== null && (
        <ConfiguratorModal meals={openMeals} onClose={() => setOpenMeals(null)} />
      )}
    </>
  );
}
