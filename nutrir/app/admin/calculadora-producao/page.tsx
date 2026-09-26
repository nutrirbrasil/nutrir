"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRequireAdmin } from "@/lib/use-require-admin";
import { useRecipesData } from "@/lib/use-recipes-data";
import { MENU_SECTIONS, type MarmitaSize } from "@/lib/menu-data";
import { flattenIngredients, rawGramsForFood, type Food } from "@/lib/marmita-nutrition";

interface DishOption {
  itemId: string;
  size: MarmitaSize;
  label: string;
}

interface ProductionLine {
  key: string;
  itemId: string;
  size: MarmitaSize;
  label: string;
  quantity: number;
}

interface ChildIngredientTotal {
  food: Food;
  preparedGrams: number;
}

interface GroupedIngredientTotal {
  food: Food;
  preparedGrams: number;
  children: ChildIngredientTotal[];
}

function sortByReferenceThenWeight<T extends { food: Food; preparedGrams: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.food.is_reference_only !== b.food.is_reference_only) {
      return a.food.is_reference_only ? 1 : -1;
    }
    return b.preparedGrams - a.preparedGrams;
  });
}

function itemDisplayName(itemId: string): string {
  for (const section of MENU_SECTIONS) {
    const found = section.items.find((i) => i.id === itemId);
    if (found) return found.name;
  }
  return itemId;
}

