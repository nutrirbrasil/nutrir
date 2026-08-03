"use client";

import { useEffect, useMemo, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import { useProfile } from "@/lib/profile-context";
import { nutrirApi, type RecipeIngredientPayload } from "@/lib/api";
import { MENU_SECTIONS, type MarmitaSize } from "@/lib/menu-data";
import { getMarmitaImageSrc } from "@/lib/marmita-images";
import { MarmitaPhoto } from "@/components/MarmitaPhoto";
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

interface MarmitaListItem {
  itemId: string;
  itemName: string;
  imageSrc?: string;
}

function buildItemList(): MarmitaListItem[] {
  const seen = new Set<string>();
  const items: MarmitaListItem[] = [];
  for (const section of MENU_SECTIONS) {
    for (const item of section.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push({ itemId: item.id, itemName: item.name, imageSrc: getMarmitaImageSrc(item.id) });
    }
  }
  return items;
}

const ITEM_LIST = buildItemList();

function fmt(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
}

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
  /**
   * Só controla como o campo de peso é exibido/editado, não o que é salvo
   * (sempre gramas). Itens principais alternam cru/pronto; subitens
   * alternam gramas/% do peso cru do item principal.
   */
  inputMode: "prepared" | "raw" | "grams" | "percent";
  children: PendingIngredient[];
  showChildren: boolean;
}

