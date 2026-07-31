"use client";

import { useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import { MENU_SECTIONS, type MarmitaSize } from "@/lib/menu-data";
import { NutritionLabelPrint } from "@/components/NutritionLabelPrint";

interface LabelTarget {
  itemId: string;
  itemName: string;
  size: MarmitaSize;
}

function buildAllTargets(): LabelTarget[] {
  const seen = new Set<string>();
  const targets: LabelTarget[] = [];
  for (const section of MENU_SECTIONS) {
    for (const item of section.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      targets.push({ itemId: item.id, itemName: item.name, size: "P" });
      targets.push({ itemId: item.id, itemName: item.name, size: "G" });
    }
  }
  return targets;
}

const ALL_TARGETS = buildAllTargets();

export default function RotulosPage() {
  const { ready } = useRequireAdmin();
  const [selected, setSelected] = useState<LabelTarget | null>(null);
  const [printAll, setPrintAll] = useState(false);

  if (!ready) return null;

  const targets = printAll ? ALL_TARGETS : selected ? [selected] : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="print:hidden">
        <h1 className="font-display text-2xl font-bold text-nutrir-emerald">
          Rótulos nutricionais
        </h1>
        <p className="mt-1 text-sm text-nutrir-emerald/60">
          Gere o rótulo para impressão (ANVISA RDC 429/2020 + IN 75/2020). Lote e validade ficam em
          branco para preencher à mão na hora de embalar.
        </p>

        <div className="mt-6 space-y-2">
          {ALL_TARGETS.filter((t) => t.size === "P").map((t) => (
            <div key={t.itemId} className="card flex items-center justify-between gap-3">
              <p className="font-medium text-nutrir-emerald">{t.itemName}</p>
              <div className="flex gap-2">
                {(["P", "G"] as MarmitaSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPrintAll(false);
                      setSelected({ itemId: t.itemId, itemName: t.itemName, size });
                    }}
                    className={`btn-secondary px-3 py-1 text-sm ${
                      selected?.itemId === t.itemId && selected?.size === size && !printAll
                        ? "border-nutrir-emerald bg-nutrir-emerald/10"
                        : ""
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setPrintAll(true);
              setSelected(null);
            }}
            className="btn-secondary"
          >
            Selecionar todos (14 rótulos)
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={targets.length === 0}
            className="btn-primary disabled:opacity-40"
          >
            Imprimir {targets.length > 0 ? `(${targets.length})` : ""}
          </button>
        </div>
      </div>

      {targets.length > 0 && (
        <div className="mt-8 space-y-6 print:mt-0 print:space-y-0">
          {targets.map((t) => (
            <NutritionLabelPrint
              key={`${t.itemId}-${t.size}`}
              itemId={t.itemId}
              itemName={t.itemName}
              size={t.size}
            />
          ))}
        </div>
      )}
    </div>
  );
}
