"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/api";
import {
  COST_DISHES,
  COST_INGREDIENTS,
  costOfLines,
  summarizeQuantities,
  type CostLine,
} from "@/lib/custo-marmitas";
import { MENU_SECTIONS } from "@/lib/menu-data";
import { useRequireAdmin } from "@/lib/use-require-admin";

const STORAGE_KEY = "nutrir-custo-ingredientes-v2";

const DEFAULT_COSTS: Record<string, number> = Object.fromEntries(
  COST_INGREDIENTS.map((i) => [i.id, i.defaultCostPerKg])
);

function toNumber(text: string): number {
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function brl(value: number): string {
  return formatPrice(Math.round(value * 100));
}

function fmtGrams(grams: number): string {
  return `${(Math.round(grams * 10) / 10).toLocaleString("pt-BR")} g`;
}

function signedBrl(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded >= 0 ? "+" : "-"}${brl(Math.abs(rounded))}`;
}

function catalogPriceReais(itemId: string, size: "P" | "G"): number | null {
  for (const section of MENU_SECTIONS) {
    const found = section.items.find((i) => i.id === itemId);
    if (found) return found.prices[size] / 100;
  }
  return null;
}

interface EditableLine {
  ingredientId: string;
  grams: string;
}

function toEditable(lines: CostLine[]): EditableLine[] {
  return lines.map((l) => ({ ingredientId: l.ingredientId, grams: String(l.grams) }));
}

export default function CalculadoraCustoPage() {
  const { ready } = useRequireAdmin();
  const [costs, setCosts] = useState<Record<string, number>>(DEFAULT_COSTS);
  const [costsText, setCostsText] = useState<Record<string, string>>({});
  const [baseKey, setBaseKey] = useState(COST_DISHES[0].key);
  const [rows, setRows] = useState<EditableLine[]>(toEditable(COST_DISHES[0].lines));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCosts({ ...DEFAULT_COSTS, ...(JSON.parse(raw) as Record<string, number>) });
    } catch {
      /* sem armazenamento, usa o padrão */
    }
  }, []);

  function saveCosts(next: Record<string, number>) {
    setCosts(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignora */
    }
  }

  function updateCost(id: string, text: string) {
    setCostsText((prev) => ({ ...prev, [id]: text }));
    saveCosts({ ...costs, [id]: toNumber(text) });
  }

  function resetCosts() {
    setCostsText({});
    saveCosts(DEFAULT_COSTS);
  }

  const base = COST_DISHES.find((d) => d.key === baseKey) ?? COST_DISHES[0];

  function selectBase(key: string) {
    setBaseKey(key);
    const next = COST_DISHES.find((d) => d.key === key);
    if (next) setRows(toEditable(next.lines));
  }

  const baseCost = useMemo(() => costOfLines(base.lines, costs), [base, costs]);
  const customLines = useMemo<CostLine[]>(
    () => rows.map((r) => ({ ingredientId: r.ingredientId, grams: toNumber(r.grams) })),
    [rows]
  );
  const customCost = useMemo(() => costOfLines(customLines, costs), [customLines, costs]);
  const basePrice = catalogPriceReais(base.itemId, base.size);
  const customQty = useMemo(() => summarizeQuantities(customLines), [customLines]);
  const baseQty = useMemo(() => summarizeQuantities(base.lines), [base]);

  const diffCost = customCost - baseCost;

  function updateRow(index: number, patch: Partial<EditableLine>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/admin" className="mb-4 inline-block text-sm font-semibold text-nutrir-ink/70 hover:text-nutrir-ink">
        ← Voltar
      </Link>
      <h1 className="font-display text-2xl font-bold text-nutrir-ink">Custo de marmita personalizada</h1>
      <p className="mt-1 text-sm text-nutrir-ink/60">
        Escolha uma marmita de base, mude as quantidades e veja o custo e quanto cobrar a mais (ou a menos).
      </p>

      <div className="card mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-nutrir-ink">Marmita de base</label>
          <select className="input-field" value={baseKey} onChange={(e) => selectBase(e.target.value)}>
            {COST_DISHES.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-nutrir-ink/55">
            Custo {brl(baseCost)}
            {basePrice != null && <> · Preço de venda no pix {brl(basePrice)}</>}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-nutrir-ink/70">Sua marmita</h2>
            <button
              type="button"
              onClick={() => setRows(toEditable(base.lines))}
              className="text-xs font-bold uppercase text-nutrir-burgundy hover:underline"
            >
              Copiar da base
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {rows.map((row, index) => {
              const grams = toNumber(row.grams);
              const lineCost = ((costs[row.ingredientId] ?? 0) * grams) / 1000;
              return (
                <div key={index} className="flex items-center gap-2">
                  <select
                    className="input-field min-w-0 flex-1"
                    value={row.ingredientId}
                    onChange={(e) => updateRow(index, { ingredientId: e.target.value })}
                  >
                    {COST_INGREDIENTS.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input-field w-24 text-right"
                    inputMode="decimal"
                    aria-label="Gramas"
                    value={row.grams}
                    onChange={(e) => updateRow(index, { grams: e.target.value })}
                  />
                  <span className="text-xs text-nutrir-ink/50">g</span>
                  <span className="w-16 text-right text-sm font-semibold text-nutrir-ink">{brl(lineCost)}</span>
                  <button
                    type="button"
                    onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                    className="text-lg leading-none text-nutrir-burgundy"
                    aria-label="Remover"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, { ingredientId: COST_INGREDIENTS[0].id, grams: "0" }])}
            className="mt-2 text-sm font-semibold text-nutrir-burgundy underline underline-offset-2"
          >
            + Adicionar ingrediente
          </button>
        </div>
      </div>

      <div className="card mt-4 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-nutrir-ink/70">Resultado</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-nutrir-ink/60">Custo da sua marmita</dt>
          <dd className="text-right font-display text-2xl font-bold text-nutrir-burgundy">{brl(customCost)}</dd>
          <dt className="text-nutrir-ink/60">Custo da base</dt>
          <dd className="text-right font-semibold text-nutrir-ink">{brl(baseCost)}</dd>
          <dt className="text-nutrir-ink/60">Diferença de custo</dt>
          <dd className="text-right font-semibold text-nutrir-ink">{signedBrl(diffCost)}</dd>
        </dl>
        <div className="rounded-xl bg-nutrir-canvas-alt/60 p-3 text-sm text-nutrir-ink">
          <p className="font-semibold">Quanto cobrar a mais ou a menos</p>
          <p className="mt-1">
            Repassando o custo: <strong>{signedBrl(diffCost)}</strong>
            {basePrice != null && (
              <>
                , ou seja, preço de <strong>{brl(basePrice + diffCost)}</strong> no pix
              </>
            )}
            .
          </p>
        </div>

        <div className="rounded-xl bg-nutrir-canvas-alt/60 p-3 text-sm text-nutrir-ink">
          <p className="font-semibold">Quantidades da sua marmita</p>
          <dl className="mt-2 grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1">
            <dt />
            <dd className="text-right text-xs text-nutrir-ink/50">Sua</dd>
            <dd className="text-right text-xs text-nutrir-ink/50">Base</dd>
            <dt className="text-nutrir-ink/70">Proteína (frango ou carne)</dt>
            <dd className="text-right font-semibold">{fmtGrams(customQty.proteinGrams)}</dd>
            <dd className="text-right text-nutrir-ink/50">{fmtGrams(baseQty.proteinGrams)}</dd>
            <dt className="text-nutrir-ink/70">Molho</dt>
            <dd className="text-right font-semibold">{fmtGrams(customQty.sauceGrams)}</dd>
            <dd className="text-right text-nutrir-ink/50">{fmtGrams(baseQty.sauceGrams)}</dd>
            <dt className="text-nutrir-ink/70">Proteína + molho</dt>
            <dd className="text-right font-semibold">
              {fmtGrams(customQty.proteinGrams + customQty.sauceGrams)}
            </dd>
            <dd className="text-right text-nutrir-ink/50">
              {fmtGrams(baseQty.proteinGrams + baseQty.sauceGrams)}
            </dd>
            <dt className="font-semibold text-nutrir-ink">Peso total da marmita</dt>
            <dd className="text-right font-bold text-nutrir-burgundy">{fmtGrams(customQty.totalGrams)}</dd>
            <dd className="text-right text-nutrir-ink/50">{fmtGrams(baseQty.totalGrams)}</dd>
          </dl>
        </div>
      </div>

      <div className="card mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-nutrir-ink/70">
            Custo dos ingredientes (R$ por kg)
          </h2>
          <button
            type="button"
            onClick={resetCosts}
            className="text-xs font-bold uppercase text-nutrir-burgundy hover:underline"
          >
            Restaurar padrão
          </button>
        </div>
        <p className="text-xs text-nutrir-ink/50">
          Preço líquido da sua planilha: R$ por kg do ingrediente já pronto (já com o fator de cocção).
          Edite quando o preço de compra mudar, fica salvo neste navegador.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {COST_INGREDIENTS.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-nutrir-ink">{i.label}</span>
              <input
                className="input-field w-24 text-right"
                inputMode="decimal"
                value={costsText[i.id] ?? String(costs[i.id]).replace(".", ",")}
                onChange={(e) => updateCost(i.id, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
