"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/api";
import { useAddonsFlow } from "@/lib/addons-flow-context";
import type { MarmitaOption, MarmitaSize } from "@/lib/menu-data";
import { getMarmitaImageSrc } from "@/lib/marmita-images";
import { getMarmitaCardPriceCents } from "@/lib/order-pricing";
import type { MenuSectionId } from "@/lib/types";
import { MarmitaPhoto } from "@/components/MarmitaPhoto";

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

  const imageSrc = getMarmitaImageSrc(item.id);

  return (
    <article className="card flex flex-col overflow-hidden !p-0 transition hover:shadow-md">
      <div className="relative aspect-[5/4] w-full bg-nutrir-burgundy">
        {imageSrc && (
          <MarmitaPhoto
            src={imageSrc}
            alt={item.name}
            className="h-full w-full"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-base font-bold leading-tight text-nutrir-emerald sm:text-lg">
          {item.name}
        </h3>
        <p className="mt-1 flex-1 text-xs text-nutrir-emerald/70 sm:text-sm">{item.description}</p>

        <div className="mt-3 flex gap-2">
          {(["P", "G"] as MarmitaSize[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`flex-1 rounded-lg py-2 text-center text-xs font-bold transition sm:text-sm ${
                size === s
                  ? "bg-nutrir-burgundy text-nutrir-nude"
                  : "bg-nutrir-emerald/10 text-nutrir-emerald hover:bg-nutrir-emerald/20"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t border-nutrir-nude-dark/50 pt-3">
          <div className="text-xs text-nutrir-emerald/70 sm:text-sm">
            <p>
              De{" "}
              <span className="line-through text-nutrir-emerald/60">{formatPrice(cardPrice)}</span>
            </p>
            <p>
              por <strong className="text-nutrir-emerald">{formatPrice(price)}</strong> no dinheiro
              ou pix
            </p>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="btn-primary w-full px-4 py-2 text-sm"
          >
            Adicionar
          </button>
        </div>
      </div>
    </article>
  );
}
