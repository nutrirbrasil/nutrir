import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/session-auth";
import {
  getRecipe,
  replaceRecipeIngredients,
  updateRecipeObservations,
  type RecipeIngredientInput,
} from "@/lib/recipes-db";
import type { MarmitaSize } from "@/lib/menu-data";

interface PatchBody {
  observations?: string | null;
  ingredients?: RecipeIngredientInput[];
}

function isValidSize(size: string): size is MarmitaSize {
  return size === "P" || size === "G";
}

function validateIngredientTree(items: RecipeIngredientInput[]): string | null {
  for (const ing of items) {
    if (!ing.food_id || !(ing.grams > 0)) {
      return "Cada ingrediente precisa de um alimento válido e gramas maior que zero.";
    }
    if (ing.children?.length) {
      const childError = validateIngredientTree(ing.children);
      if (childError) return childError;
    }
  }
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: { itemId: string; size: string } }
) {
  const isAdmin = await verifyAdminRequest(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!isValidSize(params.size)) {
    return NextResponse.json({ error: "Tamanho inválido." }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const existing = await getRecipe(params.itemId, params.size);
  if (!existing) {
    return NextResponse.json({ error: "Ficha técnica não encontrada." }, { status: 404 });
  }

  if (body.ingredients !== undefined) {
    if (body.ingredients.length === 0) {
      return NextResponse.json(
        { error: "A receita precisa de pelo menos um ingrediente." },
        { status: 400 }
      );
    }
    const validationError = validateIngredientTree(body.ingredients);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { ok, error } = await replaceRecipeIngredients(params.itemId, params.size, body.ingredients);
    if (!ok) {
      return NextResponse.json({ error: error ?? "Não foi possível salvar os ingredientes." }, { status: 400 });
    }
  }

  if (body.observations !== undefined) {
    await updateRecipeObservations(params.itemId, params.size, body.observations?.trim() || null);
  }

  const recipe = await getRecipe(params.itemId, params.size);
  return NextResponse.json({ recipe });
}
