"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FiX } from "react-icons/fi";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/api";
import { getItemCashTotalCents } from "@/lib/order-pricing";
import { getCartSuggestions, type MarmitaSize } from "@/lib/menu-data";
import { getCartItemImageSrc, getMarmitaImageSrc } from "@/lib/marmita-images";
import { useProfile } from "@/lib/profile-context";
import { buildPerfilUrl } from "@/lib/auth-next";
import type { OrderItem } from "@/lib/types";
import { MarmitaPhoto } from "@/components/MarmitaPhoto";

function dominantSection(items: OrderItem[]): string | undefined {
  const counts: Record<string, number> = {};
  for (const item of items) {
    if (item.section_id && item.section_id !== "kit" && item.section_id !== "combo") {
      counts[item.section_id] = (counts[item.section_id] ?? 0) + item.quantity;
    }
  }
  let best: string | undefined;
  let max = 0;
  for (const [id, n] of Object.entries(counts)) {
    if (n > max) {
      max = n;
      best = id;
    }
  }
  return best;
}

export function CartSidebar() {
  const {
    items,
    isOpen,
    closeCart,
    itemCount,
    totalCents,
    updateQty,
    addItem,
  } = useCart();
  const { isLoggedIn, authLoading } = useProfile();
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  const sectionId = useMemo(() => dominantSection(items), [items]);
  const defaultSize = (items.find((i) => i.size)?.size ?? "P") as MarmitaSize;

  const suggestions = useMemo(() => {
    const inCartIds = items.map((i) => i.item_id).filter(Boolean) as string[];
    return getCartSuggestions(sectionId, inCartIds, defaultSize);
  }, [sectionId, items, defaultSize]);

  const currentSuggestion = suggestions[suggestionIndex];

  if (!isOpen) return null;

  function addSuggestion() {
    if (!currentSuggestion || !sectionId) return;
    addItem({
      menu_id: `${currentSuggestion.item.id}-${defaultSize}`,
      item_id: currentSuggestion.item.id,
      section_id: sectionId as OrderItem["section_id"],
      size: defaultSize,
      name: `${currentSuggestion.item.name} — ${defaultSize}`,
      quantity: 1,
      price_cents: currentSuggestion.price_cents,
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Fechar sacola"
        className="fixed inset-0 z-[60] bg-black/40"
        onClick={closeCart}
      />
      <aside className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-md flex-col bg-nutrir-cream shadow-2xl">
        <header className="flex items-center justify-between border-b border-nutrir-nude-dark/40 px-5 py-4">
          <h2 className="font-display text-lg font-bold text-nutrir-emerald">
            Sua sacola tem{" "}
            <span className="text-nutrir-burgundy">
              {itemCount} {itemCount === 1 ? "item" : "itens"}
            </span>
          </h2>
          <button
            type="button"
            onClick={closeCart}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-nutrir-emerald/70 hover:text-nutrir-emerald"
          >
            Ocultar
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-nutrir-emerald/30">
              <FiX />
            </span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {suggestions.length > 0 && (
            <section className="border-b border-nutrir-nude-dark/40 bg-nutrir-cream px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-nutrir-emerald">
                  Leve também
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={suggestionIndex <= 0}
                    onClick={() => setSuggestionIndex((i) => Math.max(0, i - 1))}
                    className="rounded border border-nutrir-emerald/20 px-2 py-0.5 text-xs disabled:opacity-30"
                  >
                    ‹
                  </button>
                  <span className="text-xs text-nutrir-emerald/60">
                    {suggestionIndex + 1} / {suggestions.length}
                  </span>
                  <button
                    type="button"
                    disabled={suggestionIndex >= suggestions.length - 1}
                    onClick={() =>
                      setSuggestionIndex((i) => Math.min(suggestions.length - 1, i + 1))
                    }
                    className="rounded border border-nutrir-emerald/20 px-2 py-0.5 text-xs disabled:opacity-30"
                  >
                    ›
                  </button>
                </div>
              </div>
              {currentSuggestion && (
                <div className="flex gap-3 rounded-xl border border-nutrir-nude-dark/50 bg-nutrir-cream p-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-nutrir-burgundy">
                    {getMarmitaImageSrc(currentSuggestion.item.id) && (
                      <MarmitaPhoto
                        src={getMarmitaImageSrc(currentSuggestion.item.id)!}
                        alt={currentSuggestion.item.name}
                        className="h-full w-full"
                        sizes="64px"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-nutrir-emerald">
                      {currentSuggestion.item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-nutrir-emerald/50">
                      {currentSuggestion.weight_g}g · {defaultSize}
                    </p>
                    <p className="mt-1 text-sm font-bold text-nutrir-burgundy">
                      {formatPrice(currentSuggestion.price_cents)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addSuggestion}
                    className="btn-secondary shrink-0 self-center px-3 py-1.5 text-xs"
                  >
                    Comprar
                  </button>
                </div>
              )}
            </section>
          )}

          <section className="px-5 py-4">
            {items.length === 0 ? (
              <p className="py-8 text-center text-sm text-nutrir-emerald/60">
                Sua sacola está vazia. Escolha itens no cardápio ou monte sua marmita.
              </p>
            ) : (
              <>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-nutrir-emerald/70">
                  Marmita
                </h3>
                <ul className="space-y-4">
                  {items.map((item, i) => (
                    <li
                      key={`${itemKey(item)}-${i}`}
                      className="flex gap-3 border-b border-nutrir-nude-dark/30 pb-4 last:border-0"
                    >
                      <div
                        className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg ${cartItemImageBg(item)}`}
                      >
                        {getCartItemImageSrc(item) && (
                          <MarmitaPhoto
                            src={getCartItemImageSrc(item)!}
                            alt={item.name}
                            className="h-full w-full"
                            sizes="56px"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium text-nutrir-emerald">
                          {item.name}
                        </p>
                        {item.addons_note && (
                          <p className="mt-1 whitespace-pre-line text-xs text-nutrir-emerald/55">
                            {item.addons_note}
                          </p>
                        )}
                        <p className="mt-1 text-sm font-bold text-nutrir-burgundy">
                          {formatPrice(getItemCashTotalCents(item) * item.quantity)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <div className="flex items-center rounded-lg border-2 border-nutrir-emerald/30">
                          <button
                            type="button"
                            onClick={() => updateQty(i, -1)}
                            className="px-2 py-1 text-nutrir-emerald hover:bg-nutrir-emerald/5"
                          >
                            −
                          </button>
                          <span className="min-w-[1.5rem] text-center text-sm font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(i, 1)}
                            className="px-2 py-1 text-nutrir-emerald hover:bg-nutrir-emerald/5"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>

        <footer className="border-t border-nutrir-nude-dark/40 bg-nutrir-cream px-5 py-4">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="text-sm text-nutrir-emerald/70">Total</span>
            <span className="text-xl font-bold text-nutrir-burgundy">
              {formatPrice(totalCents)}
            </span>
          </div>

          {!authLoading && !isLoggedIn ? (
            <Link
              href={buildPerfilUrl("/agendar")}
              onClick={closeCart}
              className={`btn-primary block w-full py-3.5 text-center text-sm font-bold uppercase tracking-wide ${
                items.length === 0 ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Entrar ou Criar Conta
            </Link>
          ) : (
            <Link
              href="/agendar"
              onClick={closeCart}
              className={`btn-primary block w-full py-3.5 text-center text-sm font-bold uppercase tracking-wide ${
                items.length === 0 || authLoading ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Agendar retirada
            </Link>
          )}
        </footer>
      </aside>
    </>
  );
}

function cartItemImageBg(item: OrderItem): string {
  if (
    item.section_id === "kit" ||
    item.section_id === "combo" ||
    item.item_id?.startsWith("kit-") ||
    item.menu_id?.startsWith("combo-build")
  ) {
    return "bg-nutrir-emerald";
  }
  return "bg-nutrir-burgundy";
}

function itemKey(item: OrderItem): string {
  const addonsPart = item.addons_note ? `::${item.addons_note}` : "";
  return `${item.menu_id ?? `${item.name}-${item.price_cents}`}${addonsPart}`;
}
