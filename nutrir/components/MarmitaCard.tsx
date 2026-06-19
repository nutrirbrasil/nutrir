"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import type { MarmitaOption, MarmitaSize } from "@/lib/menu-data";
import { getMarmitaCardPriceCents } from "@/lib/order-pricing";
import type { MenuSectionId } from "@/lib/types";

interface Props {
  item: MarmitaOption;
  sectionId: MenuSectionId;
}

export function MarmitaCard({ item, sectionId }: Props) {
  const { addItem } = useCart();
  const [size, setSize] = useState<MarmitaSize>("P");

  const price = item.prices[size];
  const cardPrice = getMarmitaCardPriceCents(price);

  function handleAdd() {
    addItem({
      menu_id: `${item.id}-${size}`,
      item_id: item.id,
      section_id: sectionId,
      size,
      name: `${item.name} — ${size}`,
      quantity: 1,
      price_cents: price,
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

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-nutrir-nude-dark/50 pt-4">
        <div>
          <p className="text-sm text-nutrir-emerald/70">
            De{" "}
            <span className="line-through text-nutrir-emerald/60">{formatPrice(cardPrice)}</span> por{" "}
            <strong className="text-lg text-nutrir-burgundy">{formatPrice(price)}</strong>
          </p>
          <p className="mt-0.5 text-xs text-nutrir-emerald/60">no dinheiro ou pix</p>
        </div>
        <button type="button" onClick={handleAdd} className="btn-primary shrink-0 text-sm">
          Adicionar
        </button>
      </div>
    </article>
  );
}
