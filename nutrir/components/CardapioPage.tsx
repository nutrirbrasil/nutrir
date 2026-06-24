"use client";

import { useEffect, useState } from "react";
import { COMBO_SECTION_IDS } from "@/lib/combo-nav-links";
import { ComboBuilder } from "./ComboBuilder";
import { KitCard } from "./KitCard";
import { KIT_PRODUCTS } from "@/lib/menu-data";

type CardapioTab = "combos" | "montar";

const TABS: { id: CardapioTab; label: string }[] = [
  { id: "combos", label: "Combos" },
  { id: "montar", label: "Monte seu Combo" },
];

const KIT_SECTION_ID: Record<string, string> = {
  frango: COMBO_SECTION_IDS.frango,
  carne: COMBO_SECTION_IDS.carne,
  misto: COMBO_SECTION_IDS.misto,
  veg: COMBO_SECTION_IDS.veg,
};

function scrollToComboSection(sectionId: string) {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function CardapioPage() {
  const [tab, setTab] = useState<CardapioTab>("combos");

  useEffect(() => {
    function handleHash() {
      const hash = window.location.hash.replace("#", "");
      if (!hash.startsWith("combo-")) return;

      if (hash === COMBO_SECTION_IDS.montar) {
        setTab("montar");
        window.requestAnimationFrame(() => scrollToComboSection(hash));
        return;
      }

      setTab("combos");
      window.requestAnimationFrame(() => scrollToComboSection(hash));
    }

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  return (
    <div>
      <section className="card-dark relative overflow-hidden px-6 py-14 text-center md:py-20">
        <p className="font-display text-sm italic text-nutrir-nude/70">@nutrirpicarras</p>
        <h1 className="mt-2 font-display text-5xl font-bold tracking-tight text-nutrir-nude md:text-6xl">
          COMBOS
        </h1>
        <p className="hero-tagline-stroke mt-3 font-sans text-lg font-bold uppercase tracking-[0.4em] md:text-xl">
          Kits
        </p>
        <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-nutrir-nude/85">
          Marmitas pensadas, desenvolvidas e montadas por nutricionistas.
          <br />
          Tudo para facilitar sua dieta e sua rotina.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-8 py-2.5 text-sm font-bold transition ${
                tab === t.id
                  ? "bg-nutrir-burgundy text-nutrir-nude shadow-md"
                  : "border border-nutrir-nude/30 text-nutrir-nude hover:bg-nutrir-nude/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12">
        {tab === "combos" && (
          <section id="combos" className="scroll-mt-28">
            <div className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-2 md:mx-0 md:gap-8 md:px-0">
              {KIT_PRODUCTS.map((kit) => (
                <div
                  key={kit.id}
                  id={KIT_SECTION_ID[kit.id]}
                  className="w-[min(88vw,22rem)] shrink-0 snap-center scroll-mt-28 md:w-[24rem] lg:w-[26rem]"
                >
                  <KitCard kit={kit} />
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-nutrir-emerald/70">Não encontrou o que procurava?</p>
              <button
                type="button"
                onClick={() => {
                  setTab("montar");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="mt-2 font-display text-xl font-bold text-nutrir-burgundy underline-offset-4 transition hover:underline"
              >
                Monte seu próprio combo!
              </button>
            </div>
          </section>
        )}

        {tab === "montar" && (
          <div id={COMBO_SECTION_IDS.montar} className="scroll-mt-28 py-4">
            <ComboBuilder embedded />
          </div>
        )}
      </div>
    </div>
  );
}
