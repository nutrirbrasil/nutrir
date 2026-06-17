export interface MenuItem {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  price_cents: number;
  image_url: string | null;
  tags: string[];
  available_days: string[];
}

export type MenuSectionId = "frango" | "carne" | "vegetariano" | "kit" | "combo";

export interface OrderItem {
  menu_id?: string | null;
  custom_meal_id?: string | null;
  name: string;
  quantity: number;
  price_cents: number;
  section_id?: MenuSectionId;
  item_id?: string;
  size?: "P" | "G";
}

export interface CreateOrderPayload {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_address: string;
  delivery_date: string;
  notes?: string;
  items: OrderItem[];
}

export interface Order extends CreateOrderPayload {
  id: string;
  status: string;
  total_cents: number;
}
