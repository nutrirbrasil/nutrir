"use client";

import { useCallback, useEffect, useState } from "react";
import { FiTruck } from "react-icons/fi";
import {
  COMBO_NAV_EVENT,
  COMBO_SECTION_IDS,
  navigateToComboSection,
} from "@/lib/combo-nav-links";
import { ComboBuilder } from "./ComboBuilder";
import { KitCard } from "./KitCard";
import { Reveal } from "./Reveal";
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

  const goToSection = useCallback((sectionId: string) => {
    if (sectionId === COMBO_SECTION_IDS.montar) {
      setTab("montar");
    } else if (sectionId.startsWith("combo-")) {
      setTab("combos");
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => scrollToComboSection(sectionId));
    });
  }, []);

  useEffect(() => {
    function handleHash() {
      const hash = window.location.hash.replace("#", "");
      if (!hash.startsWith("combo-")) return;
      goToSection(hash);
    }

    function handleNavEvent(event: Event) {
      const sectionId = (event as CustomEvent<{ sectionId: string }>).detail?.sectionId;
      if (sectionId) goToSection(sectionId);
    }

    handleHash();
    window.addEventListener("hashchange", handleHash);
    window.addEventListener(COMBO_NAV_EVENT, handleNavEvent);
    return () => {
      window.removeEventListener("hashchange", handleHash);
      window.removeEventListener(COMBO_NAV_EVENT, handleNavEvent);
    };
  }, [goToSection]);

  function selectTab(next: CardapioTab) {
    setTab(next);
    if (next === "montar") {
      navigateToComboSection(COMBO_SECTION_IDS.montar);
    } else {
      navigateToComboSection(COMBO_SECTION_IDS.frango);
    }
  }

  return (
    <div>
      <section className="card-dark relative isolate overflow-hidden rounded-none px-6 py-7 text-center md:py-9">
        {/* Bloom de luz suave que respira atrás do título. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[300px] w-[640px] max-w-[150%] -translate-x-1/2 animate-glow-drift"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 42%, rgb(243 232 220 / 0.16), transparent 70%)",
          }}
        />

        <p
          className="eyebrow animate-fade-up inline-flex items-center gap-1.5 text-[10px] text-nutrir-nude/60"
          style={{ animationDelay: "40ms" }}
        >
          <FiTruck aria-hidden />
          Entregas em Piçarras e Penha
        </p>

        <h1
          className="hero-heading animate-fade-up mx-auto mt-2.5 max-w-2xl text-[2.1rem] leading-[1.05] md:text-6xl"
          style={{ animationDelay: "120ms" }}
        >
          Combos
        </h1>

        <div
          className="animate-fade-up mx-auto mt-3 flex items-center justify-center gap-3"
          style={{ animationDelay: "200ms" }}
          aria-hidden
        >
          <span className="h-px w-10 bg-nutrir-nude/25" />
          <span className="h-1.5 w-1.5 rotate-45 bg-nutrir-nude/45" />
          <span className="h-px w-10 bg-nutrir-nude/25" />
        </div>

        <p
          className="animate-fade-up mx-auto mt-3 max-w-xl font-display text-lg font-bold uppercase tracking-wide text-nutrir-nude/90 sm:text-xl md:text-2xl"
          style={{ animationDelay: "260ms" }}
        >
          A partir de <strong className="hero-underline">R$14,99</strong>
        </p>

        <p
          className="animate-fade-up mx-auto mt-2 max-w-xl font-display text-xs font-bold uppercase tracking-wide text-nutrir-nude/70 sm:text-sm"
          style={{ animationDelay: "300ms" }}
        >
          Comida de verdade, feita por quem entende
        </p>

        <p
          className="animate-fade-up mx-auto mt-3 max-w-xl text-[0.85rem] leading-relaxed text-nutrir-nude/85"
          style={{ animationDelay: "320ms" }}
        >
          Combos pensados e montados por nutricionistas,
          <br />
          para facilitar sua rotina semanal e mensal.
        </p>

        <div
          className="animate-fade-up mt-5 flex flex-wrap justify-center gap-3"
          style={{ animationDelay: "400ms" }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              className={`rounded-full px-8 py-3 text-sm font-bold tracking-wide transition-all duration-200 ${
                tab === t.id
                  ? "bg-nutrir-burgundy text-nutrir-nude shadow-[0_2px_6px_rgb(92_34_44/0.3),0_10px_24px_rgb(92_34_44/0.28)]"
                  : "border border-nutrir-nude/25 text-nutrir-nude/90 hover:border-nutrir-nude/45 hover:bg-nutrir-nude/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12">
        {tab === "combos" && (
          <section id="combos" className="scroll-mt-28 space-y-8">
            {KIT_PRODUCTS.map((kit, index) => (
              <div key={kit.id} id={KIT_SECTION_ID[kit.id]} className="scroll-mt-28">
                <Reveal delay={index * 90}>
                  <KitCard kit={kit} />
                </Reveal>
              </div>
            ))}

            <Reveal className="pt-4 text-center">
              <p className="text-nutrir-emerald/70">Não encontrou o que procurava?</p>
              <button
                type="button"
                onClick={() => selectTab("montar")}
                className="mt-2 font-display text-xl font-bold italic text-nutrir-burgundy underline-offset-4 transition hover:underline"
              >
                Monte seu próprio combo!
              </button>
            </Reveal>
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
