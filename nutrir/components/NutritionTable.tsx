"use client";

import type { MarmitaNutritionFacts } from "@/lib/marmita-nutrition";

interface Props {
  facts: MarmitaNutritionFacts;
  compact?: boolean;
}

function fmtG(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function LabelRow({
  label,
  per100,
  perPortion,
  dv,
  indent,
  compact,
}: {
  label: string;
  per100: string;
  perPortion: string;
  dv?: string;
  indent?: boolean;
  compact?: boolean;
}) {
  const rowPad = compact ? "py-px" : "py-0.5";
  const cellGap = compact ? "pr-1" : "pr-2";
  return (
    <tr className="border-t border-black/80">
      <td className={`${rowPad} ${cellGap} ${indent ? "pl-2" : ""}`}>{label}</td>
      <td className={`${rowPad} ${cellGap} whitespace-nowrap text-right tabular-nums`}>{per100}</td>
      <td className={`${rowPad} ${cellGap} whitespace-nowrap text-right tabular-nums`}>{perPortion}</td>
      <td className={`${rowPad} ${compact ? "pr-1.5" : "pr-3"} whitespace-nowrap text-right tabular-nums`}>
        {dv ?? ""}
      </td>
    </tr>
  );
}

export function NutritionTable({ facts, compact }: Props) {
  const p = facts.totals;
  const h = facts.per_100g;
  const dv = facts.daily_values_pct;
  const portionCol = `${facts.portion_g} g`;

  const headPad = compact ? "px-1.5 py-0.5" : "px-2 py-1.5";
  const rowPad = compact ? "py-px" : "py-1";
  const cellGap = compact ? "pr-1" : "pr-2";

  return (
    <div className={compact ? "text-[8px] leading-tight" : "text-xs"}>
      <div className="border-2 border-black bg-white text-black">
        <div className={`border-b-2 border-black text-center ${headPad}`}>
          <p className={compact ? "text-[10px] font-bold leading-tight" : "text-sm font-bold leading-tight"}>
            INFORMAÇÃO NUTRICIONAL
          </p>
        </div>

        <div className={`space-y-0 border-b border-black leading-tight ${headPad}`}>
          <p>
            Porções por embalagem:{" "}
            <span className="font-semibold">{facts.servings_per_package}</span>
          </p>
          <p>
            Porção:{" "}
            <span className="font-semibold">
              {facts.portion_g} g ({facts.household_measure})
            </span>
          </p>
        </div>

        <table
          className={`w-full border-collapse leading-tight ${
            compact ? "text-[8px]" : "text-[11px] sm:text-xs"
          }`}
        >
          <thead>
            <tr className="border-b border-black">
              <th className={`${rowPad} ${compact ? "pl-1" : "pl-2"} text-left font-normal`} />
              <th className={`${rowPad} ${cellGap} text-right font-semibold`}>100 g</th>
              <th className={`${rowPad} ${cellGap} text-right font-semibold`}>{portionCol}</th>
              <th className={`${rowPad} ${compact ? "pr-1.5" : "pr-3"} text-right font-semibold`}>%VD*</th>
            </tr>
          </thead>
          <tbody className="px-2">
            <LabelRow
              compact={compact}
              label="Valor energético (kcal)"
              per100={String(h.kcal)}
              perPortion={String(p.kcal)}
              dv={String(dv.kcal)}
            />
            <LabelRow
              compact={compact}
              label="Carboidratos (g)"
              per100={fmtG(h.carbs_g)}
              perPortion={fmtG(p.carbs_g)}
              dv={String(dv.carbs_g)}
            />
            <LabelRow
              compact={compact}
              label="Açúcares totais (g)"
              per100={fmtG(0)}
              perPortion={fmtG(facts.total_sugars_g)}
              dv="0"
            />
            <LabelRow
              compact={compact}
              label="Açúcares adicionados (g)"
              per100={fmtG(0)}
              perPortion={fmtG(facts.added_sugars_g)}
              dv="0"
              indent
            />
            <LabelRow
              compact={compact}
              label="Proteínas (g)"
              per100={fmtG(h.protein_g)}
              perPortion={fmtG(p.protein_g)}
              dv={String(dv.protein_g)}
            />
            <LabelRow
              compact={compact}
              label="Gorduras totais (g)"
              per100={fmtG(h.fat_g)}
              perPortion={fmtG(p.fat_g)}
              dv={String(dv.fat_g)}
            />
            <LabelRow
              compact={compact}
              label="Gorduras saturadas (g)"
              per100={fmtG(h.saturated_fat_g ?? 0)}
              perPortion={fmtG(p.saturated_fat_g ?? 0)}
              dv={dv.saturated_fat_g != null ? String(dv.saturated_fat_g) : "0"}
              indent
            />
            <LabelRow
              compact={compact}
              label="Gorduras trans (g)"
              per100={fmtG(0)}
              perPortion={fmtG(facts.trans_fat_g)}
              dv="**"
              indent
            />
            <LabelRow
              compact={compact}
              label="Fibras alimentares (g)"
              per100={fmtG(h.fiber_g)}
              perPortion={fmtG(p.fiber_g)}
              dv={String(dv.fiber_g)}
            />
            <LabelRow
              compact={compact}
              label="Sódio (mg)"
              per100={String(h.sodium_mg)}
              perPortion={String(p.sodium_mg)}
              dv={String(dv.sodium_mg)}
            />
          </tbody>
        </table>

        <div
          className={`border-t border-black leading-tight ${
            compact ? "px-1.5 py-0.5 text-[6px]" : "px-2 py-1.5 text-[10px]"
          }`}
        >
          <p>*Percentual de valores diários fornecidos pela porção.</p>
        </div>
      </div>
    </div>
  );
}
