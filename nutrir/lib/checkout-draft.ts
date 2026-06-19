import { isValidCpf, isValidPhoneBR } from "./br-fields";
import type { MixedPickupMode, PickupSelection } from "./pickup-schedule";
import type { OrderItem, PaymentMethod } from "./types";

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
  order_id?: string;
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
