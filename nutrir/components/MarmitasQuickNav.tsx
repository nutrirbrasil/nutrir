"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";

const CHIPS = [
  { id: "premium", label: "Mais pedidos" },
  { id: "frango", label: "Frango" },
  { id: "carne", label: "Carne" },
  { id: "vegetariano", label: "Vegetariano" },
] as const;

/** Balões de atalho pras linhas do cardápio, o selecionado acompanha a rolagem. */
export function MarmitasQuickNav() {
  const [active, setActive] = useState<string>(CHIPS[0].id);

  useEffect(() => {
    const sections = CHIPS.map((c) => document.getElementById(c.id)).filter(
      (el): el is HTMLElement => !!el
    );
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function go(id: string) {
    setActive(id);
    track("menu_chip_clicked", { section: id });
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav
      aria-label="Linhas do cardápio"
      className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pt-6 [scrollbar-width:none] sm:justify-center [&::-webkit-scrollbar]:hidden"
    >
      {CHIPS.map((chip) => {
        const selected = active === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => go(chip.id)}
            aria-current={selected ? "true" : undefined}
            className={`shrink-0 rounded-full border px-5 py-2 text-sm font-semibold transition ${
              selected
                ? "border-nutrir-emerald bg-nutrir-emerald text-nutrir-nude"
                : "border-nutrir-nude-dark/70 bg-nutrir-canvas-alt text-nutrir-ink hover:border-nutrir-emerald/50"
            }`}
          >
            {chip.label}
          </button>
        );
      })}
    </nav>
  );
}
