"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/api";
import { useAddonsFlow } from "@/lib/addons-flow-context";
import type { KitProduct, KitTier, MarmitaSize } from "@/lib/menu-data";
import { getKitMealLabels } from "@/lib/kit-contents-data";
import { KitContentModal } from "./KitContentModal";

interface Props {
  kit: KitProduct;
}

function TierRow({
  kit,
  tier,
  size,
}: {
  kit: KitProduct;
  tier: KitTier;
  size: MarmitaSize;
}) {
  const { requestAdd } = useAddonsFlow();
  const pricing = tier.prices[size];

  function handleAdd() {
    requestAdd({
      kind: "kit",
      mealCount: tier.meals,
      mealLabels: getKitMealLabels(kit.id, tier.meals),
      baseItem: {
        menu_id: `kit-${kit.id}-${tier.meals}-${size}`,
        item_id: `kit-${kit.id}-${tier.meals}`,
        section_id: "kit",
        size,
        name: `${kit.name} — ${tier.meals} refeições — ${size}`,
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
            </span>{" "}
            por{" "}
            <strong className="text-nutrir-emerald">{formatPrice(pricing.cash_total_cents)}</strong>
          </p>
          <p className="mt-0.5 text-xs text-nutrir-emerald/60">no dinheiro ou pix</p>
        </div>
      </div>

      <div className="mt-3 flex justify-center">
        <div className="inline-flex w-[72%] justify-center items-center gap-2 rounded-md bg-nutrir-emerald px-4 py-2 text-nutrir-nude">
          <span className="text-sm font-bold tabular-nums">
            {formatPrice(pricing.cash_per_meal_cents)}
          </span>
          <span className="text-xs font-normal opacity-90">por marmita</span>
        </div>
      </div>

      {tier.note && (
        <p className="mt-2 text-center text-xs italic text-nutrir-emerald/55">{tier.note}</p>
      )}

      <button type="button" onClick={handleAdd} className="btn-primary mt-3 w-full text-sm">
        Adicionar combo
      </button>
    </div>
  );
}

export function KitCard({ kit }: Props) {
  const [size, setSize] = useState<MarmitaSize>("P");
  const [showContent, setShowContent] = useState(false);

  const emoji = kit.id === "frango" ? "🍗" : kit.id === "carne" ? "🥩" : "🍱";

  return (
    <>
      <article className="card flex flex-col overflow-hidden p-0">
        <div className="bg-nutrir-emerald px-5 py-5 text-center">
          <span className="text-3xl">{emoji}</span>
          <h3 className="mt-2 font-display text-2xl font-bold text-nutrir-nude">{kit.name}</h3>
          <p className="mt-1 text-sm text-nutrir-nude/75">{kit.description}</p>
          <button
            type="button"
            onClick={() => setShowContent(true)}
            className="mt-3 text-sm font-semibold text-nutrir-nude underline-offset-2 hover:underline"
          >
            Ver conteúdo
          </button>
        </div>

        <div className="flex flex-1 flex-col space-y-4 bg-nutrir-nude p-5">
          <div className="flex justify-center gap-2">
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

          <div className="space-y-3">
            {kit.tiers.map((tier) => (
              <TierRow key={tier.meals} kit={kit} tier={tier} size={size} />
            ))}
          </div>
        </div>
      </article>

      {showContent && <KitContentModal kit={kit} onClose={() => setShowContent(false)} />}
    </>
  );
}
