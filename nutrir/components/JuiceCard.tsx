"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import type { JuiceOption, JuiceSize } from "@/lib/juice-data";
import { getJuiceImageSrc } from "@/lib/juice-images";
import { MarmitaPhoto } from "@/components/MarmitaPhoto";

interface Props {
  item: JuiceOption;
}

export function JuiceCard({ item }: Props) {
  const { addItem } = useCart();
  const [size, setSize] = useState<JuiceSize>("P");

  const pricing = item.prices[size];
  const imageSrc = getJuiceImageSrc(item.id);

  function handleAdd() {
    addItem({
      menu_id: `${item.id}-${size}`,
      item_id: item.id,
      section_id: "suco",
      size,
      name: `${item.name} (${size})`,
      quantity: 1,
      price_cents: pricing.cash_cents,
    });
  }

  return (
    <article className="card flex flex-col overflow-hidden !p-0 transition hover:shadow-md">
      <div className="photo-panel relative aspect-[5/4] w-full bg-nutrir-burgundy">
        {imageSrc && (
          <MarmitaPhoto
            src={imageSrc}
            alt={item.name}
            className="h-full w-full"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
            fit="cover"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col p-2.5 sm:p-4">
        <h3 className="line-clamp-2 font-display text-sm font-bold leading-tight text-nutrir-emerald sm:text-base lg:text-lg">
          {item.name}
        </h3>
        <p className="mt-1 text-[10px] text-nutrir-emerald/60 sm:text-sm">
          {pricing.ml}ml
        </p>

        <div className="mt-2 flex gap-1.5 sm:mt-3 sm:gap-2">
          {(["P", "G"] as JuiceSize[]).map((s) => (
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
              <span className="line-through text-nutrir-emerald/60">
                {formatPrice(pricing.card_cents)}
              </span>
            </p>
            <p className="leading-snug">
              Por <strong className="text-nutrir-emerald">{formatPrice(pricing.cash_cents)}</strong>{" "}
              (dinheiro ou pix)
            </p>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="btn-primary w-full px-2 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm"
          >
            Adicionar
          </button>
        </div>
      </div>
    </article>
  );
}
