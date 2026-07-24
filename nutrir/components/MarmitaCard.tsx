"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/api";
import { useAddonsFlow } from "@/lib/addons-flow-context";
import type { MarmitaOption, MarmitaSize } from "@/lib/menu-data";
import { getMarmitaCartSectionId } from "@/lib/menu-data";
import { getMarmitaImageSrc } from "@/lib/marmita-images";
import { getMarmitaNutrition } from "@/lib/marmita-nutrition";
import { getMarmitaCardPriceCents } from "@/lib/order-pricing";
import { MarmitaPhoto } from "@/components/MarmitaPhoto";
import { NutritionModal } from "@/components/NutritionModal";

interface Props {
  item: MarmitaOption;
  premiumBadge?: boolean;
}

export function MarmitaCard({ item, premiumBadge }: Props) {
  const { requestAdd } = useAddonsFlow();
  const [size, setSize] = useState<MarmitaSize>("P");
  const [showNutrition, setShowNutrition] = useState(false);

  const price = item.prices[size];
  const cardPrice = getMarmitaCardPriceCents(price);
  const nutrition = getMarmitaNutrition(item.id, size);

  function handleAdd() {
    const cartSectionId = getMarmitaCartSectionId(item.id);
    requestAdd({
      kind: "marmita",
      mealCount: 1,
      mealLabels: [`${item.name} — ${size}`],
      baseItem: {
        menu_id: `${item.id}-${size}`,
        item_id: item.id,
        section_id: cartSectionId,
        size,
        name: `${item.name} — ${size}`,
        quantity: 1,
        price_cents: price,
      },
    });
  }

  const imageSrc = getMarmitaImageSrc(item.id);

  return (
    <>
    <article className="card flex flex-col overflow-hidden !p-0 transition hover:shadow-md">
      <div className="photo-panel relative aspect-[5/4] w-full bg-nutrir-burgundy">
        {premiumBadge && (
          <span
            className="absolute left-2 top-2 z-10 text-xl leading-none text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] sm:left-2.5 sm:top-2.5 sm:text-2xl"
            aria-hidden
          >
            ★
          </span>
        )}
        {imageSrc && (
          <MarmitaPhoto
            src={imageSrc}
            alt={item.name}
            className="h-full w-full"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col p-2.5 sm:p-4">
        <h3 className="line-clamp-2 font-display text-sm font-bold leading-tight text-nutrir-emerald sm:text-base lg:text-lg">
          {item.name}
        </h3>
        <p className="mt-1 line-clamp-2 flex-1 text-[10px] leading-snug text-nutrir-emerald/70 sm:text-sm">
          {item.description}
        </p>

        <div className="mt-2 flex gap-1.5 sm:mt-3 sm:gap-2">
          {(["P", "G"] as MarmitaSize[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`flex-1 rounded-lg py-1.5 text-center text-[10px] font-bold transition sm:py-2 sm:text-sm ${
                size === s
                  ? "bg-nutrir-burgundy text-nutrir-nude"
                  : "bg-nutrir-emerald/10 text-nutrir-emerald hover:bg-nutrir-emerald/20"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-col gap-1.5 border-t border-nutrir-nude-dark/50 pt-2 sm:mt-3 sm:gap-2 sm:pt-3">
          <div className="text-[10px] text-nutrir-emerald/70 sm:text-sm">
            <p>
              De{" "}
              <span className="line-through text-nutrir-emerald/60">{formatPrice(cardPrice)}</span>
            </p>
            <p className="leading-snug">
              Por <strong className="text-nutrir-emerald">{formatPrice(price)}</strong> (dinheiro ou
              pix)
            </p>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="btn-primary w-full px-2 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm"
          >
            Adicionar
          </button>
          {nutrition && (
            <button
              type="button"
              onClick={() => setShowNutrition(true)}
              className="w-full text-center text-[10px] font-semibold text-nutrir-emerald underline underline-offset-2 decoration-nutrir-emerald/30 hover:decoration-nutrir-burgundy sm:text-xs"
            >
              Tabela nutricional
            </button>
          )}
        </div>
      </div>
    </article>
    {showNutrition && nutrition && (
      <NutritionModal
        marmitaName={item.name}
        facts={nutrition}
        onClose={() => setShowNutrition(false)}
      />
    )}
    </>
  );
}
