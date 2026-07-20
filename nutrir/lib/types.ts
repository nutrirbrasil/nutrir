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

/** Ausente = "pickup" (compatível com pedidos antigos, que só tinham retirada). */
export type FulfillmentType = "pickup" | "delivery";

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
  fulfillment_type?: FulfillmentType;
  /** Só usados quando fulfillment_type === "delivery"; delivery_bairro_id é o id de lib/delivery-fees.ts. */
  delivery_street?: string;
  delivery_number?: string;
  delivery_complement?: string;
  delivery_reference?: string;
  delivery_bairro_id?: string;
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
  pix_telegram_notified?: boolean;
  /** Já recebeu pelo menos uma notificação no Telegram (próximas = atualização). */
  telegram_notified?: boolean;
  /** Resolvidos pelo servidor a partir de delivery_bairro_id — nunca aceitos literalmente do cliente. */
  delivery_bairro?: string;
  delivery_municipio?: string;
  delivery_fee_cents?: number;
}
