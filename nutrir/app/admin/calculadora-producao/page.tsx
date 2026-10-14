"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRequireAdmin } from "@/lib/use-require-admin";
import { useRecipesData } from "@/lib/use-recipes-data";
import { MENU_SECTIONS, type MarmitaSize } from "@/lib/menu-data";
import {
  flattenIngredients,
  rawGramsForFood,
  type Food,
  type RecipeIngredient,
} from "@/lib/marmita-nutrition";

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
  /** Só em grupos combinados: entra na soma do total do grupo. */
  counted?: boolean;
  /** Mostra como "(referência)" mesmo sendo um ingrediente normal (ex: molho dentro de "Massa com molho"). */
  asReference?: boolean;
}

interface GroupedIngredientTotal {
  food: Food;
  /** Grupo que reúne vários ingredientes (Carne, Frango, Arroz): o total é a soma dos secundários. */
  combined?: boolean;
  label?: string;
  preparedGrams: number;
  rawGrams?: number;
  children: ChildIngredientTotal[];
}

/** Ingredientes principais que viram um grupo único (com o ingrediente em si como secundário), pra ver o total. */
function combinedGroupSpec(top: RecipeIngredient): { key: string; label: string } | null {
  switch (top.food.id) {
    case "frango_peito_cozido":
      return { key: "grupo-frango", label: "Frango (total)" };
    case "carne_patinho_grelhado":
      return { key: "grupo-carne-guisado", label: "Carne (guisado)" };
    case "patinho_em_cubos":
      return { key: "grupo-carne-strogonoff", label: "Carne (strogonoff)" };
    case "batata_cozida":
      return { key: "grupo-pure", label: "Purê" };
    case "massa_cozida":
      return { key: "grupo-massa-molho", label: "Massa com molho" };
    case "arroz_branco_cozido":
      return { key: "grupo-arroz", label: "Arroz (total)" };
    default:
      return null;
  }
}

/** Em qual preparo o molho da casa vai (pra mostrar separado: massa, frango, carne, cada strogonoff...). */
function molhoPreparo(itemId: string, note: string | null): string {
  const n = (note ?? "").toLowerCase();
  if (n.includes("strogonoff")) return `strogonoff de ${itemId.startsWith("car-") ? "carne" : "frango"}`;
  if (n.includes("massa")) return "massa";
  if (n.includes("ervilha")) return "ervilha";
  if (n.includes("grão") || n.includes("grao")) return "grão de bico";
  if (n.includes("carne")) return "carne (guisado)";
  if (n.includes("frango")) return "frango";
  return note?.trim() || "outros";
}

