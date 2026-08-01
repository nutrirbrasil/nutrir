import { getSupabaseAdmin } from "./supabase-server";
import type { Food, FoodInput, Recipe, RecipeIngredient } from "./marmita-nutrition";
import type { MarmitaSize } from "./menu-data";

const FOOD_COLUMNS =
  "id, display_name, reference_label, source, kcal, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, saturated_fat_g, contains_gluten, contains_lactose, cooking_factor, is_reference_only";

export async function listFoods(): Promise<Food[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const { data, error } = await db
    .from("nutrir_foods")
    .select(FOOD_COLUMNS)
    .order("display_name", { ascending: true });

  if (error) {
    console.error("[Supabase] listFoods:", error.message);
    return [];
  }

  return (data ?? []) as Food[];
}

function slugifyFoodId(displayName: string): string {
  return displayName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function createFood(
  input: FoodInput
): Promise<{ food: Food | null; error?: string }> {
  const db = getSupabaseAdmin();
  if (!db) return { food: null, error: "Supabase indisponível." };

  const baseId = slugifyFoodId(input.display_name);
  if (!baseId) return { food: null, error: "Nome inválido para o ingrediente." };

  let id = baseId;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await db
      .from("nutrir_foods")
      .insert({
        id,
        display_name: input.display_name.trim(),
        reference_label: input.reference_label.trim(),
        source: input.source?.trim() || null,
        kcal: input.kcal,
        protein_g: input.protein_g,
        carbs_g: input.carbs_g,
        fat_g: input.fat_g,
        fiber_g: input.fiber_g,
        sodium_mg: input.sodium_mg,
        saturated_fat_g: input.saturated_fat_g ?? null,
        contains_gluten: input.contains_gluten ?? false,
        contains_lactose: input.contains_lactose ?? false,
        cooking_factor: input.cooking_factor ?? 1,
        is_reference_only: input.is_reference_only ?? false,
      })
      .select(FOOD_COLUMNS)
      .single();

    if (!error) return { food: data as Food };

    // id já existe (colisão de slug) — tenta um sufixo numérico.
    if (error.code === "23505") {
      id = `${baseId}_${attempt + 2}`;
      continue;
    }

    console.error("[Supabase] createFood:", error.message);
    return { food: null, error: "Não foi possível criar o ingrediente." };
  }

  return { food: null, error: "Não foi possível gerar um id único para o ingrediente." };
}

export async function updateFood(
  id: string,
  patch: Partial<FoodInput>
): Promise<{ food: Food | null; error?: string }> {
  const db = getSupabaseAdmin();
  if (!db) return { food: null, error: "Supabase indisponível." };

  const update: Record<string, unknown> = {};
  if (patch.display_name !== undefined) update.display_name = patch.display_name.trim();
  if (patch.reference_label !== undefined) update.reference_label = patch.reference_label.trim();
  if (patch.source !== undefined) update.source = patch.source?.trim() || null;
  if (patch.kcal !== undefined) update.kcal = patch.kcal;
  if (patch.protein_g !== undefined) update.protein_g = patch.protein_g;
  if (patch.carbs_g !== undefined) update.carbs_g = patch.carbs_g;
  if (patch.fat_g !== undefined) update.fat_g = patch.fat_g;
  if (patch.fiber_g !== undefined) update.fiber_g = patch.fiber_g;
  if (patch.sodium_mg !== undefined) update.sodium_mg = patch.sodium_mg;
  if (patch.saturated_fat_g !== undefined) update.saturated_fat_g = patch.saturated_fat_g ?? null;
  if (patch.contains_gluten !== undefined) update.contains_gluten = patch.contains_gluten;
  if (patch.contains_lactose !== undefined) update.contains_lactose = patch.contains_lactose;
  if (patch.cooking_factor !== undefined) update.cooking_factor = patch.cooking_factor;
  if (patch.is_reference_only !== undefined) update.is_reference_only = patch.is_reference_only;

  const { data, error } = await db
    .from("nutrir_foods")
    .update(update)
    .eq("id", id)
    .select(FOOD_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("[Supabase] updateFood:", error.message);
    return { food: null, error: "Não foi possível atualizar o ingrediente." };
  }

  if (!data) return { food: null, error: "Ingrediente não encontrado." };

  return { food: data as Food };
}

interface RecipeIngredientRow {
  id: string;
  grams: number;
  note: string | null;
  parent_id: string | null;
  food: Food;
}

interface RecipeRow {
  item_id: string;
  size: MarmitaSize;
  observations: string | null;
  nutrir_recipe_ingredients: RecipeIngredientRow[];
}

const RECIPE_SELECT = `item_id, size, observations, nutrir_recipe_ingredients ( id, grams, note, parent_id, food:nutrir_foods ( ${FOOD_COLUMNS} ) )`;

