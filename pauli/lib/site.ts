import { iconImageUrl } from "./brand-assets";

export const site = {
  name: "Paula",
  fullName: "Paula Pastorino",
  displayTitle: "Pαulα Pαstorino",
  subtitle: "Nutricionista",
  title: "Nutricionista clínica e esportiva",
  city: "Balneário Piçarras, SC",
  crn: "CRN 18489D",
  education: "Formada na Universidade Federal de Pelotas (UFPel) desde 2022.",
  attendance: {
    inPerson: "Balneário Piçarras e região",
    online: "Todo o Brasil",
  },
  address: {
    line: "R. Itajaí, 162 - Centro",
    cityState: "Balneário Piçarras - SC",
    zip: "88380-000",
    full: "R. Itajaí, 162 - Centro, Balneário Piçarras - SC, 88380-000",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=R.+Itaja%C3%AD,+162+-+Centro,+Balne%C3%A1rio+Pi%C3%A7arras+-+SC,+88380-000",
  },
  email: "paulipastorino@hotmail.com",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5547992279022",
  instagram: "@paulipastorino",
  instagramUrl: "https://www.instagram.com/paulipastorino/",
  tiktok: "@pauliipastorino",
  tiktokUrl: "https://www.tiktok.com/@pauliipastorino",
  iconImage: iconImageUrl(),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://pauli.nutrirpicarras.com.br",
  tagline:
    "Aprender a comer bem, sem terrorismo nutricional, com estratégia, acolhimento e resultados que cabem na sua rotina.",
  bio: [
    "Meu trabalho é traduzir ciência em escolhas práticas para o seu dia a dia, com foco em emagrecimento, ganho de massa, saúde da mulher, longevidade e performance nos treinos.",
    "Na nutrição esportiva, me identifico especialmente com atletas amadores — corredores, jogadores, ciclistas — que conciliam treino, trabalho e vida real e precisam de estratégia alimentar sem complicação.",
    "Acredito em planos individualizados, sem dietas restritivas impossíveis de manter. Atendo com acompanhamento próximo e retornos periódicos, para que cada plano faça sentido na sua rotina.",
  ],
  approach: {
    intro:
      "Cada pessoa chega com uma história, uma rotina e um objetivo diferente. Por isso, não trabalho com receitas prontas: construo estratégia alimentar com você, de forma clara e possível de seguir.",
    pillars: [
      {
        title: "Plano individualizado",
        description:
          "Avaliação completa e estratégia alinhada aos seus objetivos, preferências, treinos e momento de vida — nada de copiar cardápio de outra pessoa.",
      },
      {
        title: "Ciência com leveza",
        description:
          "Decisões baseadas em evidência, explicadas de um jeito simples. Sem terrorismo nutricional e sem proibições desnecessárias.",
      },
      {
        title: "Estratégia na rotina real",
        description:
          "O plano precisa caber no seu dia a dia — trabalho, treinos, viagens e imprevistos inclusos. Constância vale mais que perfeição.",
      },
      {
        title: "Acompanhamento de verdade",
        description:
          "Retornos para ajustar o que for preciso, ouvir suas dúvidas e acompanhar sua evolução com proximidade e acolhimento.",
      },
    ],
  },
  plans: [
    {
      id: "inicial",
      title: "Consulta Inicial",
      tagline:
        "Para conhecer meu trabalho ou resolver uma demanda pontual — sem compromisso com acompanhamento contínuo.",
      description:
        "Indicada se você ainda não me conhece e quer entender como trabalho antes de um plano trimestral ou semestral. Também serve para quem precisa de orientação mais pontual: avaliação, direcionamento e plano alimentar, sem acompanhamento próximo entre as consultas.",
      featured: true,
    },
    {
      id: "trimestral",
      title: "Acompanhamento Trimestral",
      tagline: "3 meses de evolução com retornos e ajustes no plano.",
      description:
        "Para quem quer acompanhamento mais próximo: consultas de retorno ao longo do trimestre, monitoramento da evolução e ajustes conforme treinos, rotina e resultados.",
      featured: false,
    },
    {
      id: "semestral",
      title: "Acompanhamento Semestral",
      tagline: "6 meses para consolidar hábitos e aprofundar resultados.",
      description:
        "Indicado para quem busca constância e mudança de hábitos com suporte contínuo — com retornos periódicos e acompanhamento da evolução ao longo do semestre.",
      featured: false,
    },
  ],
} as const;

export function whatsappLink(message?: string): string {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${site.whatsapp}${text}`;
}
