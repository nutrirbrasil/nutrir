import type { Order, PaymentStatus } from "./types";

const orders: Order[] = [];

export function listOrders(): Order[] {
  return orders;
}

export function findOrder(id: string): Order | undefined {
  return orders.find((o) => o.id === id);
}

export function saveOrder(order: Order): void {
  orders.push(order);
}

export function updateOrderPayment(
  id: string,
  payment_status: PaymentStatus,
  extra?: Partial<Order>
): Order | undefined {
  const order = findOrder(id);
  if (!order) return undefined;
  order.payment_status = payment_status;
  if (extra) Object.assign(order, extra);
  return order;
}
