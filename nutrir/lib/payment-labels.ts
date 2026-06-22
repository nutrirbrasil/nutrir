import type { PaymentMethod } from "./types";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix online",
  card: "Cartão Online",
  local_cash: "Dinheiro no local",
  local_card: "Cartão Físico",
  local: "Pagamento no local",
};

export const PAYMENT_METHOD_SHORT_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  card: "Cartão Online",
  local_cash: "Dinheiro",
  local_card: "Cartão Físico",
  local: "No local",
};
