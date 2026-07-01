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
}: {
  label: string;
  per100: string;
  perPortion: string;
  dv?: string;
  indent?: boolean;
}) {
  return (
    <tr className="border-t border-black/80">
      <td className={`py-0.5 pr-2 ${indent ? "pl-3" : ""}`}>{label}</td>
      <td className="py-0.5 pr-2 text-right tabular-nums">{per100}</td>
      <td className="py-0.5 pr-2 text-right tabular-nums">{perPortion}</td>
      <td className="py-0.5 text-right tabular-nums">{dv ?? ""}</td>
    </tr>
  );
}

export function NutritionTable({ facts, compact }: Props) {
  const p = facts.totals;
  const h = facts.per_100g;
  const dv = facts.daily_values_pct;
  const portionCol = `${facts.portion_g} g`;

  return (
    <div className={compact ? "text-[10px]" : "text-xs"}>
      <div className="border-2 border-black bg-white text-black">
        <div className="border-b-2 border-black px-2 py-1.5 text-center">
          <p className="text-sm font-bold leading-tight">INFORMAÇÃO NUTRICIONAL</p>
        </div>

        <div className="space-y-0.5 border-b border-black px-2 py-1.5 leading-snug">
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

        <table className="w-full border-collapse text-[11px] leading-tight sm:text-xs">
          <thead>
            <tr className="border-b border-black">
              <th className="py-1 pl-2 text-left font-normal" />
              <th className="py-1 pr-2 text-right font-semibold">100 g</th>
              <th className="py-1 pr-2 text-right font-semibold">{portionCol}</th>
              <th className="py-1 pr-2 text-right font-semibold">%VD*</th>
            </tr>
          </thead>
          <tbody className="px-2">
            <LabelRow
              label="Valor energético (kcal)"
              per100={String(h.kcal)}
              perPortion={String(p.kcal)}
              dv={String(dv.kcal)}
            />
            <LabelRow
              label="Carboidratos (g)"
              per100={fmtG(h.carbs_g)}
              perPortion={fmtG(p.carbs_g)}
              dv={String(dv.carbs_g)}
            />
            <LabelRow
              label="Açúcares totais (g)"
              per100={fmtG(0)}
              perPortion={fmtG(facts.total_sugars_g)}
              dv="0"
            />
            <LabelRow
              label="Açúcares adicionados (g)"
              per100={fmtG(0)}
              perPortion={fmtG(facts.added_sugars_g)}
              dv="0"
              indent
            />
            <LabelRow
              label="Proteínas (g)"
              per100={fmtG(h.protein_g)}
              perPortion={fmtG(p.protein_g)}
              dv={String(dv.protein_g)}
            />
            <LabelRow
              label="Gorduras totais (g)"
              per100={fmtG(h.fat_g)}
              perPortion={fmtG(p.fat_g)}
              dv={String(dv.fat_g)}
            />
            <LabelRow
              label="Gorduras saturadas (g)"
              per100={fmtG(h.saturated_fat_g ?? 0)}
              perPortion={fmtG(p.saturated_fat_g ?? 0)}
              dv={dv.saturated_fat_g != null ? String(dv.saturated_fat_g) : "0"}
              indent
            />
            <LabelRow
              label="Gorduras trans (g)"
              per100={fmtG(0)}
              perPortion={fmtG(facts.trans_fat_g)}
              dv="**"
              indent
            />
            <LabelRow
              label="Fibras alimentares (g)"
              per100={fmtG(h.fiber_g)}
              perPortion={fmtG(p.fiber_g)}
              dv={String(dv.fiber_g)}
            />
            <LabelRow
              label="Sódio (mg)"
              per100={String(h.sodium_mg)}
              perPortion={String(p.sodium_mg)}
              dv={String(dv.sodium_mg)}
            />
          </tbody>
        </table>

        <div className="border-t border-black px-2 py-1.5 text-[10px] leading-snug">
          <p>*Percentual de valores diários fornecidos pela porção.</p>
        </div>
      </div>

      {!compact && (
        <>
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
          <p className="mt-2 text-[10px] leading-snug text-nutrir-emerald/45">
            Valores calculados com base na TACO (NEPA/UNICAMP, 4ª ed.). Sódio inclui sal de
            cozimento (arroz, grão-de-bico e ervilha: 1% do peso cru; frango, carne e batata: 0,6%
            do peso cru; massa: 2% na água, 3:1 água/massa, ~10% retido após escorrer). %VD com
            em 2 000 kcal/dia (RDC 429/2020). Informação estimada; não substitui orientação
            profissional.
          </p>
        </>
      )}
    </div>
  );
}