/** "AZEITE/ÓLEO" ou "Molho da Casa" -> "Azeite/óleo", "Molho da casa" (só a inicial maiúscula). */
function sentenceCase(name: string): string {
  const lower = name.toLocaleLowerCase("pt-BR");
  return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
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

    function addToCombined(
      key: string,
      label: string,
      food: Food,
      items: { item: RecipeIngredient; counted: boolean; asReference?: boolean }[],
      quantity: number
    ) {
      let combined = groups.get(key);
      if (!combined) {
        combined = { food, combined: true, label, preparedGrams: 0, children: [] };
        groups.set(key, combined);
      }
      for (const { item, counted, asReference } of items) {
        const addGrams = item.grams * quantity;
        const existing = combined.children.find((c) => c.food.id === item.food.id);
        if (existing) existing.preparedGrams += addGrams;
        else combined.children.push({ food: item.food, preparedGrams: addGrams, counted, asReference });
      }
    }

    for (const line of lines) {
      const recipe = recipes.find((r) => r.item_id === line.itemId && r.size === line.size);
      if (!recipe) continue;

      const isStrogonoff = recipe.ingredients.some((i) => i.food.id === "creme_de_leite_leve");

      for (const top of recipe.ingredients) {
        // Creme de leite e champignon do strogonoff entram dentro de "Carne (strogonoff)" / "Frango (strogonoff)".
        if (
          isStrogonoff &&
          (top.food.id === "creme_de_leite_leve" || top.food.id === "cogumelo_champignon")
        ) {
          continue;
        }
        const spec = combinedGroupSpec(top);
        if (spec) {
          const items: { item: RecipeIngredient; counted: boolean; asReference?: boolean }[] = [];
          if (spec.key === "grupo-massa-molho") {
            // Massa com molho = massa + o molho que vai nela. O molho aparece só como referência:
            // ele continua dentro do total de "Molho da casa" (não é descontado de lá).
            items.push({ item: top, counted: true });
            for (const c of flattenIngredients(top.children)) items.push({ item: c, counted: false });
            const molhoDaMassa = recipe.ingredients.find(
              (i) => i.food.id === "molho_de_tomate" && i.note?.toLowerCase().includes("massa")
            );
            if (molhoDaMassa) items.push({ item: molhoDaMassa, counted: true, asReference: true });
          } else if (spec.key === "grupo-carne-strogonoff") {
            // Patinho em cubos + temperos + molho strogonoff (creme leve, molho da casa e champignon).
            // O molho da casa aparece como referência: continua dentro do total de "Molho da casa".
            items.push({ item: top, counted: true });
            for (const c of flattenIngredients(top.children)) {
              items.push({ item: c, counted: !c.food.is_reference_only });
            }
            for (const i of recipe.ingredients) {
              if (i.food.id === "creme_de_leite_leve" || i.food.id === "cogumelo_champignon") {
                items.push({ item: i, counted: true });
              } else if (i.food.id === "molho_de_tomate" && i.note?.toLowerCase().includes("strogonoff")) {
                items.push({ item: i, counted: true, asReference: true });
              }
            }
          } else {
            items.push({ item: top, counted: !top.food.is_reference_only });
            for (const c of flattenIngredients(top.children)) {
              items.push({ item: c, counted: !c.food.is_reference_only });
            }
          }
          addToCombined(spec.key, spec.label, top.food, items, line.quantity);

          if (spec.key === "grupo-frango" && isStrogonoff) {
            // Frango (strogonoff): o frango aparece como referência (já está em "Frango (total)").
            const strogItems: { item: RecipeIngredient; counted: boolean; asReference?: boolean }[] = [
              { item: top, counted: true, asReference: true },
            ];
            for (const c of flattenIngredients(top.children)) {
              strogItems.push({ item: c, counted: !c.food.is_reference_only });
            }
            for (const i of recipe.ingredients) {
              if (i.food.id === "creme_de_leite_leve" || i.food.id === "cogumelo_champignon") {
                strogItems.push({ item: i, counted: true });
              } else if (i.food.id === "molho_de_tomate" && i.note?.toLowerCase().includes("strogonoff")) {
                strogItems.push({ item: i, counted: true, asReference: true });
              }
            }
            addToCombined("grupo-frango-strogonoff", "Frango (strogonoff)", top.food, strogItems, line.quantity);
          }
          continue;
        }

        const molhoLabel =
          top.food.id === "molho_de_tomate"
            ? `Molho da casa (${molhoPreparo(recipe.item_id, top.note)})`
            : undefined;
        const groupKey = molhoLabel ?? top.food.id;
        let group = groups.get(groupKey);
        if (!group) {
          group = { food: top.food, label: molhoLabel, preparedGrams: 0, children: [] };
          groups.set(groupKey, group);
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
      if (group.combined) {
        const counted = group.children.filter((c) => c.counted);
        group.preparedGrams = counted.reduce((s, c) => s + c.preparedGrams, 0);
        group.rawGrams = counted.reduce((s, c) => s + rawGramsForFood(c.food, c.preparedGrams), 0);
      }
    }
    groupList.sort((a, b) => {
      const totalA = a.combined ? a.preparedGrams : a.preparedGrams + a.children.reduce((s, c) => s + c.preparedGrams, 0);
      const totalB = b.combined ? b.preparedGrams : b.preparedGrams + b.children.reduce((s, c) => s + c.preparedGrams, 0);
      return totalB - totalA;
    });
    return groupList;
  }, [recipes, lines]);

  /** Total de cada ingrediente somando todos os pratos e preparos (alimento por alimento). */
  const flatTotals = useMemo(() => {
    if (!recipes) return [];
    const byFood = new Map<string, ChildIngredientTotal>();
    for (const line of lines) {
      const recipe = recipes.find((r) => r.item_id === line.itemId && r.size === line.size);
      if (!recipe) continue;
      for (const ing of flattenIngredients(recipe.ingredients)) {
        const add = ing.grams * line.quantity;
        const existing = byFood.get(ing.food.id);
        if (existing) existing.preparedGrams += add;
        else byFood.set(ing.food.id, { food: ing.food, preparedGrams: add });
      }
    }
    return sortByReferenceThenWeight(Array.from(byFood.values()));
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

          {flatTotals.length > 0 && (
            <div className="card mt-4 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-nutrir-ink/70">
                Total
              </h2>
              <p className="text-xs text-nutrir-ink/50">
                Quanto de cada ingrediente você precisa no dia, somando todos os preparos.
              </p>
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
                    {flatTotals.map((item) => (
                      <tr key={item.food.id} className="border-b border-nutrir-nude-dark/20 last:border-0">
                        <td
                          className={`py-2 pr-2 text-nutrir-ink ${
                            item.food.is_reference_only ? "" : "font-bold"
                          }`}
                        >
                          {sentenceCase(item.food.display_name)}
                          {item.food.is_reference_only && (
                            <span className="ml-1 text-xs text-nutrir-ink/45">(referência)</span>
                          )}
                        </td>
                        <td className="py-2 pr-2 text-right font-semibold text-nutrir-ink">
                          {fmtGrams(item.preparedGrams)}
                        </td>
                        <td className="py-2 text-right text-nutrir-burgundy">
                          {fmtGrams(rawGramsForFood(item.food, item.preparedGrams))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {totals.length > 0 && (
            <div className="card mt-4 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-nutrir-ink/70">
                Separado por preparo
              </h2>
              <p className="text-xs text-nutrir-ink/50">
                Quanto vai em cada preparo (molho da massa, do frango, da carne, de cada strogonoff,
                champignon e creme de cada strogonoff...).
              </p>
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
                      <Fragment key={group.label ?? group.food.id}>
                        <tr className="border-b border-nutrir-nude-dark/20 bg-nutrir-canvas-alt/10">
                          <td className="py-2 pr-2 font-bold uppercase text-nutrir-ink">
                            {group.label ?? group.food.display_name}
                          </td>
                          <td className="py-2 pr-2 text-right font-semibold text-nutrir-ink">
                            {fmtGrams(group.preparedGrams)}
                          </td>
                          <td className="py-2 text-right text-nutrir-burgundy">
                            {fmtGrams(
                              group.combined
                                ? group.rawGrams ?? 0
                                : rawGramsForFood(group.food, group.preparedGrams)
                            )}
                          </td>
                        </tr>
                        {group.children.map((child) => (
                          <tr
                            key={`${group.label ?? group.food.id}-${child.food.id}`}
                            className="border-b border-nutrir-nude-dark/20 last:border-0"
                          >
                            <td
                              className={`py-2 pr-2 pl-6 text-nutrir-ink ${
                                child.food.is_reference_only || child.asReference ? "" : "font-bold"
                              }`}
                            >
                              {sentenceCase(child.food.display_name)}
                              {(child.food.is_reference_only || child.asReference) && (
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
                Cada ingrediente principal (carne, frango, arroz, massa...) vem com seus
                secundários logo abaixo (ex: patinho, brócolis, sal). Em carne, frango e arroz o total do grupo é a soma dos secundários. "Cru" usa o fator de cocção de cada ingrediente (peso pronto ÷ fator). Itens
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
