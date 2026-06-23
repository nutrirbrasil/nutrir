import { isOnlinePayment, normalizePaymentMethod } from "./payment-utils";
import type { Order, PaymentMethod } from "./types";

export function expectedInfinitePayCaptureMethod(method?: PaymentMethod): string | null {
  const normalized = normalizePaymentMethod(method);
  if (normalized === "pix") return "pix";
  if (normalized === "card") return "credit_card";
  return null;
}

export function isInfinitePayCaptureMethodValid(
  orderMethod: PaymentMethod | undefined,
  captureMethod?: string | null
): boolean {
  const expected = expectedInfinitePayCaptureMethod(orderMethod);
  if (!expected) return true;
  if (!captureMethod) return false;
  return captureMethod === expected;
}

export function isInfinitePayPaidAmountValid(
  order: Pick<Order, "total_cents" | "payment_method">,
  paidAmountCents?: number | null
): boolean {
  if (paidAmountCents == null || !Number.isFinite(paidAmountCents)) return true;
  if (!isOnlinePayment(order.payment_method)) return true;
  return paidAmountCents >= order.total_cents;
}

export function canConfirmInfinitePayPayment(
  order: Order,
  input: { capture_method?: string | null; paid_amount?: number | null }
): boolean {
  if (!isOnlinePayment(order.payment_method)) return true;
  if (!isInfinitePayCaptureMethodValid(order.payment_method, input.capture_method)) {
    return false;
  }
  return isInfinitePayPaidAmountValid(order, input.paid_amount ?? null);
}
