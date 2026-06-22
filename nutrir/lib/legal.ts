import { NUTRIR_STORE_ADDRESS } from "./store-info";

export const LEGAL_LAST_UPDATED = "21 de junho de 2026";

export const legal = {
  brand: "Nutrir Piçarras",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://nutrirpicarras.com.br",
  address: NUTRIR_STORE_ADDRESS,
  instagram: "@nutrirpicarras",
  privacyEmail: "contatonutrirbrasil@gmail.com",
  contactWhatsApp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5547992279022",
} as const;

export function whatsappContactUrl(message?: string): string {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${legal.contactWhatsApp}${text}`;
}
