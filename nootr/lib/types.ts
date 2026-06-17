export interface Food {
  name: string;
  quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
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

export type SubstitutionAction = "ate_different" | "will_eat_different" | "missing_food";

export interface SubstitutionResult {
  action: SubstitutionAction;
  action_label: string;
  input: string;
  suggestion: string;
  remaining_calories: number;
  remaining_protein_g: number;
  adjusted_meals: Meal[];
}
