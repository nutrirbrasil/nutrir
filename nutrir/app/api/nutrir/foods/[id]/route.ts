import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/session-auth";
import { updateFood } from "@/lib/recipes-db";
import type { FoodInput } from "@/lib/marmita-nutrition";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const isAdmin = await verifyAdminRequest(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: Partial<FoodInput>;
  try {
    body = (await request.json()) as Partial<FoodInput>;
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  if (body.display_name !== undefined && !body.display_name.trim()) {
    return NextResponse.json({ error: "Nome do ingrediente não pode ficar vazio." }, { status: 400 });
  }

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
    if (value !== undefined && (typeof value !== "number" || Number.isNaN(value) || value < 0)) {
      return NextResponse.json({ error: `Valor inválido para ${field}.` }, { status: 400 });
    }
  }

  const { food, error } = await updateFood(params.id, body);
  if (!food) {
    return NextResponse.json({ error: error ?? "Não foi possível atualizar o ingrediente." }, { status: 400 });
  }

  return NextResponse.json({ food });
}
