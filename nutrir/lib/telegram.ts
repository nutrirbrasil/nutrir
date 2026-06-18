import type { CreateOrderPayload, Order, PaymentMethod } from "./types";
import { isLocalPayment } from "./payment-utils";

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix online",
  card: "Cartão online",
  local: "Pagamento no local",
};

function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]`])/g, "\\$1");
}

function formatItemsBlock(items: CreateOrderPayload["items"]): string {
  return items.map((item) => `${item.quantity} ${item.name}`).join("\n");
}

function formatMoney(cents: number): string {
  const value = cents / 100;
  return `R$${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatOrderTelegramMessage(order: Order, orderedAt: Date): string {
  const namePhone = `${order.customer_name} - ${order.customer_phone.replace(/\D/g, "")}`;
  const items = formatItemsBlock(order.items);
  const value = formatMoney(order.total_cents);
  const paymentMethod =
    PAYMENT_METHOD_LABELS[order.payment_method ?? "pix"] ?? order.payment_method ?? "Pix";

  let paymentStatus =
    order.payment_status === "confirmed" ? "Pagamento confirmado" : "Pagamento pendente";

  if (isLocalPayment(order.payment_method) && order.payment_status === "pending") {
    paymentStatus = "Aguardando pagamento no local (48h)";
  }

  const dd = String(orderedAt.getDate()).padStart(2, "0");
  const mm = String(orderedAt.getMonth() + 1).padStart(2, "0");
  const hh = String(orderedAt.getHours()).padStart(2, "0");
  const min = String(orderedAt.getMinutes()).padStart(2, "0");
  const orderDate = `${dd}/${mm} - ${hh}:${min}`;

  const pickupDisplay = order.pickup_display?.trim() || order.delivery_date;
  const notes = order.user_notes?.trim() || "Sem observações";

  const lines = [
    order.payment_status === "confirmed" ? "NOVO PEDIDO!" : "PEDIDO PENDENTE",
    `*${escapeMarkdown(namePhone)}*`,
    escapeMarkdown(items),
    `Valor: ${escapeMarkdown(value)}`,
    escapeMarkdown(paymentStatus),
    escapeMarkdown(paymentMethod),
    "",
    `Data do pedido: ${escapeMarkdown(orderDate)}`,
    `Data da retirada: ${escapeMarkdown(pickupDisplay)}`,
    "",
    escapeMarkdown(notes),
  ];

  return lines.join("\n");
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();

  if (!token || !chatId) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN ou TELEGRAM_ADMIN_CHAT_ID não configurados.");
    return false;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[Telegram] Falha ao enviar:", res.status, body);
    return false;
  }

  return true;
}
