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
  // Só vem preenchido nas rotas admin (ver repository.admin_emails_for),
  // undefined no resto do app.
  user_email?: string | null;
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
  // Snapshot da versão que o Nootr entregou (ver repository.admin_approve_diet).
  // Preenchido só em dieta gerada pelo Nootr; habilita "Restaurar dieta do
  // Nootr" depois que o usuário editou (POST /nootr/diets/{id}/restore).
  source_meals?: Meal[] | null;
}

// Metas de macro em gramas. Quando calculadas a partir do peso (ver
// energy.macro_targets_from_weight) vêm também com os limites da faixa de
// referência, pro nutricionista saber quanto pode ajustar.
export interface MacroTargetsDetailed extends MacroTargets {
  protein_min_g?: number;
  protein_max_g?: number;
  fat_min_g?: number;
  fat_max_g?: number;
  protein_g_per_kg?: number;
  fat_g_per_kg?: number;
  // Faixa de referência em g/kg, [min, max] (ver energy.PROTEIN_G_PER_KG).
  protein_per_kg_range?: [number, number];
  fat_per_kg_range?: [number, number];
}

// Contexto do paciente mostrado junto da dieta pendente em /aprovar, pro
// nutricionista julgar sem sair da tela (ver admin._with_user_context).
export interface AdminUserContext {
  sex: "m" | "f" | null;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  activity_level: ActivityLevel | null;
  country: string | null;
  formula: Formula | null;
  target_calories: number | null;
  macro_targets: MacroTargetsDetailed | null;
}

// Dieta gerada por IA aguardando revisão de nutricionista (fila em /aprovar,
// ver GET /nootr/admin/diets/pending), mesmos campos de DietSummary + quem é
// o dono e quando foi criada, pro admin decidir.
export interface AdminPendingDiet extends DietSummary {
  user_id: string;
  // E-mail do dono (ver repository.admin_emails_for), null se a view de
  // e-mails não encontrar o usuário por algum motivo, sempre cai de volta pro
  // user_id na UI (ver app/aprovar/page.tsx).
  user_email: string | null;
  user_context?: AdminUserContext;
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
  // Só vem preenchido nas rotas admin (ver repository.admin_emails_for),
  // undefined no resto do app.
  user_email?: string | null;
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
  full_name: string | null;
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
  // "percent" (padrão, único do Basic) ou "per_kg" (Pro): só muda como as
  // metas aparecem/são editadas. A dieta gerada pelo Nootr usa g/kg sempre.
  macro_mode: "percent" | "per_kg";
  protein_pct: number;
  carbs_pct: number;
  fat_pct: number;
  macro_targets_g: MacroTargetsDetailed | null;
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
  // Quantas refeições a pessoa costuma fazer e em que horários (ver
  // onboarding), usado pra montar o template de refeições na geração de
  // dieta por IA (services/meal_planning.py no backend).
  meal_count: number;
  meal_times: string[];
  // Lembrete na hora de cada refeição (ver components/MealReminders.tsx).
  meal_reminders: boolean;
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

// O que o motor mudou de fato numa refeição (ver diet_engine.diff_meals):
// alimenta a explicação da IA e a exibição do dia ajustado.
export type MealChangeKind = "increased" | "decreased" | "added" | "removed";

export interface MealChange {
  kind: MealChangeKind;
  name: string;
  from: string; // quantidade antes ("" quando o alimento foi adicionado)
  to: string;   // quantidade depois ("" quando o alimento foi removido)
}

export interface MealChanges {
  meal: string;
  changes: MealChange[];
}

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
  // Tudo que mudou em relação ao plano original do dia, por refeição (ver
  // diet_engine.diff_meals). É o que o app entrega, então a tela mostra item
  // a item em vez de só os totais.
  changes?: MealChanges[];
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

// Sequência de dias de uso (ver backend services/streak.py). O check-in é
// passivo: abrir a dieta do dia já conta.
export interface StreakDay {
  date: string; // ISO (YYYY-MM-DD)
  used: boolean;
}

export interface StreakStats {
  current_streak: number;
  longest_streak: number;
  used_today: boolean;
  days: StreakDay[]; // últimos 7 dias, mais antigo primeiro
}

// Noo, o chat do Nootr (ver backend routes/nootr/noo.py). É a quarta porta
// das substituições: faz o que as três funções manuais fazem, só que numa
// conversa e em várias refeições de uma vez.
export interface NooMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  changes: MealChanges[] | null;
  created_at: string;
}

export interface NooConversation {
  messages: NooMessage[];
  used: number;
  limit: number;
  remaining: number;
  plan: Plan;
}

export interface NooReply {
  reply: string;
  changes: MealChanges[];
  adjusted_meals: Meal[] | null;
  macros_after: DayMacros | null;
  targets: { calories: number; protein_g: number; carbs_g: number; fat_g: number } | null;
  remaining: number;
  limit: number;
}
