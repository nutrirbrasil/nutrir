import { iconImageUrl } from "./brand-assets";

export const site = {
  name: "Pauli",
  fullName: "Pauli Pastorino",
  displayTitle: "Pαuli Pαstorino",
  subtitle: "Nutricionista",
  title: "Nutricionista clínica e esportiva",
  city: "Balneário Piçarras, SC",
  crn: "CRN 18489D",
  education: "Formada na Universidade Federal de Pelotas (UFPel) desde 2022.",
  heroTitle: "Nutrição clínica e esportiva para resultados que cabem na sua rotina.",
  heroSubtitle:
    "Estratégias individualizadas para melhorar sua saúde, potencializar sua performance e construir hábitos sustentáveis.",
  identificationBadges: [
    "Emagrecimento saudável",
    "Ganho de massa muscular",
    "Corredores e atletas amadores",
    "Saúde da mulher",
    "Reeducação alimentar",
  ],
  aboutTitle: "Quem é Pauli?",
  aboutIntro:
    "Sou a Pauli, nutricionista clínica e esportiva, e acredito que a melhor estratégia alimentar é aquela que você consegue viver. Meu trabalho é transformar a ciência da nutrição em estratégias práticas e individualizadas para melhorar sua saúde, sua performance e sua relação com a alimentação, com um cuidado especial voltado aos atletas amadores que buscam evoluir sem abrir mão da vida real.",
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
  approach: {
    intro:
      "Acredito em uma nutrição baseada em ciência, construída para a vida real e pensada para gerar resultados sustentáveis. Por isso, meu acompanhamento é baseado em cinco pilares:",
    pillars: [
      {
        icon: "🧠",
        title: "Ciência sem extremismos",
        description:
          "Condutas baseadas em evidências, sem terrorismo nutricional e sem regras impossíveis de seguir.",
      },
      {
        icon: "🍽",
        title: "Alimentação que se adapta à sua vida",
        description:
          "A melhor estratégia alimentar é aquela que você consegue manter no dia a dia, respeitando sua rotina, preferências e objetivos.",
      },
      {
        icon: "🏋️",
        title: "Saúde e performance caminhando juntas",
        description:
          "Seja para emagrecer, ganhar massa muscular ou melhorar o desempenho nos treinos e provas, a alimentação é ajustada de forma individualizada para potencializar seus resultados.",
      },
      {
        icon: "📈",
        title: "Construção de hábitos sustentáveis",
        description:
          "Mais do que entregar um plano alimentar, meu objetivo é ajudar você a desenvolver comportamentos que possam ser mantidos a longo prazo.",
      },
      {
        icon: "❤️",
        title: "Cuidado individualizado",
        description:
          "Cada pessoa tem uma história, uma rotina e necessidades diferentes. Por isso, o acompanhamento é personalizado, próximo e pensado para a sua realidade.",
      },
    ],
  },
  plansIntro:
    "Cada pessoa possui objetivos, necessidades e rotinas diferentes. Por isso, você pode escolher a modalidade de acompanhamento que melhor se encaixa no seu momento.",
  plans: [
    {
      id: "inicial",
      title: "Consulta Inicial",
      tagline: "Ideal para quem deseja conhecer meu trabalho ou precisa de orientações mais pontuais.",
      description:
        "Um atendimento individualizado para avaliar sua rotina, definir estratégias e construir um plano alimentar alinhado aos seus objetivos.",
      featured: false,
    },
    {
      id: "trimestral",
      title: "Acompanhamento Trimestral",
      tagline: "",
      description:
        "Indicado para quem busca mudanças de hábitos, melhora da composição corporal, ganho de massa muscular, emagrecimento ou evolução na performance esportiva, com acompanhamento mais próximo e ajustes ao longo do processo.",
      featured: true,
    },
    {
      id: "semestral",
      title: "Acompanhamento Semestral",
      tagline: "",
      description:
        "Perfeito para quem deseja uma transformação mais consistente e sustentável, com tempo para consolidar hábitos, acompanhar a evolução e realizar ajustes contínuos, promovendo resultados duradouros.",
      featured: false,
    },
  ],
} as const;

export function whatsappLink(message?: string): string {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${site.whatsapp}${text}`;
}
