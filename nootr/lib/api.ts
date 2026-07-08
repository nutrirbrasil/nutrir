import type {
  BarcodeFood,
  ConverseTurn,
  Diet,
  DietSummary,
  FoodInput,
  MealInput,
  PantryMatch,
  ParseMealResponse,
  Plan,
  Preferences,
  Profile,
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
  // dieta do dia (null + needs_setup quando o usuário ainda não montou nada)
  getTodayDiet: (token: string) =>
    api<{ date: string; diet: Diet | null; needs_setup: boolean }>("/nootr/diets/today", token),

  // dietas montadas (Basic: 1 base; Pro: base + até 7 por dia da semana)
  listDiets: (token: string) =>
    api<{ plan: Plan; diets: DietSummary[]; weekday_labels: string[] }>("/nootr/diets", token),
  saveDiet: (
    token: string,
    body: { name: string; weekday: number | null; target_calories?: number; meals: MealInput[] }
  ) => api<DietSummary>("/nootr/diets", token, { method: "POST", body: JSON.stringify(body) }),
  deleteDiet: (token: string, dietId: string) =>
    api<{ ok: boolean }>(`/nootr/diets/${dietId}`, token, { method: "DELETE" }),
  clearDiet: (token: string, dietId: string) =>
    api<DietSummary>(`/nootr/diets/${dietId}/clear`, token, { method: "POST" }),
  // Pro: sobe o documento da dieta (PDF/Word/Excel) — a IA lê o(s) cardápio(s),
  // casa na TACO e distribui pelos 7 dias (respeitando dias explícitos no documento).
  // multipart/form-data — não usa o helper `api()` (que fixa Content-Type: application/json).
  importDietFile: async (token: string, file: File, name: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("name", name);
    const res = await fetch(`${API_URL}/nootr/diets/import`, {
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
    return res.json() as Promise<{
      diets: DietSummary[];
      menus_found: number;
      unmatched: string[];
      preferences: Preferences;
      profile: Partial<Profile>;
    }>;
  },

  // perfil (plano, dados corporais, fórmula de cálculo calórico)
  getProfile: (token: string) => api<Profile>("/nootr/profile", token),
  updateProfile: (token: string, body: Partial<Omit<Profile, "user_id">>) =>
    api<Profile>("/nootr/profile", token, { method: "PUT", body: JSON.stringify(body) }),

  // preferências (alergias, não gosta, gosta, despensa) — contexto para a IA
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

  // IA conversacional: pode devolver uma pergunta de esclarecimento em vez de fechar os itens
  parseMeal: (token: string, text: string, history: ConverseTurn[] = []) =>
    api<ParseMealResponse>("/nootr/ai/parse-meal", token, {
      method: "POST",
      body: JSON.stringify({ text, history }),
    }),
};
