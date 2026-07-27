"use client";

import type { ReactNode } from "react";

/**
 * Card de plano (Basic/Pro), usado no onboarding (dois lado a lado,
 * selecionáveis) e em Perfil (card único de upgrade). Visual único pra as
 * duas telas não divergirem, features de plano moram em lib/plan.ts.
 */
export function PlanCard({
  name,
  price,
  billingNote,
  cycleToggle,
  badge,
  features,
  soon,
  highlighted = false,
  bonus,
  cta,
}: {
  name: string;
  price: string;
  // Nota abaixo do preço (ex: "cobrado R$ 597,00/ano"), ver lib/plan.ts
  // PRO_ANNUAL_BILLING_NOTE, exibida só quando o ciclo anual está selecionado.
  billingNote?: string;
  // Alternância mensal/anual, só o card Pro tem ciclo (ver lib/plan.ts
  // PLAN_PRICES, Basic não tem opção anual).
  cycleToggle?: {
    value: "mensal" | "anual";
    onChange: (cycle: "mensal" | "anual") => void;
  };
  badge?: string;
  features: string[];
  soon?: { title: string; description: string }[];
  highlighted?: boolean;
  // Bônus de destaque do plano (ex: dieta pronta revisada por nutricionista)
  //, ver lib/plan.ts PRO_BONUS, exibido só no card Pro.
  bonus?: string[];
  cta: ReactNode;
}) {
  return (
    <div
      className={`card card-sheen flex h-full flex-col p-4 transition-all duration-300 hover:-translate-y-1 hover:border-nootr-bordo/50 hover:shadow-[0_18px_40px_rgba(0,0,0,0.4)] sm:p-6 ${
        highlighted ? "border-nootr-bordo/60 shadow-[0_0_0_1px_rgba(138,30,50,0.25)]" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-lg text-nootr-cream sm:text-2xl">{name}</p>
        {badge && (
          <span className="shrink-0 rounded-full bg-nootr-bordo px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-caps text-nootr-cream sm:px-2.5 sm:text-[10px]">
            {badge}
          </span>
        )}
      </div>

      {cycleToggle && (
        <div className="mt-3 inline-flex self-start rounded-lg border border-nootr-line p-0.5 text-[10px] sm:text-xs">
          <button
            type="button"
            onClick={() => cycleToggle.onChange("mensal")}
            className={`rounded-md px-2 py-1 font-semibold transition-colors sm:px-3 ${
              cycleToggle.value === "mensal" ? "bg-nootr-bordo text-nootr-cream" : "text-nootr-faint hover:text-nootr-cream"
            }`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => cycleToggle.onChange("anual")}
            className={`rounded-md px-2 py-1 font-semibold transition-colors sm:px-3 ${
              cycleToggle.value === "anual" ? "bg-nootr-bordo text-nootr-cream" : "text-nootr-faint hover:text-nootr-cream"
            }`}
          >
            Anual
          </button>
        </div>
      )}

      <p className="mt-2 text-xs font-semibold text-nootr-bordoSoft sm:text-sm">{price}</p>
      {billingNote && <p className="text-[10px] text-nootr-faint sm:text-[11px]">{billingNote}</p>}

      <ul className="mt-4 space-y-2 text-xs text-nootr-cream/90 sm:mt-5 sm:space-y-2.5 sm:text-sm">
        {features.map((item) => (
          <li key={item} className="flex gap-2 sm:gap-2.5">
            <span className="mt-0.5 shrink-0 text-nootr-bordoSoft" aria-hidden>
              ✓
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {bonus && bonus.length > 0 && (
        <div className="mt-5 border-t border-nootr-line pt-3 sm:mt-6 sm:pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-caps text-nootr-bordoSoft sm:text-[11px]">
            Bônus
          </p>
          <ul className="mt-2.5 space-y-2 text-xs text-nootr-cream/90 sm:mt-3 sm:space-y-2.5 sm:text-sm">
            {bonus.map((item) => (
              <li key={item} className="flex gap-2 sm:gap-2.5">
                <span className="mt-0.5 shrink-0 text-nootr-bordoSoft" aria-hidden>
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {soon && soon.length > 0 && (
        <div className="mt-5 border-t border-nootr-line pt-3 sm:mt-6 sm:pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-caps text-nootr-bordoSoft sm:text-[11px]">
            Em breve no Pro
          </p>
          <ul className="mt-2.5 space-y-2.5 sm:mt-3 sm:space-y-3">
            {soon.map((item) => (
              <li key={item.title}>
                <p className="text-xs text-nootr-cream/90 sm:text-sm">{item.title}</p>
                <p className="text-[11px] leading-relaxed text-nootr-faint sm:text-xs">{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto pt-5 sm:pt-6">{cta}</div>
    </div>
  );
}
