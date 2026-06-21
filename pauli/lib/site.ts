export const site = {
  name: "Pauli",
  fullName: "Pauli Pastorino",
  displayTitle: "Pαuli Pαstorino",
  subtitle: "Nutricionista",
  title: "Nutricionista clínica e esportiva",
  city: "Balneário Piçarras, SC",
  crn: "CRN-3 XXXXX/X",
  email: "contato@nutrirpicarras.com.br",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5547992279022",
  instagram: "@paulipastorino",
  instagramUrl: "https://www.instagram.com/paulipastorino/",
  profileImage: "/profile.jpg",
  marmitasUrl: "https://nutrirpicarras.com.br",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://pauli.nutrirpicarras.com.br",
  tagline:
    "Aprender a comer bem, sem terrorismo nutricional — com estratégia, acolhimento e resultados que cabem na sua rotina.",
  bio: [
    "Sou nutricionista em Balneário Piçarras, com atendimento presencial e online. Meu trabalho é traduzir ciência em escolhas práticas para o seu dia a dia — seja para emagrecimento, ganho de massa, saúde metabólica ou performance nos treinos.",
    "No Instagram compartilho orientações sobre alimentação consciente, montagem de pratos e hábitos sustentáveis. Acredito em planos individualizados, sem dietas restritivas impossíveis de manter.",
    "Também faço parte da equipe por trás das marmitas fit Nutrir Piçarras — refeições pensadas por nutricionistas para quem busca praticidade sem abrir mão da qualidade.",
  ],
} as const;

export function whatsappLink(message?: string): string {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${site.whatsapp}${text}`;
}
