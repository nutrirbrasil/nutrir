import { getMarmitaNutrition } from "@/lib/marmita-nutrition";
import { NutritionTable } from "@/components/NutritionTable";
import {
  getLabelAllergenInfo,
  getLabelIngredients,
  MANUFACTURER,
  PREPARATION_INSTRUCTIONS,
  STORAGE_INSTRUCTIONS,
} from "@/lib/nutrition-label-data";
import type { MarmitaSize } from "@/lib/menu-data";

interface Props {
  itemId: string;
  itemName: string;
  size: MarmitaSize;
}

export function NutritionLabelPrint({ itemId, itemName, size }: Props) {
  const facts = getMarmitaNutrition(itemId, size);
  if (!facts) return null;

  const ingredients = getLabelIngredients(itemId, size);
  const allergenInfo = getLabelAllergenInfo(itemId);

  return (
    <div
      className="flex break-inside-avoid flex-col overflow-hidden rounded-xl border-2 border-nutrir-emerald bg-nutrir-cream text-nutrir-emerald print:break-after-page print:rounded-none"
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact", aspectRatio: "2 / 1" }}
    >
      <div className="bg-nutrir-emerald px-3 py-1.5 text-nutrir-cream">
        <p className="font-display text-base font-bold leading-tight">
          {itemName} — Tamanho {size}
        </p>
        <p className="text-xs opacity-90">Peso líquido: {facts.portion_g} g</p>
      </div>

      <div className="flex flex-1 flex-col justify-center p-2">
        <div className="grid grid-cols-[minmax(170px,45%)_1fr] items-start gap-2">
          <div className="space-y-0.5">
            <NutritionTable facts={facts} compact />

            <div className="px-0.5 text-[9px] leading-tight">
              <p>
                <span className="font-bold">INGREDIENTES: </span>
                {ingredients.join(", ")}.
              </p>
            </div>
          </div>

          <div className="space-y-0.5 text-[9px] leading-tight">
            <div className="rounded border border-nutrir-burgundy/40 px-1.5 py-0.5">
              <p className="font-bold text-nutrir-burgundy">{allergenInfo.headline}</p>
              <p className="mt-0.5">{allergenInfo.allergensLine}</p>
            </div>

            <div>
              <p className="font-bold">CONSERVAÇÃO</p>
              <p>{STORAGE_INSTRUCTIONS.refrigerated}</p>
              <p>{STORAGE_INSTRUCTIONS.frozen}</p>
            </div>

            <div>
              <p className="font-bold">MODO DE PREPARO</p>
              <p>{PREPARATION_INSTRUCTIONS}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 py-1.5">
              <p>
                <span className="font-bold">Data de Produção:</span>
              </p>
              <p>
                <span className="font-bold">Data de Validade:</span>
              </p>
            </div>

            <div className="border-t border-nutrir-emerald/30 pt-0.5">
              <p className="font-display font-bold">{MANUFACTURER.name}</p>
              <p>CNPJ {MANUFACTURER.cnpj}</p>
              <p>{MANUFACTURER.address}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
