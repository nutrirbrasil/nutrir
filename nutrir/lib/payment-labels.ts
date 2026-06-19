import type { PaymentMethod } from "./types";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix online",
  card: "Cartão online",
  local_cash: "Dinheiro no local",
  local_card: "Cartão no local",
  local: "Pagamento no local",
};

export const PAYMENT_METHOD_SHORT_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  card: "Cartão",
  local_cash: "Dinheiro",
  local_card: "Cartão",
  local: "No local",
};
