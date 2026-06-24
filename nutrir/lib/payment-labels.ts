import type { PaymentMethod } from "./types";

export const PAYMENT_METHOD_SHORT_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  card: "Cartão Online",
  local_cash: "Dinheiro",
  local_card: "Cartão Físico",
  local: "No local",
};
