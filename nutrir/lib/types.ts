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

/** Acompanhamento manual do pedido, editável só pelo admin (ver app/admin/pedidos). Nunca retrocede. */
export type OrderStatus = "pending" | "paid" | "delivered";

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
  /** Pontos de parceiro a usar como desconto (centavos). Só aceito se o pedido vier com sessão de parceiro válida. */
  points_redeemed_cents?: number;
}

/** Máximo de endereços salvos por cliente. Compartilhado entre client e server, por isso vive aqui (não em lib/customer-addresses.ts, que importa o service role). */
export const MAX_SAVED_ADDRESSES = 3;

/** Endereço de entrega salvo no perfil do cliente (até MAX_SAVED_ADDRESSES por cliente, ver lib/customer-addresses.ts). */
export interface CustomerAddress {
  id: string;
  customer_id: string;
  label: string;
  municipio: string;
  bairro_id: string;
  street: string;
  number: string;
  complement: string | null;
  reference: string | null;
  is_default: boolean;
  created_at: string;
}

export interface CustomerAddressInput {
  label: string;
  municipio: string;
  bairro_id: string;
  street: string;
  number: string;
  complement?: string;
  reference?: string;
  set_default?: boolean;
}

export interface Order extends CreateOrderPayload {
  id: string;
  status: OrderStatus;
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
  /** Preenchido pelo servidor quando coupon_code pertence a um parceiro. */
  partner_id?: string;
}
