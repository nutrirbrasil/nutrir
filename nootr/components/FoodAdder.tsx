"use client";

import { useEffect, useRef, useState } from "react";
import { nootrApi } from "@/lib/api";
import type { TacoFoodResult } from "@/lib/types";
import { UNITS, toGrams, quantityLabel } from "@/lib/units";

export interface AddedFood {
  taco_id: number;
  name: string;
  grams: number;
  quantity_label: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

function scale(food: TacoFoodResult, grams: number) {
  const r = grams / 100;
  return {
    calories: Math.round((food.kcal ?? 0) * r * 10) / 10,
    protein_g: Math.round((food.protein_g ?? 0) * r * 10) / 10,
    carbs_g: Math.round((food.carbs_g ?? 0) * r * 10) / 10,
    fat_g: Math.round((food.fat_g ?? 0) * r * 10) / 10,
  };
}

/**
 * Busca na TACO com autocomplete (nomes de exibição) + quantidade em medidas
 * caseiras ou gramas. Ao confirmar, chama onAdd com o alimento pronto.
 */
export function FoodAdder({ token, onAdd }: { token: string; onAdd: (food: AddedFood) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TacoFoodResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [selected, setSelected] = useState<TacoFoodResult | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unitId, setUnitId] = useState("unidade");
  const boxRef = useRef<HTMLDivElement>(null);

  // busca com debounce
  useEffect(() => {
    if (selected || query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      setSearchError(false);
      try {
        const data = await nootrApi.searchFoods(token, query.trim());
        setResults(data.results);
        setOpen(true);
      } catch {
        setResults([]);
        setSearchError(true);
        setOpen(true);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, token, selected]);

  // fecha o dropdown ao clicar fora
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const qty = parseFloat(quantity.replace(",", ".")) || 0;
  const grams = toGrams(qty, unitId);
  const preview = selected && qty > 0 ? scale(selected, grams) : null;

  function confirm() {
    if (!selected || qty <= 0) return;
    const macros = scale(selected, grams);
    onAdd({
      taco_id: selected.taco_id,
      name: selected.name,
      grams,
      quantity_label: quantityLabel(qty, unitId),
      ...macros,
    });
    setSelected(null);
    setQuery("");
    setQuantity("1");
    setUnitId("unidade");
  }

  return (
    <div ref={boxRef} className="relative">
      {!selected ? (
        <div>
          <input
            className="input-field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busque um alimento — ex: pão, arroz, doce de leite"
            aria-label="Buscar alimento na tabela TACO"
          />
          {open && (
            <ul className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-nootr-line bg-nootr-card shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
              {searching && <li className="px-4 py-3 text-sm text-nootr-faint">Buscando…</li>}
              {!searching && searchError && (
                <li className="px-4 py-3 text-sm text-nootr-bordoSoft">
                  Não foi possível buscar — verifique se a API está no ar e tente de novo.
                </li>
              )}
              {!searching && !searchError && results.length === 0 && (
                <li className="px-4 py-3 text-sm text-nootr-faint">Nenhum alimento encontrado.</li>
              )}
              {results.map((food) => (
                <li key={food.taco_id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(food);
                      setOpen(false);
                    }}
                    className="flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-nootr-wine"
                  >
                    <span className="text-sm text-nootr-cream">{food.name}</span>
                    {food.kcal != null && (
                      <span className="shrink-0 text-xs text-nootr-faint">
                        {Math.round(food.kcal)} kcal/100g
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-nootr-bordo/40 bg-nootr-wine/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-nootr-cream">{selected.name}</p>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-nootr-muted transition-colors hover:text-nootr-bordoSoft"
            >
              trocar
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="w-20">
              <label className="label-caps">Qtd.</label>
              <input
                className="input-field"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="min-w-[150px] flex-1">
              <label className="label-caps">Medida</label>
              <select
                className="input-field"
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
              >
                {UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.labelPlural}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" onClick={confirm} disabled={qty <= 0} className="btn-primary">
              Adicionar
            </button>
          </div>
          {preview && (
            <p className="mt-2.5 text-xs text-nootr-muted">
              {Math.round(grams)}g · ~{Math.round(preview.calories)} kcal ·{" "}
              {preview.protein_g}g prot · {preview.carbs_g}g carb · {preview.fat_g}g gord
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Lista dos alimentos já adicionados, com remoção. */
export function AddedFoodList({
  foods,
  onRemove,
}: {
  foods: AddedFood[];
  onRemove: (index: number) => void;
}) {
  if (foods.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {foods.map((food, i) => (
        <li
          key={`${food.taco_id}-${i}`}
          className="flex items-center justify-between gap-3 rounded-lg border border-nootr-line bg-nootr-black px-3.5 py-2.5"
        >
          <div className="min-w-0">
            <p className="truncate text-sm text-nootr-cream">{food.name}</p>
            <p className="text-xs text-nootr-faint">
              {food.quantity_label} · {Math.round(food.calories)} kcal
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label={`Remover ${food.name}`}
            className="shrink-0 text-xs text-nootr-muted transition-colors hover:text-nootr-bordoSoft"
          >
            remover
          </button>
        </li>
      ))}
    </ul>
  );
}
