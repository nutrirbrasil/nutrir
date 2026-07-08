export interface Food {
  name: string;
  quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  taco_id?: number;
  grams?: number;
}

export interface Meal {
  id: string;
  name: string;
  time: string;
  foods: Food[];
}

export interface Diet {
  id: string;
  user_id: string;
  name: string;
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
  meals: Meal[];
}

export interface DietSummary {
  id: string;
  name: string;
  weekday: number | null;
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
  meals: Meal[];
}

export interface TacoFoodResult {
  taco_id: number;
  name: string;       // nome de exibição ("Arroz tipo 1 cozido")
  full_name: string;  // nome original da TACO
  category: string;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

export type Plan = "basic" | "pro";
export type Formula = "manual" | "harris_benedict" | "mifflin_st_jeor";
export type ActivityLevel = "sedentario" | "leve" | "moderado" | "intenso" | "atleta";

export interface MacroTargets {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface Profile {
  user_id: string;
  plan: Plan;
  sex: "m" | "f" | null;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  activity_level: ActivityLevel | null;
  formula: Formula;
  target_calories: number | null;
  protein_pct: number;
  carbs_pct: number;
  fat_pct: number;
  macro_targets_g: MacroTargets | null;
}

export interface DayMacros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  protein_pct: number;
  carbs_pct: number;
  fat_pct: number;
}

export interface BarcodeFood {
  name: string;
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
}

export interface Preferences {
  user_id: string;
  allergies: string[];
  dislikes: string[];
  likes: string[];
  pantry: string[];
  notes: string;
}

export interface ConverseTurn {
  role: "user" | "assistant";
  text: string;
}

export interface AIMatchedFood {
  taco_id: number | null;
  name: string;
  quantity: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  match_confidence: "alta" | "media" | "baixa";
}

export type ParseMealResponse =
  | { status: "question"; question: string; history: ConverseTurn[] }
  | { status: "done"; foods: AIMatchedFood[]; unmatched: string[]; history: ConverseTurn[] };

export interface FoodInput {
  grams: number;
  quantity_label?: string;
  taco_id?: number;
  // alimento customizado (código de barras): macros por 100g
  name?: string;
  kcal_100g?: number;
  protein_100g?: number;
  carbs_100g?: number;
  fat_100g?: number;
}

export interface MealInput {
  name: string;
  time: string;
  foods: FoodInput[];
}

export type SubstitutionAction = "ate_different" | "will_eat_different" | "missing_food";

export interface SubstitutionResult {
  action: SubstitutionAction;
  action_label: string;
  input: string;
  suggestion: string;
  ai_explanation: string;
  remaining_calories: number;
  remaining_protein_g: number;
  adjusted_meals: Meal[];
  macros_before: DayMacros;
  macros_after: DayMacros;
  targets: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  rebalanced: boolean;
  matched_food: string | null;
  match_confidence: "alta" | "media" | "baixa" | null;
  delta_calories: number;
  // "Estou em falta": quando a IA acha que um item da despensa combina e
  // ajuda a cobrir uma lacuna de macro deixada pelo substituto escolhido.
  wildcard_added?: string;
}

// "Estou em falta": alimento sugerido (da despensa ou da IA), já casado com a TACO.
export interface PantryMatch {
  taco_id: number | null;
  name: string;
  grams: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  match_confidence: "alta" | "media" | "baixa";
}

export type MacroProfile = "protein" | "carb" | "fat" | "balanced";
