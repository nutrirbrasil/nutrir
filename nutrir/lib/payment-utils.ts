import type { PaymentMethod } from "./types";

export const LOCAL_PAYMENT_HOURS = 48;

export function normalizePaymentMethod(method?: PaymentMethod): PaymentMethod {
  if (method === "local") return "local_cash";
  return method ?? "pix";
}

export function isOnlinePixPayment(method?: PaymentMethod): boolean {
  return normalizePaymentMethod(method) === "pix";
}

export function isOnlineCardPayment(method?: PaymentMethod): boolean {
  return normalizePaymentMethod(method) === "card";
}

export function isLocalPayment(method?: PaymentMethod): boolean {
  const m = normalizePaymentMethod(method);
  return m === "local_cash" || m === "local_card";
}

export function isCardPayment(method?: PaymentMethod): boolean {
  const m = normalizePaymentMethod(method);
  return m === "card" || m === "local_card";
}

export function isCashDiscountPayment(method?: PaymentMethod): boolean {
  const m = normalizePaymentMethod(method);
  return m === "pix" || m === "local_cash";
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
