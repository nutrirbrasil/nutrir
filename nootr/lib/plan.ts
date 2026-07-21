// Limites do plano Basic (Pro é ilimitado) — espelham
// backend/app/services/plan_limits.py (mantidos em sincronia à mão).
export const BASIC_DAILY_SUBSTITUTIONS = 3;
export const BASIC_MAX_RECIPES = 5;

// Recursos planejados para o plano Pro (ainda não implementados) — cada um com
// um título e uma descrição curta.
export const PRO_SOON: { title: string; description: string }[] = [
  {
    title: "Noo",
    description:
      "Seu companheiro de dieta. Faça perguntas sobre qualquer assunto de alimentação, nutrição ou sobre a plataforma.",
  },
  {
    title: "NooTravel",
    description: "Vai viajar? Adapte sua dieta por país.",
  },
];

// Preços — fonte única, usada no onboarding, /plano e /lp. Sem cobrança de
// verdade ainda: escolher um plano só grava profile.plan/billing_cycle, não
// passa por nenhum fluxo de pagamento. Basic não tem ciclo anual (ver decisão
// em lib/plan.ts NUTRITIONIST_DISCOUNT_PCT_MONTHLY — evita prender alguém no
// Basic quando poderia migrar pro Pro). Pro anual é cobrado à vista
// (PRO_ANNUAL_TOTAL); o valor "mensal" do anual é só o equivalente pra
// comparação visual com o mensal recorrente.
export const PLAN_PRICES = {
  basic: { mensal: 19.9 },
  pro: { mensal: 59.9, anual: 49.8 },
} as const;
export const PRO_ANNUAL_TOTAL = 597;

export type BillingCycle = "mensal" | "anual";

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export function formatPlanPrice(plan: "basic"): string;
export function formatPlanPrice(plan: "pro", cycle: BillingCycle): string;
export function formatPlanPrice(plan: "basic" | "pro", cycle: BillingCycle = "mensal"): string {
  const value = plan === "basic" ? PLAN_PRICES.basic.mensal : PLAN_PRICES.pro[cycle];
  return `${formatCurrency(value)}/mês`;
}

// Nota exibida junto do preço do Pro anual, explicando a cobrança à vista.
export const PRO_ANNUAL_BILLING_NOTE = `cobrado ${formatCurrency(PRO_ANNUAL_TOTAL)}/ano`;

// Lista completa de países mora em lib/countries.ts (COUNTRY_OPTIONS).

// Features de cada plano, exibidas no onboarding e em Perfil — mantidas aqui
// pra não divergirem entre as duas telas (ver rotas/limites que de fato
// restringem por plano: diets.py save_diet/import exigem "pro";
// plan_limits.py limita substituições/receitas no Basic).
export const BASIC_FEATURES = [
  "Uma dieta base para todos os dias da semana",
  `Até ${BASIC_DAILY_SUBSTITUTIONS} substituições de alimentos com IA por dia`,
  `Crie até ${BASIC_MAX_RECIPES} receitas personalizadas`,
  "Preferências alimentares individualizadas",
  "Cálculo calórico automático",
];

export const PRO_FEATURES = [
  "Tudo do Basic",
  "Até 7 dietas personalizadas",
  "Importe suas dietas: a IA lê o arquivo e monta tudo",
  "Substituições ilimitadas",
  "Receitas personalizadas ilimitadas",
];

// Bônus de destaque do plano Pro, exibidos em separado da lista de features
// no PlanCard ("Bônus: ...") — ver POST /nootr/diets/generate e
// app/nootricionista/page.tsx (desconto com a nutricionista cofundadora).
export const PRO_BONUS = [
  "Não tem dieta? Sem problema! Assine o Pro e receba um Plano Alimentar revisado por um nutricionista",
  "Descontos Exclusivos em consultas com a Nutricionista Cofundadora do Nootr",
];

// Aviso legal de responsabilidade da dieta gerada automaticamente — exibido
// só na tela de gerar dieta (components/DietBuilder.tsx), não no card do plano.
export const PRO_DIET_DISCLAIMER = "Essa é uma dieta básica e não substitui um acompanhamento nutricional individual.";

// Aviso de unicidade/qualidade exibido em destaque junto do botão de gerar
// dieta — a geração só acontece uma vez por usuário (ver
// profiles.ai_diet_generated_at / POST /nootr/diets/generate), então reforça
// revisar perfil e preferências antes de prosseguir.
export const GENERATE_DIET_WARNING =
  "Cada usuário só tem direito a uma dieta! Garanta que você preencheu seus dados e preferências alimentares corretamente antes de prosseguir. A criação da dieta é baseada 100% nas suas preferências e observações, para trazer maior aderência ao plano alimentar.";

// Passo a passo exibido na tela de gerar dieta (components/DietBuilder.tsx).
export const GENERATE_DIET_STEPS = [
  'O Nootr monta uma dieta de acordo com sua meta calórica e preferências definidas em "Perfil"',
  "Um nutricionista parceiro revisa o plano e faz as alterações necessárias antes de chegar até você.",
  "Você recebe a dieta por aqui mesmo, dentro do prazo de 24h.",
];

// Desconto no acompanhamento individualizado da nutricionista cofundadora do
// Nootr — um dos objetivos do app é gerar fluxo de pacientes pra ela, então
// todo assinante Pro tem direito a algum desconto (não só o anual); o anual
// ganha um percentual maior como incentivo extra de compromisso. Basic não
// tem desconto — mantém o Pro como diferencial. Sem integração de
// pagamento/cupom real ainda: é só um link informativo, o desconto é
// combinado diretamente com ela.
export const NUTRITIONIST_DISCOUNT_PCT_MONTHLY = 10;
export const NUTRITIONIST_DISCOUNT_PCT_ANNUAL = 20;
export const NUTRITIONIST_DISCOUNT_URL = "http://pauli.nutrirpicarras.com.br/nootr";

// Página interna que explica a parceria e direciona pro agendamento — é ela
// que aparece nos CTAs do app, nunca o link externo direto (ver
// app/nootricionista/page.tsx).
export const NOOTRICIONISTA_PATH = "/nootricionista";

// Percentual de desconto do usuário, ou null se não tiver direito (Basic).
export function nutritionistDiscountPct(profile: { plan: string; billing_cycle: string } | null | undefined): number | null {
  if (profile?.plan !== "pro") return null;
  return profile?.billing_cycle === "anual" ? NUTRITIONIST_DISCOUNT_PCT_ANNUAL : NUTRITIONIST_DISCOUNT_PCT_MONTHLY;
}