/** Monta a árvore (item principal + subitens) a partir da lista plana vinda do banco. */
function buildIngredientTree(rows: RecipeIngredientRow[]): RecipeIngredient[] {
  const byId = new Map<string, RecipeIngredient>();
  for (const row of rows) {
    byId.set(row.id, {
      id: row.id,
      food: row.food,
      grams: Number(row.grams),
      note: row.note,
      children: [],
    });
  }

  const roots: RecipeIngredient[] = [];
  for (const row of rows) {
    const node = byId.get(row.id)!;
    const parent = row.parent_id ? byId.get(row.parent_id) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function mapRecipeRow(row: RecipeRow): Recipe {
  return {
    item_id: row.item_id,
    size: row.size,
    observations: row.observations,
    ingredients: buildIngredientTree(row.nutrir_recipe_ingredients ?? []),
  };
}

export async function listRecipes(): Promise<Recipe[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const { data, error } = await db.from("nutrir_recipes").select(RECIPE_SELECT);

  if (error) {
    console.error("[Supabase] listRecipes:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as RecipeRow[]).map(mapRecipeRow);
}

export async function getRecipe(itemId: string, size: MarmitaSize): Promise<Recipe | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("nutrir_recipes")
    .select(RECIPE_SELECT)
    .eq("item_id", itemId)
    .eq("size", size)
    .maybeSingle();

  if (error) {
    console.error("[Supabase] getRecipe:", error.message);
    return null;
  }

  if (!data) return null;
  return mapRecipeRow(data as unknown as RecipeRow);
}

/** Substitui a lista inteira de ingredientes da receita (delete + insert em árvore). */
export interface RecipeIngredientInput {
  food_id: string;
  grams: number;
  note?: string | null;
  children?: RecipeIngredientInput[];
}

/** Insere um item e, em seguida, seus subitens (que precisam do id gerado do pai). */
async function insertIngredientTree(
  db: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  recipeId: string,
  parentId: string | null,
  input: RecipeIngredientInput
): Promise<void> {
  const { data, error } = await db
    .from("nutrir_recipe_ingredients")
    .insert({
      recipe_id: recipeId,
      food_id: input.food_id,
      grams: input.grams,
      note: input.note?.trim() || null,
      parent_id: parentId,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao inserir ingrediente.");
  }

  for (const child of input.children ?? []) {
    await insertIngredientTree(db, recipeId, data.id, child);
  }
}

export async function replaceRecipeIngredients(
  itemId: string,
  size: MarmitaSize,
  ingredients: RecipeIngredientInput[]
): Promise<{ ok: boolean; error?: string }> {
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, error: "Supabase indisponível." };

  const { data: recipe, error: findError } = await db
    .from("nutrir_recipes")
    .select("id")
    .eq("item_id", itemId)
    .eq("size", size)
    .maybeSingle();

  if (findError || !recipe) {
    return { ok: false, error: "Ficha técnica não encontrada." };
  }

  // Guarda os ids antigos ANTES de inserir os novos — só apaga depois que o
  // insert inteiro tiver funcionado, pra nunca ficar sem ingrediente nenhum
  // se o insert falhar no meio (ex: food_id inválido).
  const { data: oldRows, error: oldRowsError } = await db
    .from("nutrir_recipe_ingredients")
    .select("id")
    .eq("recipe_id", recipe.id);

  if (oldRowsError) {
    console.error("[Supabase] replaceRecipeIngredients (read old):", oldRowsError.message);
    return { ok: false, error: "Não foi possível ler os ingredientes atuais." };
  }

  try {
    for (const top of ingredients) {
      await insertIngredientTree(db, recipe.id, null, top);
    }
  } catch (err) {
    console.error("[Supabase] replaceRecipeIngredients (insert):", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Não foi possível salvar os novos ingredientes.",
    };
  }

  const oldIds = (oldRows ?? []).map((r) => r.id);
  if (oldIds.length > 0) {
    const { error: deleteError } = await db
      .from("nutrir_recipe_ingredients")
      .delete()
      .in("id", oldIds);

    if (deleteError) {
      console.error("[Supabase] replaceRecipeIngredients (delete old):", deleteError.message);
      return {
        ok: false,
        error: "Os novos ingredientes foram salvos, mas os antigos não puderam ser removidos. Recarregue a página.",
      };
    }
  }

  return { ok: true };
}

export async function updateRecipeObservations(
  itemId: string,
  size: MarmitaSize,
  observations: string | null
): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;

  const { error } = await db
    .from("nutrir_recipes")
    .update({ observations })
    .eq("item_id", itemId)
    .eq("size", size);

  if (error) {
    console.error("[Supabase] updateRecipeObservations:", error.message);
    return false;
  }

  return true;
}
