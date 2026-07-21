export interface Food {
  name: string;
  quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  taco_id?: number;
  grams?: number;
  // Só presente na revisão de import (ver DietImportPreview), nome do prato
  // composto original quando esse item veio de decomposição (ex: "Canja de
  // galinha"). Nunca é persistido na dieta salva.
  dish_name?: string;
}

export interface Meal {
  id: string;
  name: string;
  time: string;
  foods: Food[];
}

// Prato composto salvo pelo usuário (ex: "Crepioca"), confirmado uma vez no
// fluxo de "Descrever com IA" ou criado manualmente no Perfil. Reaproveitado
// depois: a IA usa os ingredientes salvos direto, sem perguntar de novo.
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  ingredients: Food[];
  status: ApprovalStatus;
  created_at: string;
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

// Dieta gerada por IA aguardando revisão de nutricionista (fila em /aprovar,
// ver GET /nootr/admin/diets/pending), mesmos campos de DietSummary + quem é
// o dono e quando foi criada, pro admin decidir.
export interface AdminPendingDiet extends DietSummary {
  user_id: string;
  status: "pending_review" | "approved";
  created_at: string;
}

export interface TacoFoodResult {
  taco_id: number | null;   // null quando é um alimento próprio do usuário (custom_id preenchido)
  custom_id: string | null;
  name: string;       // nome de exibição ("Arroz tipo 1 cozido")
  full_name: string;  // nome original da TACO (= name para itens próprios)
  category: string;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  pending_approval: boolean; // alimento próprio ainda não revisado pra entrar na base geral
}

export interface CustomFoodInput {
  name: string;
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  fiber_100g?: number;
  sodium_100mg?: number;
}

export interface CustomFood extends CustomFoodInput {
  id: string;
  user_id: string;
  status: ApprovalStatus;
  created_at: string;
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
  // false = conta nova, nunca salvou nada, o app deve levar pro onboarding
  // (país + plano) antes de mostrar o resto (ver app/onboarding).
  has_profile: boolean;
  plan: Plan;
  billing_cycle: "mensal" | "anual";
  country: string;
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
  ai_diet_generated_at: string | null;
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

// Ingrediente proposto pela IA ao decompor um prato composto desconhecido,
// ainda não casado com a TACO (isso só acontece depois de confirmado).
export interface ProposedIngredient {
  name: string;
  quantity: string;
}

export type ParseMealResponse =
  | {
      status: "question";
      question: string;
      // "confirm_ingredients": a IA decompôs um prato que não conhecia (não
      // está nas receitas salvas nem na lista já coberta) e quer confirmação
      // antes de finalizar, mostra proposed_dish_name/proposed_ingredients.
      question_kind: "text" | "confirm_ingredients";
      proposed_dish_name: string;
      proposed_ingredients: ProposedIngredient[];
      history: ConverseTurn[];
    }
  | {
      status: "done";
      // nomes dos alimentos planejados da refeição que a IA entendeu que não
      // foram comidos (esquema de troca, o resto da refeição fica intacto)
      skipped_names: string[];
      foods: AIMatchedFood[]; // o que foi comido no lugar (ou a mais), pode ser vazio
      unmatched: string[];
      history: ConverseTurn[];
      // preenchido quando um prato composto novo foi decomposto e confirmado
      // agora, o app oferece "salvar como receita" usando `foods` acima.
      proposed_dish_name: string;
    };

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
  // Quando só escalar as quantidades não bastou pra bater a meta do dia: a
  // IA sugeriu adicionar/remover algo de uma refeição ajustável e foi aplicado.
  topup_applied?: { meal_name: string; additions: string[]; removals: string[] };
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

// Import de dieta (PDF/Word/Excel) em duas etapas: /import/preview casa os
// alimentos mas não salva nada; o usuário revisa pratos compostos detectados
// (ver DishReviewModal, agrupados por Food.dish_name) e /import/confirm
// grava o resultado (possivelmente editado) de volta.
export interface DietImportMenu {
  label: string;
  days: number[];
  meals: Meal[];
  totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}

export interface DietImportPreview {
  menus: DietImportMenu[];
  unmatched: string[];
  preferences: { allergies: string[]; dislikes: string[]; likes: string[]; notes: string };
  targets: Record<string, number>;
}

export interface RecipeToSaveInput {
  name: string;
  ingredients: FoodInput[];
}

export interface DietImportConfirmInput {
  name: string;
  menus: DietImportMenu[];
  preferences: DietImportPreview["preferences"];
  targets: Record<string, number>;
  recipes_to_save: RecipeToSaveInput[];
}
