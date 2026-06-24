import { findOrder } from "./order-store";

const MIN_ORDER_NUM = 10000;
const MAX_ORDER_NUM = 99999;
const MAX_ATTEMPTS = 25;

/** Ex.: `order-48291` → `#48291` */
export function formatOrderLabel(orderId: string): string {
  return `#${orderId.replace(/^order-/, "")}`;
}

/** Número curto de 5 dígitos, único entre pedidos existentes. */
export async function generateUniqueOrderId(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const num =
      MIN_ORDER_NUM + Math.floor(Math.random() * (MAX_ORDER_NUM - MIN_ORDER_NUM + 1));
    const id = `order-${num}`;
    if (!(await findOrder(id))) return id;
  }
  throw new Error("Não foi possível gerar número de pedido único.");
}