function toPending(ingredients: RecipeIngredient[], isChild = false): PendingIngredient[] {
  return ingredients.map((i) => ({
    key: nextKey(),
    food: i.food,
    grams: i.grams,
    note: i.note ?? "",
    inputMode: isChild ? "percent" : "prepared",
    children: toPending(i.children, true),
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

function newPendingItem(food: Food, isChild = false): PendingIngredient {
  return {
    key: nextKey(),
    food,
    grams: 10,
    note: "",
    inputMode: isChild ? "percent" : "prepared",
    children: [],
    showChildren: false,
  };
}

/** % do peso cru do item principal que este subitem representa (ex: sal = 0,75% do frango cru). Não muda com a escala de porções. */
function pctOfParentCru(parentFood: Food, parentGrams: number, childGrams: number): number {
  const parentCru = rawGramsForFood(parentFood, parentGrams);
  return parentCru > 0 ? (childGrams / parentCru) * 100 : 0;
}

/** Inverso de pctOfParentCru: converte uma % do peso cru do item principal em gramas do subitem. */
function gramsFromPctOfParentCru(parentFood: Food, parentGrams: number, pct: number): number {
  const parentCru = rawGramsForFood(parentFood, parentGrams);
  return (pct / 100) * parentCru;
}

/** Peso cozido total de um item principal: ele mesmo + subitens que não são só-de-referência (água evapora, não soma). */
function cookedTotalGrams(item: RecipeIngredient): number {
  return rolledUpGrams(item);
}

/** Seletor de ingrediente do catálogo (usado tanto pra item principal quanto pra subitem). */
function AddIngredientControl({
  foods,
  onAdd,
  compact,
  placeholder = "Escolha um ingrediente do catálogo…",
}: {
  foods: Food[];
  onAdd: (food: Food) => void;
  compact?: boolean;
  placeholder?: string;
}) {
  const [selectedId, setSelectedId] = useState("");
  return (
    <div className="flex items-center gap-2">
      <select
        className={`input-field flex-1 ${compact ? "text-xs" : ""}`}
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        <option value="">{placeholder}</option>
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

/** Campo de peso do subitem: alterna entre digitar em gramas ou em % do peso cru do item principal. */
function SubitemAmountInput({
  parent,
  child,
  onChange,
  onToggleMode,
}: {
  parent: PendingIngredient;
  child: PendingIngredient;
  onChange: (grams: number) => void;
  onToggleMode: () => void;
}) {
  const isPercent = child.inputMode === "percent";
  const displayed = isPercent
    ? pctOfParentCru(parent.food, parent.grams, child.grams)
    : child.grams;

  function handleInput(typed: number) {
    onChange(isPercent ? gramsFromPctOfParentCru(parent.food, parent.grams, typed) : typed);
  }

  return (
    <>
      <input
        type="number"
        min={0}
        step="0.1"
        className="input-field w-20"
        value={Math.round(displayed * 100) / 100}
        onChange={(e) => handleInput(Number(e.target.value))}
      />
      <span className="text-xs text-nutrir-emerald/60">{isPercent ? "%" : "g"}</span>
      <button
        type="button"
        onClick={onToggleMode}
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
          isPercent ? "bg-nutrir-burgundy text-nutrir-nude" : "bg-nutrir-emerald/10 text-nutrir-emerald"
        }`}
        title="Alternar entre gramas e % do peso cru do item principal"
      >
        {isPercent ? "%" : "g"}
      </button>
    </>
  );
}

/**
 * Cartão de um ingrediente principal em modo cozinha: cru → cozido (quando o
 * alimento muda de peso ao preparar) e cada subitem (temperos, água) com
 * gramas e % do peso cru do item principal — tudo já escalado pelas porções.
 */
function CookingIngredientCard({ item, batchCount }: { item: RecipeIngredient; batchCount: number }) {
  const cruTotal = rawGramsForFood(item.food, item.grams) * batchCount;
  const cozidoTotal = cookedTotalGrams(item) * batchCount;

  return (
    <div className="rounded-2xl border-2 border-nutrir-emerald/15 bg-white/70 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-bold text-nutrir-emerald sm:text-xl">
          {item.food.display_name}
        </h3>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-nutrir-burgundy sm:text-xl">{fmt(cruTotal)} g cru</p>
          <p className="text-[11px] text-nutrir-emerald/60">rende {fmt(cozidoTotal)} g cozido</p>
        </div>
      </div>

      {item.children.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-nutrir-nude-dark/30 pt-3">
          {item.children.map((child) => {
            const childTotal = child.grams * batchCount;
            const pct = pctOfParentCru(item.food, item.grams, child.grams);
            return (
              <li key={child.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-nutrir-emerald/85">
                  <span className="text-nutrir-emerald/40">•</span> {child.food.display_name}
                  {child.food.is_reference_only && (
                    <span className="ml-1 text-[10px] text-nutrir-emerald/50">(não conta no total, evapora)</span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums font-semibold text-nutrir-emerald">
                  {fmt(childTotal)} g{" "}
                  <span className="font-normal text-nutrir-emerald/50">({pct.toFixed(1)}%)</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Ordena por quantidade cozida total (item principal + subitens, sem água) decrescente. */
function sortByCookedTotalDesc(items: RecipeIngredient[]): RecipeIngredient[] {
  return [...items].sort((a, b) => cookedTotalGrams(b) - cookedTotalGrams(a));
}

/** Visão de cozinha: bonita, grande, só leitura — o que o Pedro vai olhar com a mão suja de tempero. */
function RecipeCookingView({ recipe, batchCount }: { recipe: Recipe; batchCount: number }) {
  if (recipe.ingredients.length === 0) {
    return <p className="text-sm text-nutrir-emerald/60">Nenhum ingrediente cadastrado ainda.</p>;
  }

  const ordered = sortByCookedTotalDesc(recipe.ingredients);

  return (
    <div className="space-y-3">
      {ordered.map((item) => (
        <CookingIngredientCard key={item.id} item={item} batchCount={batchCount} />
      ))}

      {recipe.observations && (
        <div className="rounded-2xl border-2 border-nutrir-burgundy/20 bg-nutrir-burgundy/5 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-nutrir-burgundy">Modo de preparo</p>
          <p className="mt-1 whitespace-pre-line text-sm text-nutrir-emerald/90">{recipe.observations}</p>
        </div>
      )}
    </div>
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

  const previewRecipe: Recipe = useMemo(
    () => ({ item_id: target.itemId, size: target.size, observations, ingredients: toRecipeIngredientTree(pending) }),
    [pending, target, observations]
  );
  const previewFacts = useMemo(() => computeNutritionFacts(previewRecipe), [previewRecipe]);
  const mergedTotals = useMemo(() => getMergedIngredientTotals(previewRecipe), [previewRecipe]);

  function addTopLevel(food: Food) {
    setPending((prev) => [...prev, newPendingItem(food)]);
  }

  function addChild(parentKey: string, food: Food) {
    setPending((prev) => addChildByKey(prev, parentKey, newPendingItem(food, true)));
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
        setPending((prev) => addChildByKey(prev, forParentKey, newPendingItem(food, true)));
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
    <div className="space-y-4">
      <div className="space-y-3">
        {pending.map((item) => (
          <div key={item.key} className="rounded-xl border border-nutrir-nude-dark/40 p-2.5">
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm text-nutrir-emerald">{item.food.display_name}</span>
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
              placeholder="Observação (ex: refogar antes de adicionar o molho)"
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
                  : "+ Adicionar subitem (tempero, água...)"}
            </button>

            {item.showChildren && (
              <div className="mt-2 space-y-2 border-l-2 border-nutrir-nude-dark/40 pl-3">
                {item.children.map((child) => {
                  const isPercent = child.inputMode === "percent";
                  const hint = isPercent
                    ? `${fmt(child.grams)} g`
                    : `${pctOfParentCru(item.food, item.grams, child.grams).toFixed(1)}%`;
                  return (
                    <div key={child.key} className="flex items-center gap-2">
                      <span className="flex-1 text-xs text-nutrir-emerald">{child.food.display_name}</span>
                      <SubitemAmountInput
                        parent={item}
                        child={child}
                        onChange={(grams) =>
                          setPending((prev) => updateNodeByKey(prev, child.key, { grams }))
                        }
                        onToggleMode={() =>
                          setPending((prev) =>
                            updateNodeByKey(prev, child.key, {
                              inputMode: isPercent ? "grams" : "percent",
                            })
                          )
                        }
                      />
                      <span className="w-14 shrink-0 text-right text-[10px] text-nutrir-emerald/40">
                        {hint}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPending((prev) => removeNodeByKey(prev, child.key))}
                        className="text-xs font-bold text-nutrir-burgundy"
                      >
                        Remover
                      </button>
                    </div>
                  );
                })}
                <AddIngredientControl
                  foods={foods}
                  onAdd={(food) => addChild(item.key, food)}
                  compact
                  placeholder={`Adicionar subitem em ${item.food.display_name}…`}
                />
              </div>
            )}
          </div>
        ))}
        {pending.length === 0 && (
          <p className="text-sm text-nutrir-emerald/60">Nenhum ingrediente ainda.</p>
        )}
      </div>

      <div className="rounded-xl border-2 border-dashed border-nutrir-emerald/30 p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-nutrir-emerald/60">
          + Novo ingrediente principal (não é subitem de nenhum outro)
        </p>
        <AddIngredientControl
          foods={foods}
          onAdd={addTopLevel}
          placeholder="Escolha um novo ingrediente principal…"
        />
        <button type="button" onClick={() => setShowNewFood((v) => !v)} className="btn-secondary mt-2">
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
            <label className="mb-1 block text-xs font-medium text-nutrir-emerald">Fonte (opcional)</label>
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
                <label className="mb-1 block text-[10px] font-medium text-nutrir-emerald">{label}</label>
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
          Modo de preparo / observações gerais
        </label>
        <textarea
          className="input-field min-h-16"
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder="Ex: refogar a cebola e o alho no azeite antes de adicionar o molho..."
        />
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

function RecipeDetail({
  item,
  recipes,
  foods,
  onFoodCreated,
  onRefresh,
  onBack,
}: {
  item: MarmitaListItem;
  recipes: Recipe[] | null;
  foods: Food[];
  onFoodCreated: (food: Food) => void;
  onRefresh: () => Promise<void>;
  onBack: () => void;
}) {
  const [size, setSize] = useState<MarmitaSize>("P");
  const [mode, setMode] = useState<"cook" | "edit">("cook");
  const [batchCount, setBatchCount] = useState(1);

  const recipe = recipes?.find((r) => r.item_id === item.itemId && r.size === size) ?? null;
  const target: RecipeTarget = { itemId: item.itemId, itemName: item.itemName, size };

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="text-sm font-bold text-nutrir-burgundy">
        ← Todas as marmitas
      </button>

      <div className="flex items-center gap-4">
        {item.imageSrc && (
          <MarmitaPhoto
            src={item.imageSrc}
            alt={item.itemName}
            className="h-20 w-20 shrink-0 sm:h-24 sm:w-24"
            sizes="96px"
          />
        )}
        <div>
          <h1 className="font-display text-xl font-bold text-nutrir-emerald sm:text-2xl">{item.itemName}</h1>
          <div className="mt-2 flex gap-2">
            {(["P", "G"] as MarmitaSize[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSize(s);
                  setMode("cook");
                }}
                className={`rounded-full px-4 py-1 text-sm font-bold transition ${
                  size === s ? "bg-nutrir-emerald text-nutrir-cream" : "bg-nutrir-emerald/10 text-nutrir-emerald"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {mode === "cook" && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-nutrir-emerald/15 bg-nutrir-emerald/5 p-3">
          <label className="text-sm font-bold text-nutrir-emerald">Porções</label>
          <button
            type="button"
            onClick={() => setBatchCount((n) => Math.max(1, n - 1))}
            className="btn-secondary h-9 w-9 !p-0 text-lg leading-none"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            className="input-field w-16 text-center"
            value={batchCount}
            onChange={(e) => setBatchCount(Math.max(1, Number(e.target.value) || 1))}
          />
          <button
            type="button"
            onClick={() => setBatchCount((n) => n + 1)}
            className="btn-secondary h-9 w-9 !p-0 text-lg leading-none"
          >
            +
          </button>
          <span className="text-xs text-nutrir-emerald/60">marmita(s) de {size}</span>
        </div>
      )}

      {!recipe && <p className="text-sm text-nutrir-emerald/60">Carregando receita...</p>}

      {recipe && mode === "cook" && (
        <>
          <RecipeCookingView recipe={recipe} batchCount={batchCount} />
          <button type="button" onClick={() => setMode("edit")} className="btn-secondary w-full">
            ✎ Editar receita
          </button>
        </>
      )}

      {recipe && mode === "edit" && (
        <RecipeEditor
          target={target}
          recipe={recipe}
          foods={foods}
          onClose={() => setMode("cook")}
          onSaved={async () => {
            await onRefresh();
            setMode("cook");
          }}
          onFoodCreated={onFoodCreated}
        />
      )}
    </div>
  );
}

export default function FichasTecnicasPage() {
  const { ready } = useRequireAdmin();
  const { recipes, loading, refresh } = useRecipesData();
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    nutrirApi
      .listFoods()
      .then((r) => setFoods(r.foods))
      .catch(() => {});
  }, []);

  if (!ready) return null;

  const selectedItem = ITEM_LIST.find((i) => i.itemId === selectedItemId) ?? null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {!selectedItem ? (
        <>
          <h1 className="font-display text-2xl font-bold text-nutrir-emerald">Fichas técnicas</h1>
          <p className="mt-1 text-sm text-nutrir-emerald/60">
            Toque numa marmita pra ver a receita pronta pra cozinha: cru, cozido, temperos e água, em
            gramas e porcentagem.
          </p>

          {loading && <p className="mt-6 text-sm text-nutrir-emerald/60">Carregando...</p>}

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ITEM_LIST.map((item) => (
              <button
                key={item.itemId}
                type="button"
                onClick={() => setSelectedItemId(item.itemId)}
                className="card flex flex-col items-center gap-2 !p-3 text-center transition hover:shadow-md"
              >
                {item.imageSrc && (
                  <MarmitaPhoto
                    src={item.imageSrc}
                    alt={item.itemName}
                    className="aspect-square w-full"
                    sizes="200px"
                  />
                )}
                <span className="text-sm font-bold text-nutrir-emerald">{item.itemName}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <RecipeDetail
          item={selectedItem}
          recipes={recipes}
          foods={foods}
          onFoodCreated={(food) => setFoods((prev) => [...prev, food])}
          onRefresh={refresh}
          onBack={() => setSelectedItemId(null)}
        />
      )}
    </div>
  );
}
