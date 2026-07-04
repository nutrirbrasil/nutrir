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
}

export interface FoodInput {
  taco_id: number;
  grams: number;
  quantity_label?: string;
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
  remaining_calories: number;
  remaining_protein_g: number;
  adjusted_meals: Meal[];
  matched_food: string | null;
  match_confidence: "alta" | "media" | "baixa" | null;
  delta_calories: number;
}
