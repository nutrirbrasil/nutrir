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

  return (
    <article className="card flex flex-col transition hover:shadow-md">
      <div className="mb-4 flex aspect-square items-center justify-center rounded-xl border-2 border-nutrir-burgundy bg-nutrir-nude-dark/25">
        <span className="text-4xl opacity-80">
          {sectionId === "frango" ? "🍗" : sectionId === "carne" ? "🥩" : "🥗"}
        </span>
      </div>

      <h3 className="font-display text-lg font-bold text-nutrir-emerald">{item.name}</h3>
      <p className="mt-1 flex-1 text-sm text-nutrir-emerald/70">{item.description}</p>

      <div className="mt-4 flex gap-2">
        {(["P", "G"] as MarmitaSize[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSize(s)}
            className={`flex-1 rounded-lg py-2 text-center text-sm font-bold transition ${
              size === s
                ? "bg-nutrir-burgundy text-nutrir-nude"
                : "bg-nutrir-emerald/10 text-nutrir-emerald hover:bg-nutrir-emerald/20"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col border-t border-nutrir-nude-dark/50 pt-4">
        <p className="flex flex-wrap items-baseline gap-x-1 text-sm text-nutrir-emerald/70">
          <span>De</span>
          <span className="line-through text-nutrir-emerald/60">{formatPrice(cardPrice)}</span>
          <span>por</span>
          <strong className="text-lg text-nutrir-burgundy">{formatPrice(price)}</strong>
        </p>
        <div className="mt-3 flex justify-center">
          <button type="button" onClick={handleAdd} className="btn-primary text-sm">
            Adicionar
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] leading-snug text-nutrir-emerald/55">
          *Valor promocional válido apenas para pagamentos em dinheiro ou pix
        </p>
      </div>
    </article>
  );
}
