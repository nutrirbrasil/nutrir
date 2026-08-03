import { NextResponse } from "next/server";
import { listRecipes } from "@/lib/recipes-db";

// Sem isso o Next cacheia a resposta estaticamente (rota sem nada "dinâmico" aos
// olhos dele) e passa a servir sempre a mesma ficha técnica, mesmo após salvar.
export const dynamic = "force-dynamic";

/** Fichas técnicas + ingredientes, públicas (alimentam a tabela nutricional em /marmitas). */
export async function GET() {
  const recipes = await listRecipes();
  return NextResponse.json({ recipes });
}
