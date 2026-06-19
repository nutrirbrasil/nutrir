export type MenuSectionId = "frango" | "carne" | "vegetariano" | "kit" | "combo";

export interface OrderItem {
  menu_id?: string | null;
  name: string;
  quantity: number;
  price_cents: number;
  section_id?: MenuSectionId;
  item_id?: string;
  size?: "P" | "G";
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
  items: OrderItem[];
}

export interface Order extends CreateOrderPayload {
  id: string;
  status: string;
  payment_status: PaymentStatus;
  total_cents: number;
  created_at: string;
  local_pay_deadline?: string;
  checkout_url?: string;
  infinitepay_slug?: string;
  infinitepay_transaction_nsu?: string;
  infinitepay_capture_method?: string;
}
