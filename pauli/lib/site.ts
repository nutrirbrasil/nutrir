export const site = {
  name: "Pauli",
  fullName: "Pauli — Nutricionista",
  title: "Nutricionista clínica e esportiva",
  city: "Balneário Piçarras, SC",
  crn: "CRN-X XXXXX/X",
  email: "contato@nutrirpicarras.com.br",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5547992279022",
  instagram: "@pauli.nutricao",
  marmitasUrl: "https://nutrirpicarras.com.br",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://pauli.nutrirpicarras.com.br",
} as const;

export function whatsappLink(message?: string): string {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${site.whatsapp}${text}`;
}
