import { isValidCpf, isValidPhoneBR } from "./br-fields";
import type { DeliverySelection } from "./delivery-schedule";
import type { MixedPickupMode, PickupSelection } from "./pickup-schedule";
import type { FulfillmentType, OrderItem, PaymentMethod } from "./types";

export interface CheckoutDraft {
  items: OrderItem[];
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_cpf?: string;
  delivery_address: string;
  delivery_date: string;
  pickup_display: string;
  user_notes?: string;
  internal_notes?: string;
  mixed_mode?: MixedPickupMode | null;
  pickup_unified?: PickupSelection | null;
  pickup_combo?: PickupSelection | null;
  pickup_regular?: PickupSelection | null;
  payment_method?: PaymentMethod;
  coupon_code?: string;
  /** Resolvidos ao aplicar o cupom (estático ou de parceiro) — só pra exibir o preview de preço. */
  coupon_percent?: number;
  coupon_label?: string;
  order_id?: string;
  /** Pontos de parceiro a usar como desconto (centavos) — só pra exibição; servidor recalcula/valida. */
  points_redeemed_cents?: number;
  /** Padrão "pickup" quando ausente (rascunhos antigos). */
  fulfillment_type?: FulfillmentType;
  delivery_selection?: DeliverySelection | null;
  delivery_street?: string;
  delivery_number?: string;
  delivery_complement?: string;
  delivery_reference?: string;
  delivery_bairro_id?: string;
  /** Estimativa só pra exibição — quem calcula de verdade é o servidor. */
  delivery_fee_cents?: number;
}

export const CHECKOUT_STORAGE_KEY = "nutrir-checkout-draft";

export function loadCheckoutDraft(): CheckoutDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CheckoutDraft) : null;
  } catch {
    return null;
  }
}

export function saveCheckoutDraft(draft: CheckoutDraft): void {
  sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearCheckoutDraft(): void {
  sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
}

export function hasFiscalData(draft: CheckoutDraft): boolean {
  return isValidCpf(draft.customer_cpf ?? "") && isValidPhoneBR(draft.customer_phone ?? "");
}
