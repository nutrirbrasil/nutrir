import type {
  Diet,
  DietSummary,
  FoodInput,
  MealInput,
  Plan,
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

  // perfil (plano, dados corporais, fórmula de cálculo calórico)
  getProfile: (token: string) => api<Profile>("/nootr/profile", token),
  updateProfile: (token: string, body: Partial<Omit<Profile, "user_id">>) =>
    api<Profile>("/nootr/profile", token, { method: "PUT", body: JSON.stringify(body) }),

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

  // autocomplete da TACO (nomes de exibição)
  searchFoods: (token: string, q: string) =>
    api<{ results: TacoFoodResult[] }>(`/nootr/foods/search?q=${encodeURIComponent(q)}`, token),
};
