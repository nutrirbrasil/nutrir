const API_URL = process.env.NEXT_PUBLIC_NOOTR_API_URL || "http://127.0.0.1:8000";

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Erro ${res.status}`);
  }
  return res.json();
}

export const nootrApi = {
  getTodayDiet: () =>
    api<{ date: string; diet: import("./types").Diet }>("/nootr/diets/today"),
  suggestSubstitution: (body: {
    action: import("./types").SubstitutionAction;
    description: string;
    meal_id?: string;
    available_foods?: string[];
  }) => api<import("./types").SubstitutionResult>("/nootr/substitutions", {
    method: "POST",
    body: JSON.stringify(body),
  }),
};
