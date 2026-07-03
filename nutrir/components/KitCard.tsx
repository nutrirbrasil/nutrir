"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/api";
import { useAddonsFlow } from "@/lib/addons-flow-context";
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
    <div className="rounded-xl border border-nutrir-burgundy/25 bg-nutrir-cream/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl font-bold text-nutrir-emerald">{tier.meals}</p>
          <p className="text-xs uppercase tracking-widest text-nutrir-emerald/60">refeições</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-nutrir-emerald/70">
            De{" "}
            <span className="line-through text-nutrir-emerald/60">
              {formatPrice(pricing.card_total_cents)}
            </span>
          </p>
          <p className="text-sm text-nutrir-emerald/70">
            por{" "}
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
      <article className="card overflow-hidden p-0">
        <div className="flex flex-col md:flex-row md:items-stretch">
          <div className="flex shrink-0 flex-col items-center justify-center bg-nutrir-emerald px-6 py-8 text-center md:w-56 md:py-10 lg:w-64">
            <div className="relative h-28 w-28 md:h-32 md:w-32">
              <MarmitaPhoto
                src={KIT_IMAGES[kit.id]}
                alt={kit.name}
                className="h-full w-full"
                sizes="128px"
              />
            </div>
            <h3 className="mt-3 font-display text-2xl font-bold text-nutrir-nude">{kit.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-nutrir-nude/75">{kit.description}</p>
            <button
              type="button"
              onClick={() => setShowContent(true)}
              className="mt-4 text-sm font-semibold text-nutrir-nude underline underline-offset-4 decoration-nutrir-nude/90 hover:decoration-nutrir-nude"
            >
              Ver conteúdo do combo
            </button>
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
                      className={`rounded-full px-5 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                        size === s
                          ? "bg-nutrir-burgundy text-nutrir-nude"
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
                <label className="flex cursor-pointer items-start gap-2.5 bg-nutrir-cream/50 px-3 py-2.5 text-left text-sm leading-snug text-nutrir-emerald">
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
