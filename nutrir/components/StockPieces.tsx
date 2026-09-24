"use client";

import type { ReactNode } from "react";
import { formatPrice } from "@/lib/api";
import { MarmitaPhoto } from "@/components/MarmitaPhoto";
import { useStockCart } from "@/lib/stock-cart-context";
import { quantityFor, type StockCatalogItem, type StockSize } from "@/lib/stock-catalog";
import type { StockRow } from "@/lib/stock-db";

export { quantityFor };

export function SizeBadge({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-nutrir-emerald/10 text-xs font-bold text-nutrir-emerald">
      {children}
    </span>
  );
}

export function QtyStepper({
  item,
  size,
  available,
  cashCents,
  cardCents,
  label,
  singlePrice,
  onFirstAdd,
}: {
  item: StockCatalogItem;
  size: StockSize;
  available: number;
  cashCents: number;
  cardCents: number;
  label: string;
  singlePrice?: boolean;
  /** Quando informado, o primeiro clique em "+" (de 0 pra 1) chama isso em vez de adicionar direto — usado pra abrir o popup de adicionais antes de reservar a marmita. */
  onFirstAdd?: () => void;
}) {
  const { items, setQuantity } = useStockCart();
  const inCart = items.find((i) => i.itemId === item.itemId && i.size === size)?.quantity ?? 0;

  function change(delta: number) {
    const next = Math.max(0, Math.min(available, inCart + delta));
    setQuantity(
      { itemId: item.itemId, size, name: item.name, imageSrc: item.imageSrc, unitCashCents: cashCents, unitCardCents: cardCents },
      next
    );
  }

  function handleIncrement() {
    if (inCart === 0 && onFirstAdd) {
      onFirstAdd();
      return;
    }
    change(1);
  }

  const priceBlock =
    singlePrice || cashCents === cardCents ? (
      <p className="font-semibold">{formatPrice(cardCents)}</p>
    ) : (
      <p>
        <span className="line-through opacity-60">{formatPrice(cardCents)}</span>{" "}
        <span className="font-semibold">{formatPrice(cashCents)} (dinheiro ou pix)</span>
      </p>
    );

  if (available <= 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-nutrir-nude-dark/50 bg-nutrir-nude-dark/10 px-3 py-2">
        <SizeBadge>{label}</SizeBadge>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-nutrir-emerald/60">Esgotado</p>
          <div className="text-[11px] text-nutrir-emerald/40">{priceBlock}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-nutrir-emerald/30 bg-nutrir-emerald/10 px-3 py-2">
      <SizeBadge>{label}</SizeBadge>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-nutrir-emerald">{priceBlock}</div>
        <p className="text-[11px] text-nutrir-emerald/60">
          {available} {available === 1 ? "unidade disponível" : "unidades disponíveis"}
        </p>
      </div>
      <button
        type="button"
        onClick={() => change(-1)}
        disabled={inCart <= 0}
        className="btn-secondary px-2 py-0.5 text-sm disabled:opacity-40"
      >
        −
      </button>
      <span className="min-w-[1.25rem] text-center text-sm font-bold tabular-nums text-nutrir-emerald">
        {inCart}
      </span>
      <button
        type="button"
        onClick={handleIncrement}
        disabled={inCart >= available}
        className="btn-secondary px-2 py-0.5 text-sm disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

export function StockItemCard({
  item,
  stock,
  onFirstAdd,
}: {
  item: StockCatalogItem;
  stock: StockRow[];
  /** Só é usado pra marmitas, pra abrir o popup de adicionais antes do primeiro item entrar na sacola. */
  onFirstAdd?: (item: StockCatalogItem, size: StockSize, cashCents: number, cardCents: number) => void;
}) {
  return (
    <div className="card flex items-start gap-4">
      {item.imageSrc && (
        <MarmitaPhoto src={item.imageSrc} alt={item.name} className="h-16 w-16 shrink-0" sizes="64px" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-bold text-nutrir-emerald">{item.name}</p>
        <div className="mt-2 space-y-2">
          {item.sizes.map((s) => (
            <QtyStepper
              key={s.size}
              item={item}
              size={s.size}
              available={quantityFor(stock, item.itemId, s.size)}
              cashCents={s.cashCents}
              cardCents={s.cardCents}
              label={s.size === "UN" ? "UN" : s.size}
              singlePrice={item.kind === "marmita"}
              onFirstAdd={
                item.kind === "marmita" && onFirstAdd
                  ? () => onFirstAdd(item, s.size, s.cashCents, s.cardCents)
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
