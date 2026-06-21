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
    "Aprender a comer bem, sem terrorismo nutricional — com estratégia, acolhimento e resultados que cabem na sua rotina.",
  bio: [
    "Meu trabalho é traduzir ciência em escolhas práticas para o seu dia a dia, com foco em emagrecimento, ganho de massa, saúde da mulher, longevidade e performance nos treinos.",
    "Acredito em planos individualizados, sem dietas restritivas impossíveis de manter. Atendo com acompanhamento próximo e retornos periódicos, para que cada plano faça sentido na sua rotina real.",
  ],
} as const;

export function whatsappLink(message?: string): string {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${site.whatsapp}${text}`;
}
