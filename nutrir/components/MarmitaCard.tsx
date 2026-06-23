"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/api";
import { useAddonsFlow } from "@/lib/addons-flow-context";
import type { MarmitaOption, MarmitaSize } from "@/lib/menu-data";
import { getMarmitaCardPriceCents } from "@/lib/order-pricing";
import type { MenuSectionId } from "@/lib/types";

interface Props {
  item: MarmitaOption;
  sectionId: MenuSectionId;
}

export function MarmitaCard({ item, sectionId }: Props) {
  const { requestAdd } = useAddonsFlow();
  const [size, setSize] = useState<MarmitaSize>("P");

  const price = item.prices[size];
  const cardPrice = getMarmitaCardPriceCents(price);

  function handleAdd() {
    requestAdd({
      kind: "marmita",
      mealCount: 1,
      mealLabels: [`${item.name} — ${size}`],
      baseItem: {
        menu_id: `${item.id}-${size}`,
        item_id: item.id,
        section_id: sectionId,
        size,
        name: `${item.name} — ${size}`,
        quantity: 1,
        price_cents: price,
      },
    });
  }

  const emoji = sectionId === "frango" ? "🍗" : sectionId === "carne" ? "🥩" : "🥗";

  return (
    <article className="card flex flex-row gap-3 p-3 transition hover:shadow-md sm:flex-col sm:gap-0 sm:p-6">
      <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-xl border-2 border-nutrir-burgundy bg-nutrir-nude-dark/25 sm:mb-4 sm:aspect-square sm:h-auto sm:w-full">
        <span className="text-2xl opacity-80 sm:text-4xl">{emoji}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="font-display text-base font-bold leading-tight text-nutrir-emerald sm:text-lg">
          {item.name}
        </h3>
        <p className="mt-0.5 line-clamp-2 flex-1 text-xs text-nutrir-emerald/70 sm:mt-1 sm:line-clamp-none sm:text-sm">
          {item.description}
        </p>

        <div className="mt-2 flex gap-1.5 sm:mt-4 sm:gap-2">
          {(["P", "G"] as MarmitaSize[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`flex-1 rounded-lg py-1.5 text-center text-xs font-bold transition sm:py-2 sm:text-sm ${
                size === s
                  ? "bg-nutrir-burgundy text-nutrir-nude"
                  : "bg-nutrir-emerald/10 text-nutrir-emerald hover:bg-nutrir-emerald/20"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-2 border-t border-nutrir-nude-dark/50 pt-2 sm:mt-4 sm:flex-col sm:items-stretch sm:pt-4">
          <p className="text-xs text-nutrir-emerald/70 sm:text-sm">
            <span className="line-through text-nutrir-emerald/60">{formatPrice(cardPrice)}</span>{" "}
            <strong className="text-base text-nutrir-burgundy sm:text-lg">{formatPrice(price)}</strong>
          </p>
          <button type="button" onClick={handleAdd} className="btn-primary shrink-0 px-4 py-1.5 text-xs sm:w-full sm:py-2.5 sm:text-sm">
            Adicionar
          </button>
        </div>

        <p className="mt-1 hidden text-center text-[10px] leading-snug text-nutrir-emerald/55 sm:mt-2 sm:block">
          *Valor promocional válido apenas para pagamentos em dinheiro ou pix
        </p>
      </div>
    </article>
  );
}