function fmtGrams(grams: number): string {
  const rounded = Math.round(grams * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
  if (rounded >= 1000) {
    const kg = Math.round((rounded / 1000) * 100) / 100;
    const kgText = Number.isInteger(kg) ? String(kg) : kg.toFixed(2).replace(".", ",");
    return `${text} g (${kgText} kg)`;
  }
  return `${text} g`;
}

export default function CalculadoraProducaoPage() {
  const { ready } = useRequireAdmin();
  const { recipes, loading } = useRecipesData();
  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [quantity, setQuantity] = useState(1);

  const dishOptions = useMemo<DishOption[]>(() => {
    if (!recipes) return [];
    return recipes
      .map((r) => ({
        itemId: r.item_id,
        size: r.size,
        label: `${itemDisplayName(r.item_id)} (${r.size})`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [recipes]);

  function addLine() {
    const option = dishOptions.find((o) => `${o.itemId}-${o.size}` === selectedKey);
    if (!option || quantity < 1) return;

    setLines((prev) => {
      const existing = prev.find((l) => l.itemId === option.itemId && l.size === option.size);
      if (existing) {
        return prev.map((l) =>
          l.key === existing.key ? { ...l, quantity: l.quantity + quantity } : l
        );
      }
      return [
        ...prev,
        {
          key: `${option.itemId}-${option.size}`,
          itemId: option.itemId,
          size: option.size,
          label: option.label,
          quantity,
        },
      ];
    });
    setQuantity(1);
  }

  function updateQty(key: string, delta: number) {
    setLines((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  const totals = useMemo<GroupedIngredientTotal[]>(() => {
    if (!recipes) return [];
    const groups = new Map<string, GroupedIngredientTotal>();

    for (const line of lines) {
      const recipe = recipes.find((r) => r.item_id === line.itemId && r.size === line.size);
      if (!recipe) continue;

      for (const top of recipe.ingredients) {
        let group = groups.get(top.food.id);
        if (!group) {
          group = { food: top.food, preparedGrams: 0, children: [] };
          groups.set(top.food.id, group);
        }
        group.preparedGrams += top.grams * line.quantity;

        for (const child of flattenIngredients(top.children)) {
          const addGrams = child.grams * line.quantity;
          const existingChild = group.children.find((c) => c.food.id === child.food.id);
          if (existingChild) {
            existingChild.preparedGrams += addGrams;
          } else {
            group.children.push({ food: child.food, preparedGrams: addGrams });
          }
        }
      }
    }

    const groupList = Array.from(groups.values());
    for (const group of groupList) {
      group.children = sortByReferenceThenWeight(group.children);
    }
    groupList.sort((a, b) => {
      const totalA = a.preparedGrams + a.children.reduce((s, c) => s + c.preparedGrams, 0);
      const totalB = b.preparedGrams + b.children.reduce((s, c) => s + c.preparedGrams, 0);
      return totalB - totalA;
    });
    return groupList;
  }, [recipes, lines]);

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/admin" className="mb-4 inline-block text-sm font-semibold text-nutrir-ink/70 hover:text-nutrir-ink">
        ← Voltar
      </Link>
      <h1 className="font-display text-2xl font-bold text-nutrir-ink">Calculadora de produção</h1>
      <p className="mt-1 text-sm text-nutrir-ink/60">
        Adicione as marmitas do dia e veja o total de cada ingrediente pra preparar, cru e pronto.
      </p>

      {loading && <p className="mt-6 text-sm text-nutrir-ink/60">Carregando fichas técnicas…</p>}

      {!loading && (
        <>
          <div className="card mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-sm font-medium text-nutrir-ink">Marmita</label>
              <select
                className="input-field"
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
              >
                <option value="" disabled>
                  Selecione
                </option>
                {dishOptions.map((o) => (
                  <option key={`${o.itemId}-${o.size}`} value={`${o.itemId}-${o.size}`}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="mb-1 block text-sm font-medium text-nutrir-ink">Qtd</label>
              <input
                type="number"
                min={1}
                className="input-field"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <button type="button" onClick={addLine} disabled={!selectedKey} className="btn-primary shrink-0">
              Adicionar
            </button>
          </div>

          {lines.length > 0 && (
            <div className="card mt-4 space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-nutrir-ink/70">
                Marmitas do pedido
              </h2>
              <ul className="space-y-2">
                {lines.map((line) => (
                  <li key={line.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex-1 text-nutrir-ink">{line.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-lg border-2 border-nutrir-emerald/30">
                        <button
                          type="button"
                          onClick={() => updateQty(line.key, -1)}
                          className="px-2 py-1 text-nutrir-ink hover:bg-nutrir-emerald/5"
                        >
                          −
                        </button>
                        <span className="min-w-[2rem] text-center font-semibold">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(line.key, 1)}
                          className="px-2 py-1 text-nutrir-ink hover:bg-nutrir-emerald/5"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="text-xs font-bold uppercase text-nutrir-burgundy hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {totals.length > 0 && (
            <div className="card mt-4 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-nutrir-ink/70">
                Total de ingredientes
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-nutrir-nude-dark/40 text-left text-xs font-bold uppercase tracking-wide text-nutrir-ink/60">
                      <th className="py-2 pr-2">Ingrediente</th>
                      <th className="py-2 pr-2 text-right">Pronto/cozido</th>
                      <th className="py-2 text-right">Cru</th>
                    </tr>
                  </thead>
                  <tbody>
                    {totals.map((group) => (
                      <Fragment key={group.food.id}>
                        <tr className="border-b border-nutrir-nude-dark/20 bg-nutrir-canvas-alt/10">
                          <td className="py-2 pr-2 font-bold uppercase text-nutrir-ink">
                            {group.food.display_name}
                          </td>
                          <td className="py-2 pr-2 text-right font-semibold text-nutrir-ink">
                            {fmtGrams(group.preparedGrams)}
                          </td>
                          <td className="py-2 text-right text-nutrir-burgundy">
                            {fmtGrams(rawGramsForFood(group.food, group.preparedGrams))}
                          </td>
                        </tr>
                        {group.children.map((child) => (
                          <tr
                            key={`${group.food.id}-${child.food.id}`}
                            className="border-b border-nutrir-nude-dark/20 last:border-0"
                          >
                            <td
                              className={`py-2 pr-2 pl-6 uppercase text-nutrir-ink ${
                                child.food.is_reference_only ? "" : "font-bold"
                              }`}
                            >
                              {child.food.display_name}
                              {child.food.is_reference_only && (
                                <span className="ml-1 text-xs normal-case text-nutrir-ink/45">
                                  (referência)
                                </span>
                              )}
                            </td>
                            <td className="py-2 pr-2 text-right font-semibold text-nutrir-ink">
                              {fmtGrams(child.preparedGrams)}
                            </td>
                            <td className="py-2 text-right text-nutrir-burgundy">
                              {fmtGrams(rawGramsForFood(child.food, child.preparedGrams))}
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-nutrir-ink/50">
                Cada ingrediente principal (arroz, frango, massa...) vem com seus secundários logo
                abaixo (ex: molho e sal), separados por prato, já que a quantidade muda de um pra
                outro. "Cru" usa o fator de cocção de cada ingrediente (peso pronto ÷ fator). Itens
                marcados "referência" (água, sal, temperos) não entram no cálculo nutricional, mas
                aparecem aqui porque ainda precisam ser preparados/comprados.
              </p>
            </div>
          )}

          {lines.length === 0 && (
            <p className="mt-6 text-center text-sm text-nutrir-ink/50">
              Adicione marmitas acima pra ver o total de ingredientes.
            </p>
          )}
        </>
      )}
    </div>
  );
}
