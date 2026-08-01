import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/session-auth";
import { createFood, listFoods } from "@/lib/recipes-db";
import type { FoodInput } from "@/lib/marmita-nutrition";

/** Catálogo de ingredientes, público (alimenta o cálculo nutricional em /marmitas). */
export async function GET() {
  const foods = await listFoods();
  return NextResponse.json({ foods });
}

function validateFoodInput(body: Partial<FoodInput>): string | null {
  if (!body.display_name?.trim()) return "Informe o nome do ingrediente (como aparece no rótulo).";
  if (!body.reference_label?.trim()) return "Informe o nome de referência do ingrediente.";
  const numericFields: (keyof FoodInput)[] = [
    "kcal",
    "protein_g",
    "carbs_g",
    "fat_g",
    "fiber_g",
    "sodium_mg",
  ];
  for (const field of numericFields) {
    const value = body[field];
    if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
      return `Informe um valor numérico válido para ${field}.`;
    }
  }
  return null;
}

export async function POST(request: Request) {
  const isAdmin = await verifyAdminRequest(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: FoodInput;
  try {
    body = (await request.json()) as FoodInput;
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const validationError = validateFoodInput(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { food, error } = await createFood(body);
  if (!food) {
    return NextResponse.json({ error: error ?? "Não foi possível criar o ingrediente." }, { status: 400 });
  }

  return NextResponse.json({ food });
}
