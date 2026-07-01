"use client";

import type { MarmitaNutritionFacts } from "@/lib/marmita-nutrition";

interface Props {
  facts: MarmitaNutritionFacts;
  compact?: boolean;
}

function Row({
  label,
  value,
  dv,
  bold,
}: {
  label: string;
  value: string;
  dv?: string;
  bold?: boolean;
}) {
  return (
    <tr className={bold ? "border-t border-nutrir-emerald/20 font-semibold" : ""}>
      <td className="py-1.5 pr-3 text-nutrir-emerald/80">{label}</td>
      <td className="py-1.5 pr-3 text-right tabular-nums text-nutrir-emerald">{value}</td>
      <td className="py-1.5 text-right tabular-nums text-nutrir-emerald/60">
        {dv != null ? `${dv}%` : "—"}
      </td>
    </tr>
  );
}

export function NutritionTable({ facts, compact }: Props) {
  const t = facts.totals;
  const dv = facts.daily_values_pct;

  return (
    <div className={compact ? "text-xs" : "text-sm"}>
      <p className="mb-2 text-[10px] leading-snug text-nutrir-emerald/55 sm:text-xs">
        Porção de <strong className="text-nutrir-emerald/70">{facts.portion_g} g</strong> (tamanho{" "}
        {facts.size}). Valores calculados com base na TACO (NEPA/UNICAMP, 4ª ed.). %VD com base em
        2 000 kcal/dia (RDC 429/2020).
      </p>

      <div className="overflow-x-auto rounded-lg border border-nutrir-nude-dark/60">
        <table className="w-full min-w-[240px] border-collapse">
          <thead>
            <tr className="bg-nutrir-emerald/5 text-left text-[10px] uppercase tracking-wide text-nutrir-emerald/60 sm:text-xs">
              <th className="px-3 py-2 font-semibold">Nutriente</th>
              <th className="px-3 py-2 text-right font-semibold">Por porção</th>
              <th className="px-3 py-2 text-right font-semibold">%VD*</th>
            </tr>
          </thead>
          <tbody className="px-3">
            <Row
              label="Valor energético"
              value={`${t.kcal} kcal`}
              dv={String(dv.kcal)}
              bold
            />
            <Row label="Carboidratos" value={`${t.carbs_g} g`} dv={String(dv.carbs_g)} />
            <Row label="Proteínas" value={`${t.protein_g} g`} dv={String(dv.protein_g)} />
            <Row label="Gorduras totais" value={`${t.fat_g} g`} dv={String(dv.fat_g)} />
            {t.saturated_fat_g != null && t.saturated_fat_g > 0 && (
              <Row
                label="Gorduras saturadas"
                value={`${t.saturated_fat_g} g`}
                dv={dv.saturated_fat_g != null ? String(dv.saturated_fat_g) : undefined}
              />
            )}
            <Row label="Fibra alimentar" value={`${t.fiber_g} g`} dv={String(dv.fiber_g)} />
            <Row label="Sódio" value={`${t.sodium_mg} mg`} dv={String(dv.sodium_mg)} />
          </tbody>
        </table>
      </div>

      {!compact && (
        <details className="mt-3 text-[10px] text-nutrir-emerald/55 sm:text-xs">
          <summary className="cursor-pointer font-medium text-nutrir-emerald/70">
            Composição da porção (ingredientes)
          </summary>
          <ul className="mt-2 space-y-1 pl-1">
            {facts.ingredients.map((ing) => (
              <li key={`${ing.food.id}-${ing.grams}`}>
                {ing.grams} g — {ing.food.label}{" "}
                <span className="text-nutrir-emerald/45">({ing.food.source})</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="mt-2 text-[10px] leading-snug text-nutrir-emerald/45">
        *%VD = percentual dos valores diários de referência com base em uma dieta de 2 000 kcal.
        Informação nutricional estimada; não substitui orientação profissional.
      </p>
    </div>
  );
}
