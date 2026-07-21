import type {
  AdminPendingDiet,
  BarcodeFood,
  ConverseTurn,
  CustomFood,
  CustomFoodInput,
  Diet,
  DietImportConfirmInput,
  DietImportPreview,
  DietSummary,
  FoodInput,
  MealInput,
  PantryMatch,
  ParseMealResponse,
  Plan,
  Preferences,
  Profile,
  Recipe,
  SubstitutionAction,
  SubstitutionResult,
  TacoFoodResult,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_NOOTR_API_URL || "http://127.0.0.1:8000";

async function api<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = typeof body?.detail === "string" ? body.detail : "";
    } catch {
      detail = await res.text();
    }
    throw new Error(detail || `Erro ${res.status}`);
  }
  return res.json();
}

export const nootrApi = {
  // dieta do dia (null + needs_setup quando o usuário ainda não montou nada).
  // has_pending_review: já existe uma dieta gerada por IA (ver generateDiet)
  // aguardando revisão de um nutricionista parceiro, nunca é a dieta ativa.
  getTodayDiet: (token: string) =>
    api<{ date: string; diet: Diet | null; needs_setup: boolean; has_pending_review: boolean }>(
      "/nootr/diets/today", token
    ),

  // dietas montadas (Basic: 1 base; Pro: base + até 7 por dia da semana)
  listDiets: (token: string) =>
    api<{ plan: Plan; diets: DietSummary[]; weekday_labels: string[]; has_pending_review: boolean }>(
      "/nootr/diets", token
    ),
  // Pro: gera uma dieta básica batendo a meta calórica/macro do perfil, entra
  // em revisão de um nutricionista parceiro (até 24h) antes de ficar visível.
  generateDiet: (token: string) =>
    api<{ status: "pending_review" }>("/nootr/diets/generate", token, { method: "POST" }),
  saveDiet: (
    token: string,
    body: { name: string; weekday: number | null; target_calories?: number; meals: MealInput[] }
  ) => api<DietSummary>("/nootr/diets", token, { method: "POST", body: JSON.stringify(body) }),
  deleteDiet: (token: string, dietId: string) =>
    api<{ ok: boolean }>(`/nootr/diets/${dietId}`, token, { method: "DELETE" }),
  clearDiet: (token: string, dietId: string) =>
    api<DietSummary>(`/nootr/diets/${dietId}/clear`, token, { method: "POST" }),
  // Pro, etapa 1/2: sobe o documento da dieta (PDF/Word/Excel), a IA lê
  // o(s) cardápio(s) e casa na TACO, mas NÃO salva nada ainda. Pratos
  // compostos decompostos vêm marcados com `dish_name` em cada Food (ver
  // DishReviewModal) pro usuário decidir salvar/alterar/destrinchar antes de
  // chamar confirmDietImport. multipart/form-data, não usa o helper `api()`.
  previewDietImport: async (token: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/nootr/diets/import/preview`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) {
      let detail = "";
      try {
        const body = await res.json();
        detail = typeof body?.detail === "string" ? body.detail : "";
      } catch {
        detail = await res.text();
      }
      throw new Error(detail || `Erro ${res.status}`);
    }
    return res.json() as Promise<DietImportPreview>;
  },
  // Pro, etapa 2/2: grava o resultado do preview (revisado ou não), distribui
  // os cardápios pelos 7 dias e atualiza perfil/preferências.
  confirmDietImport: (token: string, body: DietImportConfirmInput) =>
    api<{
      diets: DietSummary[];
      menus_found: number;
      preferences: Preferences;
      profile: Partial<Profile>;
    }>("/nootr/diets/import/confirm", token, { method: "POST", body: JSON.stringify(body) }),

  // perfil (plano, dados corporais, fórmula de cálculo calórico)
  getProfile: (token: string) => api<Profile>("/nootr/profile", token),
  updateProfile: (token: string, body: Partial<Omit<Profile, "user_id">>) =>
    api<Profile>("/nootr/profile", token, { method: "PUT", body: JSON.stringify(body) }),

  // preferências (alergias, não gosta, gosta, despensa), contexto para a IA
  getPreferences: (token: string) => api<Preferences>("/nootr/preferences", token),
  updatePreferences: (token: string, body: Partial<Omit<Preferences, "user_id">>) =>
    api<Preferences>("/nootr/preferences", token, { method: "PUT", body: JSON.stringify(body) }),

  // substituições com alimentos estruturados da TACO
  suggestSubstitution: (
    token: string,
    body: {
      action: SubstitutionAction;
      meal_id: string | null;
      foods: FoodInput[];
      // ate_different / will_eat_different: nomes dos alimentos planejados
      // que não foram comidos, o resto da refeição permanece intacto.
      skipped_food_names?: string[];
      // will_eat_different: refeições que a pessoa já comeu hoje (ficam de
      // fora do reajuste, independente da ordem na lista).
      already_eaten_meal_ids?: string[];
      missing_food_name?: string;
    }
  ) =>
    api<SubstitutionResult>("/nootr/substitutions", token, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // "Estou em falta": opções da despensa com o mesmo perfil de macro do alimento que falta
  missingFoodOptions: (token: string, foodName: string) =>
    api<{ missing_food: string; profile: string; pantry_matches: PantryMatch[] }>(
      `/nootr/substitutions/missing-food-options?food_name=${encodeURIComponent(foodName)}`,
      token
    ),
  // "Buscar outros alimentos": a IA sugere o que pode substituir o item em falta
  suggestAlternatives: (token: string, missingFoodName: string) =>
    api<{ suggestions: PantryMatch[] }>("/nootr/substitutions/alternatives", token, {
      method: "POST",
      body: JSON.stringify({ missing_food_name: missingFoodName }),
    }),

  // autocomplete da TACO (nomes de exibição)
  searchFoods: (token: string, q: string) =>
    api<{ results: TacoFoodResult[] }>(`/nootr/foods/search?q=${encodeURIComponent(q)}`, token),
  // código de barras (Open Food Facts)
  lookupBarcode: (token: string, code: string) =>
    api<BarcodeFood>(`/nootr/foods/barcode/${encodeURIComponent(code)}`, token),

  // alimentos cadastrados à mão pelo usuário, permanentes na conta, pendentes
  // de revisão pra entrar na base TACO geral (ver services/repository.py)
  createCustomFood: (token: string, body: CustomFoodInput) =>
    api<CustomFood>("/nootr/foods/custom", token, { method: "POST", body: JSON.stringify(body) }),
  listCustomFoods: (token: string) => api<{ results: CustomFood[] }>("/nootr/foods/custom", token),
  deleteCustomFood: (token: string, foodId: string) =>
    api<{ ok: boolean }>(`/nootr/foods/custom/${foodId}`, token, { method: "DELETE" }),

  // IA conversacional: registra um desvio de uma refeição específica já
  // planejada (esquema de troca), pode devolver uma pergunta de
  // esclarecimento em vez de fechar direto.
  parseMeal: (
    token: string,
    text: string,
    history: ConverseTurn[],
    mealName: string,
    mealFoods: string[]
  ) =>
    api<ParseMealResponse>("/nootr/ai/parse-meal", token, {
      method: "POST",
      body: JSON.stringify({ text, history, meal_name: mealName, meal_foods: mealFoods }),
    }),

  // receitas próprias (pratos compostos salvos, ex: "Crepioca"), reaproveitadas
  // pela IA no "Descrever com IA" sem precisar confirmar os ingredientes de novo
  listRecipes: (token: string) => api<{ results: Recipe[] }>("/nootr/recipes", token),
  // Receitas aprovadas de outros usuários (ver /aprovar), "receitas da comunidade".
  listGlobalRecipes: (token: string) => api<{ results: Recipe[] }>("/nootr/recipes/global", token),
  createRecipe: (token: string, body: { name: string; ingredients: FoodInput[] }) =>
    api<Recipe>("/nootr/recipes", token, { method: "POST", body: JSON.stringify(body) }),
  deleteRecipe: (token: string, recipeId: string) =>
    api<{ ok: boolean }>(`/nootr/recipes/${recipeId}`, token, { method: "DELETE" }),

  // Admin only (/aprovar), fila de aprovação global de receitas e alimentos
  // customizados pendentes de qualquer usuário. O backend devolve 403 pra
  // quem não é o admin (ver routes/nootr/admin.py).
  admin: {
    listPendingRecipes: (token: string) => api<{ results: Recipe[] }>("/nootr/admin/recipes/pending", token),
    approveRecipe: (token: string, id: string) =>
      api<Recipe>(`/nootr/admin/recipes/${id}/approve`, token, { method: "POST" }),
    rejectRecipe: (token: string, id: string) =>
      api<Recipe>(`/nootr/admin/recipes/${id}/reject`, token, { method: "POST" }),
    listPendingCustomFoods: (token: string) =>
      api<{ results: CustomFood[] }>("/nootr/admin/custom-foods/pending", token),
    approveCustomFood: (token: string, id: string) =>
      api<CustomFood>(`/nootr/admin/custom-foods/${id}/approve`, token, { method: "POST" }),
    rejectCustomFood: (token: string, id: string) =>
      api<CustomFood>(`/nootr/admin/custom-foods/${id}/reject`, token, { method: "POST" }),
    listPendingDiets: (token: string) =>
      api<{ results: AdminPendingDiet[] }>("/nootr/admin/diets/pending", token),
    updateDiet: (token: string, id: string, meals: MealInput[]) =>
      api<AdminPendingDiet>(`/nootr/admin/diets/${id}`, token, {
        method: "PUT", body: JSON.stringify({ meals }),
      }),
    approveDiet: (token: string, id: string) =>
      api<AdminPendingDiet>(`/nootr/admin/diets/${id}/approve`, token, { method: "POST" }),
    rejectDiet: (token: string, id: string) =>
      api<{ ok: boolean }>(`/nootr/admin/diets/${id}/reject`, token, { method: "POST" }),
  },
};
