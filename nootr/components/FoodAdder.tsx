"use client";

import { useEffect, useRef, useState } from "react";
import { nootrApi } from "@/lib/api";
import type { FoodInput, TacoFoodResult } from "@/lib/types";
import { UNITS, toGrams, quantityLabel } from "@/lib/units";
import { useIsMobile, hasBarcodeDetector } from "@/lib/device";
import { BarcodeScanner } from "@/components/BarcodeScanner";

export interface AddedFood {
  taco_id: number | null; // null = alimento customizado (código de barras)
  name: string;
  grams: number;
  quantity_label: string;
  // valores absolutos (exibição/somas)
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  // base por 100g (permite editar quantidade e enviar customizado ao backend)
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
}

interface Basis {
  taco_id: number | null;
  name: string;
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
}

function build(basis: Basis, quantity: number, unitId: string): AddedFood {
  const grams = toGrams(quantity, unitId);
  const r = grams / 100;
  return {
    taco_id: basis.taco_id,
    name: basis.name,
    grams,
    quantity_label: quantityLabel(quantity, unitId),
    calories: Math.round(basis.kcal_100g * r * 10) / 10,
    protein_g: Math.round(basis.protein_100g * r * 10) / 10,
    carbs_g: Math.round(basis.carbs_100g * r * 10) / 10,
    fat_g: Math.round(basis.fat_100g * r * 10) / 10,
    kcal_100g: basis.kcal_100g,
    protein_100g: basis.protein_100g,
    carbs_100g: basis.carbs_100g,
    fat_100g: basis.fat_100g,
  };
}

/** Converte um AddedFood no formato que o backend espera (TACO ou customizado). */
export function addedFoodToInput(f: AddedFood): FoodInput {
  if (f.taco_id != null) {
    return { taco_id: f.taco_id, grams: f.grams, quantity_label: f.quantity_label };
  }
  return {
    grams: f.grams,
    quantity_label: f.quantity_label,
    name: f.name,
    kcal_100g: f.kcal_100g,
    protein_100g: f.protein_100g,
    carbs_100g: f.carbs_100g,
    fat_100g: f.fat_100g,
  };
}

/** Recalcula um AddedFood ao mudar a quantidade (sem precisar excluir/recriar). */
export function rescaleFood(f: AddedFood, quantity: number, unitId: string): AddedFood {
  return build(
    {
      taco_id: f.taco_id,
      name: f.name,
      kcal_100g: f.kcal_100g,
      protein_100g: f.protein_100g,
      carbs_100g: f.carbs_100g,
      fat_100g: f.fat_100g,
    },
    quantity,
    unitId
  );
}

