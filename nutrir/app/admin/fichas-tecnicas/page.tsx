"use client";

import { useEffect, useMemo, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import { useProfile } from "@/lib/profile-context";
import { nutrirApi, type RecipeIngredientPayload } from "@/lib/api";
import { MENU_SECTIONS, type MarmitaSize } from "@/lib/menu-data";
import {
  computeNutritionFacts,
  getMergedIngredientTotals,
  rawGramsForFood,
  rolledUpGrams,
  type Food,
  type FoodInput,
  type Recipe,
  type RecipeIngredient,
} from "@/lib/marmita-nutrition";
import { NutritionTable } from "@/components/NutritionTable";
import { useRecipesData, invalidateRecipesCache } from "@/lib/use-recipes-data";

interface RecipeTarget {
  itemId: string;
  itemName: string;
  size: MarmitaSize;
}

function buildAllTargets(): RecipeTarget[] {
  const seen = new Set<string>();
  const targets: RecipeTarget[] = [];
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

const EMPTY_FOOD_FORM: FoodInput = {
  display_name: "",
  reference_label: "",
  source: "",
  kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
  sodium_mg: 0,
  saturated_fat_g: undefined,
  contains_gluten: false,
  contains_lactose: false,
  cooking_factor: 1,
  is_reference_only: false,
};

let pendingKeySeq = 0;
function nextKey(): string {
  pendingKeySeq += 1;
  return `pending-${pendingKeySeq}`;
}

interface PendingIngredient {
  key: string;
  food: Food;
  /** Peso pronto/como consumido (g) deste item — não inclui os subitens. */
  grams: number;
  note: string;
  /** Só controla como o campo de gramas é exibido/editado, não o que é salvo. */
  inputMode: "prepared" | "raw";
  children: PendingIngredient[];
  showChildren: boolean;
}

function toPending(ingredients: RecipeIngredient[]): PendingIngredient[] {
  return ingredients.map((i) => ({
    key: nextKey(),
    food: i.food,
    grams: i.grams,
    note: i.note ?? "",
    inputMode: "prepared",
    children: toPending(i.children),
    showChildren: i.children.length > 0,
  }));
}

function toRecipeIngredientTree(items: PendingIngredient[]): RecipeIngredient[] {
  return items.map((p) => ({
    id: p.key,
    food: p.food,
    grams: p.grams,
    note: p.note || null,
    children: toRecipeIngredientTree(p.children),
  }));
}

function toPayload(items: PendingIngredient[]): RecipeIngredientPayload[] {
  return items.map((p) => ({
    food_id: p.food.id,
    grams: p.grams,
    note: p.note.trim() || null,
    children: p.children.length ? toPayload(p.children) : undefined,
  }));
}

function updateNodeByKey(
  items: PendingIngredient[],
  key: string,
  patch: Partial<PendingIngredient>
): PendingIngredient[] {
  return items.map((p) => {
    if (p.key === key) return { ...p, ...patch };
    if (p.children.length) return { ...p, children: updateNodeByKey(p.children, key, patch) };
    return p;
  });
}

function removeNodeByKey(items: PendingIngredient[], key: string): PendingIngredient[] {
  return items
    .filter((p) => p.key !== key)
    .map((p) => (p.children.length ? { ...p, children: removeNodeByKey(p.children, key) } : p));
}

function addChildByKey(
  items: PendingIngredient[],
  parentKey: string,
  child: PendingIngredient
): PendingIngredient[] {
  return items.map((p) => {
    if (p.key === parentKey) return { ...p, children: [...p.children, child], showChildren: true };
    if (p.children.length) return { ...p, children: addChildByKey(p.children, parentKey, child) };
    return p;
  });
}

function newPendingItem(food: Food): PendingIngredient {
  return { key: nextKey(), food, grams: 10, note: "", inputMode: "prepared", children: [], showChildren: false };
}

interface ProductionRow {
  key: string;
  label: string;
  food: Food;
  grams: number;
}

/**
 * Linhas pra produção em lote: item principal + cada subitem SEPARADO (não
 * mesclado entre grupos, ao contrário da lista de ingredientes do rótulo) —
 * pra saber quanto de cada coisa vai em cada componente (ex: sal no frango x
 * sal no arroz). Inclui os só-de-referência (água), que não entram em nenhum
 * outro cálculo.
 */
function buildProductionRows(items: PendingIngredient[]): ProductionRow[] {
  const rows: ProductionRow[] = [];
  for (const top of items) {
    rows.push({ key: top.key, label: top.food.display_name, food: top.food, grams: top.grams });
    for (const child of top.children) {
      rows.push({
        key: child.key,
        label: `↳ ${child.food.display_name} (${top.food.display_name})`,
        food: child.food,
        grams: child.grams,
      });
    }
  }
  return rows;
}

/** Seletor de ingrediente do catálogo (usado tanto pra item principal quanto pra subitem). */
function AddIngredientControl({
  foods,
  onAdd,
  compact,
}: {
  foods: Food[];
  onAdd: (food: Food) => void;
  compact?: boolean;
}) {
  const [selectedId, setSelectedId] = useState("");
  return (
    <div className="flex items-center gap-2">
      <select
        className={`input-field flex-1 ${compact ? "text-xs" : ""}`}
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        <option value="">Escolha um ingrediente do catálogo…</option>
        {foods.map((f) => (
          <option key={f.id} value={f.id}>
            {f.display_name}
            {f.is_reference_only ? " (referência, não conta)" : ""}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => {
          const food = foods.find((f) => f.id === selectedId);
          if (!food) return;
          onAdd(food);
          setSelectedId("");
        }}
        disabled={!selectedId}
        className="btn-secondary disabled:opacity-40"
      >
        Adicionar
      </button>
    </div>
  );
}

function GramsInput({
  item,
  onChange,
  onToggleMode,
}: {
  item: PendingIngredient;
  onChange: (grams: number) => void;
  onToggleMode: () => void;
}) {
  const canToggleRaw = (item.food.cooking_factor || 1) !== 1;
  const displayed = item.inputMode === "raw" ? rawGramsForFood(item.food, item.grams) : item.grams;

  function handleInput(typed: number) {
    const factor = item.food.cooking_factor || 1;
    onChange(item.inputMode === "raw" ? typed * factor : typed);
  }

  return (
    <>
      <input
        type="number"
        min={0}
        step="0.1"
        className="input-field w-20"
        value={displayed}
        onChange={(e) => handleInput(Number(e.target.value))}
      />
      <span className="text-xs text-nutrir-emerald/60">g</span>
      {canToggleRaw && (
        <button
          type="button"
          onClick={onToggleMode}
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            item.inputMode === "raw" ? "bg-nutrir-burgundy text-nutrir-nude" : "bg-nutrir-emerald/10 text-nutrir-emerald"
          }`}
          title="Alternar entre peso cru e peso pronto"
        >
          {item.inputMode === "raw" ? "cru" : "pronto"}
        </button>
      )}
    </>
  );
}

function RecipeEditor({
  target,
  recipe,
  foods,
  onClose,
  onSaved,
  onFoodCreated,
}: {
  target: RecipeTarget;
  recipe: Recipe;
  foods: Food[];
  onClose: () => void;
  onSaved: () => void;
  onFoodCreated: (food: Food) => void;
}) {
  const { session } = useProfile();
  const [pending, setPending] = useState<PendingIngredient[]>(() => toPending(recipe.ingredients));
  const [observations, setObservations] = useState(recipe.observations ?? "");
  const [showNewFood, setShowNewFood] = useState(false);
  const [newFood, setNewFood] = useState<FoodInput>(EMPTY_FOOD_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [batchCount, setBatchCount] = useState(1);

  const previewRecipe: Recipe = useMemo(
    () => ({ item_id: target.itemId, size: target.size, observations, ingredients: toRecipeIngredientTree(pending) }),
    [pending, target, observations]
  );
  const previewFacts = useMemo(() => computeNutritionFacts(previewRecipe), [previewRecipe]);
  const mergedTotals = useMemo(() => getMergedIngredientTotals(previewRecipe), [previewRecipe]);
  const productionRows = useMemo(() => buildProductionRows(pending), [pending]);

  function addTopLevel(food: Food) {
    setPending((prev) => [...prev, newPendingItem(food)]);
  }

  function addChild(parentKey: string, food: Food) {
    setPending((prev) => addChildByKey(prev, parentKey, newPendingItem(food)));
  }

  async function handleCreateFood(forParentKey: string | null) {
    if (!session?.access_token) return;
    if (!newFood.display_name.trim() || !newFood.reference_label.trim()) {
      setError("Preencha o nome do ingrediente e o nome de referência.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const { food } = await nutrirApi.createFood(newFood, session.access_token);
      if (forParentKey) {
        setPending((prev) => addChildByKey(prev, forParentKey, newPendingItem(food)));
      } else {
        setPending((prev) => [...prev, newPendingItem(food)]);
      }
      onFoodCreated(food);
      setNewFood(EMPTY_FOOD_FORM);
      setShowNewFood(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o ingrediente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!session?.access_token) return;
    if (pending.length === 0) {
      setError("Adicione pelo menos um ingrediente.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await nutrirApi.updateRecipe(
        target.itemId,
        target.size,
        { observations: observations.trim() || null, ingredients: toPayload(pending) },
        session.access_token
      );
      invalidateRecipesCache();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a ficha técnica.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card mt-2 space-y-4 border-2 border-nutrir-emerald/30">
      <h3 className="font-display text-lg font-bold text-nutrir-emerald">
        {target.itemName} ({target.size})
      </h3>

      <div className="space-y-3">
        {pending.map((item) => {
          const total = rolledUpGrams({ id: item.key, food: item.food, grams: item.grams, note: null, children: toRecipeIngredientTree(item.children) });
          return (
            <div key={item.key} className="rounded-xl border border-nutrir-nude-dark/40 p-2.5">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm text-nutrir-emerald">
                  {item.food.display_name}
                  {item.children.length > 0 && (
                    <span className="ml-1 text-xs text-nutrir-emerald/60">
                      (total {total} g = {item.grams} g + {total - item.grams} g de subitens)
                    </span>
                  )}
                </span>
                <GramsInput
                  item={item}
                  onChange={(grams) => setPending((prev) => updateNodeByKey(prev, item.key, { grams }))}
                  onToggleMode={() =>
                    setPending((prev) =>
                      updateNodeByKey(prev, item.key, {
                        inputMode: item.inputMode === "raw" ? "prepared" : "raw",
                      })
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() => setPending((prev) => removeNodeByKey(prev, item.key))}
                  className="text-sm font-bold text-nutrir-burgundy"
                >
                  Remover
                </button>
              </div>

              <input
                className="input-field mt-2 text-xs"
                placeholder="Observação (ex: 1% do peso cru do frango)"
                value={item.note}
                onChange={(e) =>
                  setPending((prev) => updateNodeByKey(prev, item.key, { note: e.target.value }))
                }
              />

              <button
                type="button"
                onClick={() =>
                  setPending((prev) => updateNodeByKey(prev, item.key, { showChildren: !item.showChildren }))
                }
                className="mt-2 text-xs font-bold text-nutrir-emerald underline underline-offset-2"
              >
                {item.showChildren
                  ? "Esconder subitens"
                  : item.children.length > 0
                    ? `Mostrar subitens (${item.children.length})`
                    : "+ Adicionar subitem"}
              </button>

              {item.showChildren && (
                <div className="mt-2 space-y-2 border-l-2 border-nutrir-nude-dark/40 pl-3">
                  {item.children.map((child) => (
                    <div key={child.key} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="flex-1 text-xs text-nutrir-emerald">{child.food.display_name}</span>
                        <GramsInput
                          item={child}
                          onChange={(grams) =>
                            setPending((prev) => updateNodeByKey(prev, child.key, { grams }))
                          }
                          onToggleMode={() =>
                            setPending((prev) =>
                              updateNodeByKey(prev, child.key, {
                                inputMode: child.inputMode === "raw" ? "prepared" : "raw",
                              })
                            )
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setPending((prev) => removeNodeByKey(prev, child.key))}
                          className="text-xs font-bold text-nutrir-burgundy"
                        >
                          Remover
                        </button>
                      </div>
                      <input
                        className="input-field text-xs"
                        placeholder="Observação (ex: 1% do peso cru do frango)"
                        value={child.note}
                        onChange={(e) =>
                          setPending((prev) => updateNodeByKey(prev, child.key, { note: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                  <AddIngredientControl foods={foods} onAdd={(food) => addChild(item.key, food)} compact />
                </div>
              )}
            </div>
          );
        })}
        {pending.length === 0 && (
          <p className="text-sm text-nutrir-emerald/60">Nenhum ingrediente ainda.</p>
        )}
      </div>

      <div className="border-t border-nutrir-nude-dark/40 pt-3">
        <AddIngredientControl foods={foods} onAdd={addTopLevel} />
        <button
          type="button"
          onClick={() => setShowNewFood((v) => !v)}
          className="btn-secondary mt-2"
        >
          + Criar novo ingrediente
        </button>
      </div>

      {showNewFood && (
        <div className="space-y-3 rounded-xl border border-nutrir-nude-dark/40 p-3">
          <p className="text-sm font-bold text-nutrir-emerald">Novo ingrediente</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-nutrir-emerald">
                Nome no rótulo (ex: cebola)
              </label>
              <input
                className="input-field"
                value={newFood.display_name}
                onChange={(e) => setNewFood({ ...newFood, display_name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-nutrir-emerald">
                Nome de referência (fonte)
              </label>
              <input
                className="input-field"
                value={newFood.reference_label}
                onChange={(e) => setNewFood({ ...newFood, reference_label: e.target.value })}
                placeholder="ex: Cebola, crua (TACO #196)"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-nutrir-emerald">
              Fonte (opcional)
            </label>
            <input
              className="input-field"
              value={newFood.source ?? ""}
              onChange={(e) => setNewFood({ ...newFood, source: e.target.value })}
            />
          </div>
          <p className="text-xs text-nutrir-emerald/60">Valores por 100 g (peso pronto/consumido):</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {(
              [
                ["kcal", "kcal"],
                ["protein_g", "proteína (g)"],
                ["carbs_g", "carboidrato (g)"],
                ["fat_g", "gordura (g)"],
                ["fiber_g", "fibra (g)"],
                ["sodium_mg", "sódio (mg)"],
              ] as [keyof FoodInput, string][]
            ).map(([field, label]) => (
              <div key={field}>
                <label className="mb-1 block text-[10px] font-medium text-nutrir-emerald">
                  {label}
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="input-field"
                  value={(newFood[field] as number) ?? 0}
                  onChange={(e) => setNewFood({ ...newFood, [field]: Number(e.target.value) })}
                />
              </div>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-nutrir-emerald">
              Fator de cocção (peso pronto ÷ peso cru — 1 se não muda)
            </label>
            <input
              type="number"
              step="0.01"
              className="input-field w-32"
              value={newFood.cooking_factor ?? 1}
              onChange={(e) => setNewFood({ ...newFood, cooking_factor: Number(e.target.value) })}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-nutrir-emerald">
              <input
                type="checkbox"
                checked={newFood.contains_gluten ?? false}
                onChange={(e) => setNewFood({ ...newFood, contains_gluten: e.target.checked })}
              />
              Contém glúten
            </label>
            <label className="flex items-center gap-2 text-sm text-nutrir-emerald">
              <input
                type="checkbox"
                checked={newFood.contains_lactose ?? false}
                onChange={(e) => setNewFood({ ...newFood, contains_lactose: e.target.checked })}
              />
              Contém lactose
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-nutrir-emerald">
            <input
              type="checkbox"
              checked={newFood.is_reference_only ?? false}
              onChange={(e) => setNewFood({ ...newFood, is_reference_only: e.target.checked })}
            />
            Só referência de preparo (ex: água) — não conta na nutrição nem na lista de ingredientes
          </label>
          <button type="button" onClick={() => handleCreateFood(null)} disabled={saving} className="btn-primary">
            Criar e adicionar à receita
          </button>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-nutrir-emerald">
          Observações gerais da receita
        </label>
        <textarea
          className="input-field min-h-16"
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder="Ex: refogar a cebola e o alho no azeite antes de adicionar o molho..."
        />
      </div>

      <div className="rounded-xl border border-nutrir-nude-dark/40 p-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-nutrir-emerald">Produção em lote</p>
          <input
            type="number"
            min={1}
            step="1"
            className="input-field w-20"
            value={batchCount}
            onChange={(e) => setBatchCount(Math.max(1, Number(e.target.value)))}
          />
          <span className="text-xs text-nutrir-emerald/60">marmita(s)</span>
        </div>
        <p className="mt-1 text-[10px] text-nutrir-emerald/50">
          Subitens aparecem separados por grupo (ex: sal do frango x sal do arroz) — não mesclados
          como na lista de ingredientes do rótulo.
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-nutrir-nude-dark/40 text-nutrir-emerald/70">
                <th className="py-1 pr-2 font-semibold">Ingrediente</th>
                <th className="py-1 pr-2 text-right font-semibold">Pronto</th>
                <th className="py-1 text-right font-semibold">Cru</th>
              </tr>
            </thead>
            <tbody>
              {productionRows.map((row) => {
                const preparedTotal = row.grams * batchCount;
                const rawTotal = rawGramsForFood(row.food, preparedTotal);
                return (
                  <tr key={row.key} className="border-b border-nutrir-nude-dark/20">
                    <td className="py-1 pr-2 text-nutrir-emerald">
                      {row.label}
                      {row.food.is_reference_only && (
                        <span className="text-nutrir-emerald/50"> (referência)</span>
                      )}
                    </td>
                    <td className="py-1 pr-2 text-right tabular-nums">{preparedTotal.toFixed(1)} g</td>
                    <td className="py-1 text-right tabular-nums">{rawTotal.toFixed(1)} g</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-nutrir-nude-dark/40 p-3">
        <p className="text-sm font-bold text-nutrir-emerald">Lista de ingredientes do rótulo</p>
        <p className="mt-1 text-xs text-nutrir-emerald/70">
          {mergedTotals.length > 0
            ? mergedTotals.map((m) => m.food.display_name).join(", ") + "."
            : "Nenhum ingrediente ainda."}
        </p>
      </div>

      {previewFacts && (
        <div>
          <p className="mb-1 text-sm font-medium text-nutrir-emerald">Prévia da tabela nutricional</p>
          <NutritionTable facts={previewFacts} />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? "Salvando..." : "Salvar ficha técnica"}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1">
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function FichasTecnicasPage() {
  const { ready } = useRequireAdmin();
  const { recipes, loading, refresh } = useRecipesData();
  const [foods, setFoods] = useState<Food[]>([]);
  const [editingTarget, setEditingTarget] = useState<RecipeTarget | null>(null);

  useEffect(() => {
    nutrirApi
      .listFoods()
      .then((r) => setFoods(r.foods))
      .catch(() => {});
  }, []);

  if (!ready) return null;

  function toggleEditing(t: RecipeTarget) {
    setEditingTarget((prev) =>
      prev && prev.itemId === t.itemId && prev.size === t.size ? null : t
    );
  }

  function countIngredients(r: Recipe | undefined): number {
    if (!r) return 0;
    let count = 0;
    const walk = (items: RecipeIngredient[]) => {
      for (const i of items) {
        count += 1;
        walk(i.children);
      }
    };
    walk(r.ingredients);
    return count;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-nutrir-emerald">Fichas técnicas</h1>
      <p className="mt-1 text-sm text-nutrir-emerald/60">
        Ingredientes e gramas de cada marmita — alimenta a tabela nutricional e a lista de
        ingredientes do rótulo automaticamente.
      </p>

      {loading && <p className="mt-6 text-sm text-nutrir-emerald/60">Carregando...</p>}

      <div className="mt-6 space-y-2">
        {ALL_TARGETS.filter((t) => t.size === "P").map((t) => {
          const recipeP = recipes?.find((r) => r.item_id === t.itemId && r.size === "P");
          const recipeG = recipes?.find((r) => r.item_id === t.itemId && r.size === "G");
          const targetP: RecipeTarget = { ...t, size: "P" };
          const targetG: RecipeTarget = { ...t, size: "G" };
          const isEditingP = editingTarget?.itemId === t.itemId && editingTarget.size === "P";
          const isEditingG = editingTarget?.itemId === t.itemId && editingTarget.size === "G";

          return (
            <div key={t.itemId} className="card">
              <p className="font-medium text-nutrir-emerald">{t.itemName}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleEditing(targetP)}
                  className={`btn-secondary flex-1 text-sm ${isEditingP ? "border-nutrir-emerald bg-nutrir-emerald/10" : ""}`}
                >
                  P · {countIngredients(recipeP)} ingredientes
                </button>
                <button
                  type="button"
                  onClick={() => toggleEditing(targetG)}
                  className={`btn-secondary flex-1 text-sm ${isEditingG ? "border-nutrir-emerald bg-nutrir-emerald/10" : ""}`}
                >
                  G · {countIngredients(recipeG)} ingredientes
                </button>
              </div>

              {isEditingP && recipeP && (
                <RecipeEditor
                  target={targetP}
                  recipe={recipeP}
                  foods={foods}
                  onClose={() => setEditingTarget(null)}
                  onSaved={async () => {
                    await refresh();
                    setEditingTarget(null);
                  }}
                  onFoodCreated={(food) => setFoods((prev) => [...prev, food])}
                />
              )}
              {isEditingG && recipeG && (
                <RecipeEditor
                  target={targetG}
                  recipe={recipeG}
                  foods={foods}
                  onClose={() => setEditingTarget(null)}
                  onSaved={async () => {
                    await refresh();
                    setEditingTarget(null);
                  }}
                  onFoodCreated={(food) => setFoods((prev) => [...prev, food])}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
