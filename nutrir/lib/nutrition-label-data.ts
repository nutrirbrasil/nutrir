import type { MarmitaSize } from "./menu-data";

/**
 * Dados de rotulagem (RDC 429/2020 + IN 75/2020 + Lei 10.674/2003 para
 * glúten) do RÓTULO impresso — independente da ficha técnica (banco), que
 * existe só como ferramenta de comparação em /admin/fichas-tecnicas. A lista
 * de ingredientes é digitada manualmente (receita real, com óleo/molho/
 * tempero) porque lib/label-recipes.ts só modela os macros usados no cálculo
 * de kcal — não é fonte confiável pra lista de ingredientes exigida por lei.
 */

export const MANUFACTURER = {
  name: "NUTRIR PIÇARRAS",
  cnpj: "55.465.657/0001-16",
  address: "Rua Nossa Senhora da Paz, 209 - Balneário Piçarras/SC",
};

export const STORAGE_INSTRUCTIONS = {
  refrigerated: "Manter refrigerado (0°C a 5°C). Consumir em até 3 dias após a produção.",
  frozen: "Pode ser mantido congelado (-18°C) por até 60 dias a partir da data de congelamento.",
};

export const PREPARATION_INSTRUCTIONS =
  "Se refrigerado ou descongelado: aquecer em micro-ondas em potência média por 2-3 minutos, ou até " +
  "atingir a temperatura desejada. Se congelado: aquecer direto do freezer em potência média por 4-5 " +
  "minutos, mexendo a cada minuto. Dica: descongele na geladeira por no mínimo 3 horas antes de comer.";

/** Contaminação cruzada por ambiente compartilhado — aplica a todos os rótulos. */
const CROSS_CONTACT_NOTICE =
  "Preparado em ambiente que manipula glúten e leite/derivados, pode conter traços.";

/** Lista de ingredientes em ordem decrescente de quantidade, por item e tamanho. */
export const LABEL_INGREDIENTS: Record<string, Record<MarmitaSize, string[]>> = {
  "frg-arroz": {
    P: [
      "arroz",
      "peito de frango",
      "molho de tomate",
      "brócolis",
      "cenoura",
      "cebola",
      "alho",
      "sal",
      "páprica",
      "orégano",
      "pimenta",
      "azeite",
    ],
    G: [
      "arroz",
      "peito de frango",
      "molho de tomate",
      "cenoura",
      "cebola",
      "alho",
      "sal",
      "páprica",
      "orégano",
      "pimenta",
      "azeite",
    ],
  },
  "frg-massa": {
    P: [
      "massa",
      "peito de frango",
      "molho de tomate",
      "brócolis",
      "cebola",
      "alho",
      "sal",
      "azeite",
      "páprica",
      "orégano",
      "pimenta",
    ],
    G: [
      "massa",
      "peito de frango",
      "molho de tomate",
      "cebola",
      "alho",
      "sal",
      "azeite",
      "páprica",
      "orégano",
      "pimenta",
    ],
  },
  "frg-batata": {
    P: [
      "batata",
      "peito de frango",
      "leite semidesnatado zero lactose",
      "molho de tomate",
      "queijo",
      "cebola",
      "alho",
      "sal",
      "páprica",
      "orégano",
      "pimenta",
    ],
    G: [
      "batata",
      "peito de frango",
      "leite semidesnatado zero lactose",
      "molho de tomate",
      "queijo",
      "cebola",
      "alho",
      "sal",
      "páprica",
      "orégano",
      "pimenta",
    ],
  },
  "car-arroz": {
    P: [
      "arroz",
      "patinho",
      "molho de tomate",
      "brócolis",
      "cenoura",
      "cebola",
      "alho",
      "sal",
      "páprica",
      "orégano",
      "pimenta",
      "azeite",
    ],
    G: [
      "arroz",
      "patinho",
      "molho de tomate",
      "cenoura",
      "cebola",
      "alho",
      "sal",
      "páprica",
      "orégano",
      "pimenta",
      "azeite",
    ],
  },
  "car-massa": {
    P: [
      "massa",
      "patinho",
      "molho de tomate",
      "brócolis",
      "cebola",
      "alho",
      "sal",
      "azeite",
      "páprica",
      "orégano",
      "pimenta",
    ],
    G: [
      "massa",
      "patinho",
      "molho de tomate",
      "cebola",
      "alho",
      "sal",
      "azeite",
      "páprica",
      "orégano",
      "pimenta",
    ],
  },
  "car-batata": {
    P: [
      "batata",
      "patinho",
      "leite semidesnatado zero lactose",
      "molho de tomate",
      "queijo",
      "cebola",
      "alho",
      "sal",
      "páprica",
      "orégano",
      "pimenta",
    ],
    G: [
      "batata",
      "patinho",
      "leite semidesnatado zero lactose",
      "molho de tomate",
      "queijo",
      "cebola",
      "alho",
      "sal",
      "páprica",
      "orégano",
      "pimenta",
    ],
  },
  "veg-ervilha": {
    P: ["arroz", "ervilha", "cenoura", "brócolis", "cebola", "sal", "azeite"],
    G: ["arroz", "ervilha", "cenoura", "cebola", "sal", "azeite"],
  },
  "veg-grao": {
    P: [
      "arroz",
      "grão de bico",
      "brócolis",
      "cenoura",
      "cebola",
      "sal",
      "azeite",
      "páprica",
      "orégano",
    ],
    G: [
      "arroz",
      "grão de bico",
      "cenoura",
      "cebola",
      "sal",
      "azeite",
      "páprica",
      "orégano",
    ],
  },
};

type AllergenCategory = "none" | "gluten" | "lactose";

/** Perfil de alérgenos por item: nenhum declarado, glúten (massa) ou lactose (escondidinho, pelo queijo). */
const LABEL_ALLERGEN_CATEGORY: Record<string, AllergenCategory> = {
  "frg-arroz": "none",
  "frg-massa": "gluten",
  "frg-batata": "lactose",
  "car-arroz": "none",
  "car-massa": "gluten",
  "car-batata": "lactose",
  "veg-ervilha": "none",
  "veg-grao": "none",
};

export interface LabelAllergenInfo {
  /** Linha em destaque no topo do bloco de alérgenos (ex: "CONTÉM GLÚTEN"). */
  headline: string;
  /** Linha "ALÉRGENOS: ..." completa, já com a declaração de contém (se houver) + contaminação cruzada. */
  allergensLine: string;
}

export function getLabelAllergenInfo(itemId: string): LabelAllergenInfo {
  const category = LABEL_ALLERGEN_CATEGORY[itemId] ?? "none";

  if (category === "lactose") {
    return {
      headline: "CONTÉM LACTOSE. NÃO CONTÉM GLÚTEN",
      allergensLine: `ALÉRGENOS: Contém leite e seus derivados (lactose presente no queijo). ${CROSS_CONTACT_NOTICE}`,
    };
  }

  if (category === "gluten") {
    return {
      headline: "CONTÉM GLÚTEN",
      allergensLine: `ALÉRGENOS: ${CROSS_CONTACT_NOTICE}`,
    };
  }

  return {
    headline: "NÃO CONTÉM GLÚTEN",
    allergensLine: `ALÉRGENOS: ${CROSS_CONTACT_NOTICE}`,
  };
}

export function getLabelIngredients(itemId: string, size: MarmitaSize): string[] {
  return LABEL_INGREDIENTS[itemId]?.[size] ?? [];
}

/** Junta a lista com vírgulas, exceto o último item, que entra com "e" (ex: "arroz, frango e sal"). */
export function formatIngredientList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}
