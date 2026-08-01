import { NextResponse } from "next/server";
import { listRecipes } from "@/lib/recipes-db";

/** Fichas técnicas + ingredientes, públicas (alimentam a tabela nutricional em /marmitas). */
export async function GET() {
  const recipes = await listRecipes();
  return NextResponse.json({ recipes });
}