export function FoodAdder({ token, onAdd }: { token: string; onAdd: (food: AddedFood) => void }) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<"search" | "barcode">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TacoFoodResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState("");
  const [selected, setSelected] = useState<Basis | null>(null);
  const [quantity, setQuantity] = useState("100");
  const [unitId, setUnitId] = useState("g");
  const boxRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function lookupBarcode(code: string) {
    setScanning(false);
    setBarcodeLoading(true);
    setBarcodeError("");
    try {
      const f = await nootrApi.lookupBarcode(token, code);
      setSelected({
        taco_id: null,
        name: f.name,
        kcal_100g: f.kcal_100g,
        protein_100g: f.protein_100g,
        carbs_100g: f.carbs_100g,
        fat_100g: f.fat_100g,
      });
      setUnitId("g");
      setQuantity("100");
    } catch (err) {
      setBarcodeError(err instanceof Error ? err.message : "Produto não encontrado");
    } finally {
      setBarcodeLoading(false);
    }
  }

  const qty = parseFloat(quantity.replace(",", ".")) || 0;
  const preview = selected && qty > 0 ? build(selected, qty, unitId) : null;

  function confirm() {
    if (!selected || qty <= 0) return;
    onAdd(build(selected, qty, unitId));
    setSelected(null);
    setQuery("");
    setQuantity("100");
    setUnitId("g");
  }

  if (selected) {
    return (
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
            <input className="input-field" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="min-w-[150px] flex-1">
            <label className="label-caps">Medida</label>
            <select className="input-field" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              {UNITS.map((u) => (
                <option key={u.id} value={u.id}>{u.labelPlural}</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={confirm} disabled={qty <= 0} className="btn-primary">
            Adicionar
          </button>
        </div>
        {preview && (
          <p className="mt-2.5 text-xs text-nootr-muted">
            {Math.round(preview.grams)}g · ~{Math.round(preview.calories)} kcal ·{" "}
            {preview.protein_g}g prot · {preview.carbs_g}g carb · {preview.fat_g}g gord
          </p>
        )}
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="mb-2 flex gap-2">
        <button type="button" onClick={() => setMode("search")} className={`chip ${mode === "search" ? "chip-active" : ""}`}>
          Buscar Alimento
        </button>
        {isMobile && (
          <button
            type="button"
            onClick={() => {
              setMode("barcode");
              setBarcodeError("");
            }}
            className={`chip ${mode === "barcode" ? "chip-active" : ""}`}
          >
            📷 Escanear código de barras
          </button>
        )}
      </div>

      {mode === "search" ? (
        <div>
          <input
            className="input-field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busque um alimento — ex: pão, arroz, doce de leite"
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
                      setSelected({
                        taco_id: food.taco_id,
                        name: food.name,
                        kcal_100g: food.kcal ?? 0,
                        protein_100g: food.protein_g ?? 0,
                        carbs_100g: food.carbs_g ?? 0,
                        fat_100g: food.fat_g ?? 0,
                      });
                      setUnitId("g");
                      setQuantity("100");
                      setOpen(false);
                    }}
                    className="flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-nootr-wine"
                  >
                    <span className="text-sm text-nootr-cream">{food.name}</span>
                    {food.kcal != null && <span className="shrink-0 text-xs text-nootr-faint">{Math.round(food.kcal)} kcal/100g</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : scanning ? (
        <BarcodeScanner onDetected={(code) => void lookupBarcode(code)} onClose={() => setScanning(false)} />
      ) : (
        <div>
          {barcodeLoading ? (
            <p className="text-sm text-nootr-muted">Buscando produto…</p>
          ) : hasBarcodeDetector() ? (
            <button type="button" onClick={() => setScanning(true)} className="btn-secondary w-full">
              📷 Abrir câmera para escanear
            </button>
          ) : (
            <p className="text-sm text-nootr-bordoSoft">
              Seu navegador não suporta leitura de código de barras (funciona no Chrome para Android).
            </p>
          )}
        </div>
      )}
      {mode === "barcode" && barcodeError && <p className="mt-2 text-xs text-nootr-bordoSoft">{barcodeError}</p>}
    </div>
  );
}

/** Lista dos alimentos adicionados, com edição de quantidade e remoção. */
export function AddedFoodList({
  foods,
  onRemove,
  onEdit,
}: {
  foods: AddedFood[];
  onRemove: (index: number) => void;
  onEdit?: (index: number, food: AddedFood) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [qty, setQty] = useState("1");
  const [unitId, setUnitId] = useState("g");

  if (foods.length === 0) return null;

  function startEdit(i: number, f: AddedFood) {
    setEditing(i);
    setQty(String(Math.round(f.grams)));
    setUnitId("g");
  }
  function saveEdit(i: number, f: AddedFood) {
    const q = parseFloat(qty.replace(",", ".")) || 0;
    if (q > 0 && onEdit) onEdit(i, rescaleFood(f, q, unitId));
    setEditing(null);
  }

  return (
    <ul className="space-y-1.5">
      {foods.map((food, i) => (
        <li key={`${food.taco_id ?? "c"}-${i}`} className="rounded-lg border border-nootr-line bg-nootr-black px-3.5 py-2.5">
          {editing === i && onEdit ? (
            <div className="flex flex-wrap items-end gap-2">
              <p className="w-full text-sm text-nootr-cream">{food.name}</p>
              <div className="w-20">
                <label className="label-caps">Qtd.</label>
                <input className="input-field" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
              <div className="min-w-[130px] flex-1">
                <label className="label-caps">Medida</label>
                <select className="input-field" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                  {UNITS.map((u) => (
                    <option key={u.id} value={u.id}>{u.labelPlural}</option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={() => saveEdit(i, food)} className="btn-primary px-3 py-1.5 text-xs">Salvar</button>
              <button type="button" onClick={() => setEditing(null)} className="text-xs text-nootr-muted hover:text-nootr-cream">cancelar</button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-nootr-cream">{food.name}</p>
                <p className="text-xs text-nootr-faint">{food.quantity_label} · {Math.round(food.calories)} kcal</p>
              </div>
              <div className="flex shrink-0 gap-3 text-xs">
                {onEdit && (
                  <button type="button" onClick={() => startEdit(i, food)} className="text-nootr-muted transition-colors hover:text-nootr-bordoSoft">
                    editar
                  </button>
                )}
                <button type="button" onClick={() => onRemove(i)} className="text-nootr-muted transition-colors hover:text-nootr-bordoSoft">
                  remover
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
