"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/api";
import { useAddonsFlow } from "@/lib/addons-flow-context";
import { COMBO_SECTION_IDS, navigateToComboSection } from "@/lib/combo-nav-links";
import type { KitProduct, KitTier, MarmitaSize } from "@/lib/menu-data";
import { getKitMealLabels } from "@/lib/kit-contents-data";
import { KIT_IMAGES } from "@/lib/marmita-images";
import { KitContentModal } from "./KitContentModal";
import { MarmitaPhoto } from "./MarmitaPhoto";

interface Props {
  kit: KitProduct;
}

const KIT_MARMITA_TOTAL_G: Record<MarmitaSize, number> = { P: 220, G: 380 };

function TierRow({
  kit,
  tier,
  size,
  includeVeg,
}: {
  kit: KitProduct;
  tier: KitTier;
  size: MarmitaSize;
  includeVeg: boolean;
}) {
  const { requestAdd } = useAddonsFlow();
  const pricing = tier.prices[size];
  const contentOptions = kit.id === "misto" && includeVeg ? { includeVeg: true } : undefined;
  const vegSuffix = kit.id === "misto" && includeVeg ? "-veg" : "";

  function handleAdd() {
    requestAdd({
      kind: "kit",
      mealCount: tier.meals,
      mealLabels: getKitMealLabels(kit.id, tier.meals, contentOptions),
      baseItem: {
        menu_id: `kit-${kit.id}-${tier.meals}-${size}${vegSuffix}`,
        item_id: `kit-${kit.id}-${tier.meals}${vegSuffix}`,
        section_id: "kit",
        size,
        name: `${kit.name} ${size} (${tier.meals} unid.)${
          includeVeg ? " (com vegetarianas)" : ""
        }`,
        quantity: 1,
        price_cents: pricing.cash_total_cents,
      },
    });
  }

  return (
    <div className="rounded-xl border border-nutrir-burgundy/15 bg-nutrir-cream/70 p-4 shadow-[0_1px_2px_rgb(10_58_44/0.04)] transition-shadow duration-200 hover:shadow-[0_2px_10px_rgb(10_58_44/0.08)]">
      {/* Mobile: 3 colunas numa linha só (contagem | preço centralizado | box+botão empilhados). */}
      <div className="flex items-center justify-between gap-1.5 sm:hidden">
        <div className="shrink-0 text-center">
          <p className="font-display text-xl font-bold text-nutrir-emerald">{tier.meals}</p>
          <p className="text-[10px] uppercase tracking-wide text-nutrir-emerald/60">marmitas</p>
        </div>

        <div className="min-w-0 flex-1 text-center">
          <p className="text-xs text-nutrir-emerald/70">
            De{" "}
            <span className="line-through text-nutrir-emerald/60">
              {formatPrice(pricing.card_total_cents)}
            </span>
          </p>
          <p className="text-[11px] text-nutrir-emerald/70">
            Por{" "}
            <strong className="text-nutrir-emerald">{formatPrice(pricing.cash_total_cents)}</strong>{" "}
            <span className="text-[10px]">no dinheiro ou pix</span>
          </p>
        </div>

        <div className="flex w-[5.75rem] shrink-0 flex-col gap-1.5">
          <div className="flex flex-col items-center justify-center rounded-md bg-nutrir-emerald px-2 py-1.5 text-nutrir-nude">
            <span className="text-sm font-bold tabular-nums leading-tight">
              {formatPrice(pricing.cash_per_meal_cents)}
            </span>
            <span className="text-[10px] font-normal leading-tight opacity-90">por marmita</span>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="btn-primary px-2 py-1.5 text-xs"
          >
            Adicionar
          </button>
        </div>
      </div>

      {/* Tablet/desktop: como era antes — contagem e preço em cima, box+botão lado a lado embaixo. */}
      <div className="hidden sm:block">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-xl font-bold text-nutrir-emerald">{tier.meals}</p>
            <p className="text-xs uppercase tracking-widest text-nutrir-emerald/60">marmitas</p>
          </div>
          <div className="text-left">
            <p className="text-sm text-nutrir-emerald/70">
              De{" "}
              <span className="line-through text-nutrir-emerald/60">
                {formatPrice(pricing.card_total_cents)}
              </span>
            </p>
            <p className="text-sm text-nutrir-emerald/70">
              Por{" "}
              <strong className="text-nutrir-emerald">{formatPrice(pricing.cash_total_cents)}</strong>{" "}
              no dinheiro ou pix
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-stretch gap-2">
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-md bg-nutrir-emerald px-3 py-2 text-nutrir-nude">
            <span className="text-sm font-bold tabular-nums leading-tight">
              {formatPrice(pricing.cash_per_meal_cents)}
            </span>
            <span className="text-[10px] font-normal leading-tight opacity-90">por marmita</span>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="btn-primary shrink-0 self-center px-4 py-2 text-sm"
          >
            Adicionar
          </button>
        </div>
      </div>

      {tier.note && (
        <p className="mt-2 text-center text-xs italic text-nutrir-emerald/55">{tier.note}</p>
      )}
    </div>
  );
}

