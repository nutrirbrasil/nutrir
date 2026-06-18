import type { PaymentMethod } from "./types";

export const LOCAL_PAYMENT_HOURS = 48;

export function isOnlinePayment(method?: PaymentMethod): boolean {
  return method === "pix" || method === "card";
}

export function isLocalPayment(method?: PaymentMethod): boolean {
  return method === "local";
}

export function calcLocalPaymentDeadline(from = new Date()): string {
  return new Date(from.getTime() + LOCAL_PAYMENT_HOURS * 60 * 60 * 1000).toISOString();
}

export function getWhatsAppUrl(message?: string): string {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") ?? "";
  if (!number) return "https://wa.me/";
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${number}${text}`;
}
