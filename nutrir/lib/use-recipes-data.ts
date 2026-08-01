"use client";

import { useCallback, useEffect, useState } from "react";
import { nutrirApi } from "./api";
import { computeNutritionFacts, type MarmitaNutritionFacts, type Recipe } from "./marmita-nutrition";
import type { MarmitaSize } from "./menu-data";

let cachedPromise: Promise<Recipe[]> | null = null;

function fetchRecipes(): Promise<Recipe[]> {
  if (!cachedPromise) {
    cachedPromise = nutrirApi
      .listRecipes()
      .then((r) => r.recipes)
      .catch((err) => {
        cachedPromise = null;
        throw err;
      });
  }
  return cachedPromise;
}

/** Força a próxima leitura a buscar de novo (usar após salvar uma ficha técnica). */
export function invalidateRecipesCache(): void {
  cachedPromise = null;
}

/** Fichas técnicas (item_id + tamanho) — busca uma vez e cacheia entre todos os componentes. */
export function useRecipesData() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRecipes();
      setRecipes(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetchRecipes()
      .then((data) => {
        if (alive) setRecipes(data);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    invalidateRecipesCache();
    await load();
  }, [load]);

  const findRecipe = useCallback(
    (itemId: string, size: MarmitaSize): Recipe | null =>
      recipes?.find((r) => r.item_id === itemId && r.size === size) ?? null,
    [recipes]
  );

  const getNutrition = useCallback(
    (itemId: string, size: MarmitaSize): MarmitaNutritionFacts | null => {
      const recipe = findRecipe(itemId, size);
      return recipe ? computeNutritionFacts(recipe) : null;
    },
    [findRecipe]
  );

  return { recipes, loading, refresh, findRecipe, getNutrition };
}