export function KitCard({ kit }: Props) {
  const [size, setSize] = useState<MarmitaSize>("P");
  const [includeVeg, setIncludeVeg] = useState(false);
  const [showContent, setShowContent] = useState(false);

  return (
    <>
      <article className="card card-lift group overflow-hidden p-0">
        <div className="flex flex-col md:flex-row md:items-stretch">
          <div className="photo-panel flex shrink-0 flex-row items-center gap-4 bg-nutrir-emerald px-5 py-5 text-left md:w-56 md:flex-col md:items-center md:justify-center md:py-10 md:text-center lg:w-64">
            <div className="relative h-20 w-20 shrink-0 md:h-32 md:w-32">
              <MarmitaPhoto
                src={KIT_IMAGES[kit.id]}
                alt={kit.name}
                className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                sizes="128px"
              />
            </div>
            <div className="min-w-0 md:mt-3">
              <h3 className="font-display text-lg font-bold text-nutrir-nude md:text-2xl">
                {kit.name}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-nutrir-nude/75 md:mt-2 md:text-sm">
                {kit.description}
              </p>
              <button
                type="button"
                onClick={() => setShowContent(true)}
                className="mt-2 text-xs font-semibold text-nutrir-nude underline underline-offset-4 decoration-nutrir-nude/90 hover:decoration-nutrir-nude md:mt-4 md:text-sm"
              >
                Ver conteúdo do combo
              </button>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col bg-nutrir-nude p-5 md:p-6">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-nutrir-emerald/70">
                  Tamanho:
                </span>
                <div className="flex gap-2">
                  {(["P", "G"] as MarmitaSize[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`rounded-full px-5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                        size === s
                          ? "bg-nutrir-burgundy text-nutrir-nude shadow-[0_1px_4px_rgb(92_34_44/0.28)]"
                          : "bg-nutrir-emerald/10 text-nutrir-emerald hover:bg-nutrir-emerald/20"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-nutrir-emerald/50">
                  Total: {KIT_MARMITA_TOTAL_G[size]}g
                </span>
              </div>

              {kit.id === "misto" && (
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-nutrir-burgundy/12 bg-nutrir-cream/70 px-3 py-2.5 text-left text-sm leading-snug text-nutrir-emerald transition-colors hover:border-nutrir-burgundy/25">
                  <input
                    type="checkbox"
                    checked={includeVeg}
                    onChange={(e) => setIncludeVeg(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-nutrir-burgundy"
                  />
                  <span>Deseja incluir marmitas vegetarianas também?</span>
                </label>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {kit.tiers.map((tier) => (
                <TierRow
                  key={tier.meals}
                  kit={kit}
                  tier={tier}
                  size={size}
                  includeVeg={includeVeg}
                />
              ))}
            </div>

            <p className="mt-3 text-center text-xs text-nutrir-emerald/70">
              Deseja uma quantidade de marmitas diferente? Então:{" "}
              <button
                type="button"
                onClick={() => navigateToComboSection(COMBO_SECTION_IDS.montar)}
                className="font-bold text-nutrir-burgundy underline underline-offset-2 hover:text-nutrir-burgundy-dark"
              >
                Monte seu Combo!
              </button>
            </p>
          </div>
        </div>
      </article>

      {showContent && (
        <KitContentModal
          kit={kit}
          includeVeg={kit.id === "misto" ? includeVeg : false}
          onClose={() => setShowContent(false)}
        />
      )}
    </>
  );
}
