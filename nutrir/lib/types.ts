export type MenuSectionId = "frango" | "carne" | "vegetariano" | "kit" | "combo";

export interface OrderItem {
  menu_id?: string | null;
  name: string;
  quantity: number;
  /** Preço base em centavos (pix/dinheiro), sem adicionais */
  price_cents: number;
  section_id?: MenuSectionId;
  item_id?: string;
  size?: "P" | "G";
  /** Total dos adicionais em centavos (pix/dinheiro) */
  addons_cents?: number;
  /** Detalhes dos adicionais para pedido / sacola */
  addons_note?: string;
}

export type PaymentMethod = "pix" | "card" | "local_cash" | "local_card" | "local";
export type PaymentStatus = "pending" | "confirmed";

export interface CreateOrderPayload {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_cpf?: string;
  delivery_address: string;
  delivery_date: string;
  pickup_display?: string;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  user_notes?: string;
  notes?: string;
  coupon_code?: string;
  items: OrderItem[];
}

export interface Order extends CreateOrderPayload {
  id: string;
  status: string;
  payment_status: PaymentStatus;
  total_cents: number;
  coupon_discount_cents?: number;
  created_at: string;
  local_pay_deadline?: string;
  checkout_url?: string;
  infinitepay_slug?: string;
  infinitepay_transaction_nsu?: string;
  infinitepay_capture_method?: string;
}
