import { formatOrderLabel } from "./order-id";
import { PAYMENT_METHOD_SHORT_LABELS } from "./payment-labels";
import type { CreateOrderPayload, Order } from "./types";

function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]`])/g, "\\$1");
}

function formatItemsBlock(items: CreateOrderPayload["items"]): string {
  return items.map((item) => `${item.quantity}× ${item.name}`).join("\n");
}

function formatAddonsBlock(items: CreateOrderPayload["items"]): string | null {
  const notes = items
    .map((item) => item.addons_note?.trim())
    .filter((note): note is string => Boolean(note));

  if (notes.length === 0) return null;

  return notes
    .map((note) => {
      const [header, ...rest] = note.split("\n");
      if (rest.length === 0) return `➕ ${header}`;
      return [`➕ ${header}`, ...rest.map((line) => `   ↳ ${line}`)].join("\n");
    })
    .join("\n\n");
}

function formatMoney(cents: number): string {
  const value = cents / 100;
  return `R$${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatOrderTelegramMessage(
  order: Order,
  orderedAt: Date,
  options?: { isPatient?: boolean; pixPending?: boolean; isPaymentUpdate?: boolean }
): string {
  const items = formatItemsBlock(order.items);
  const addons = formatAddonsBlock(order.items);
  const value = formatMoney(order.total_cents);
  const method = order.payment_method ?? "pix";
  const paymentMethod = PAYMENT_METHOD_SHORT_LABELS[method] ?? method;
  const phone = order.customer_phone.replace(/\D/g, "");

  let paymentStatus =
    order.payment_status === "confirmed" ? "✅ Confirmado" : "⏳ Pendente";

  if (options?.pixPending && order.payment_status === "pending") {
    paymentStatus = "⏳ Pix Pendente";
  } else if (order.local_pay_deadline && order.payment_status === "pending") {
    if (options?.isPatient) {
      paymentStatus += " (pagamento na retirada — paciente)";
    } else {
      const deadline = new Date(order.local_pay_deadline).toLocaleString("pt-BR");
      paymentStatus += ` (pagar até ${deadline})`;
    }
  }

  const pickup = order.pickup_display ?? order.delivery_date;
  const title = options?.isPaymentUpdate
    ? "⚠️ Atualização do Pagamento"
    : "🛒 Novo pedido Nutrir";

  const lines = [
    title,
    "",
    `🆔 ${formatOrderLabel(order.id)}`,
    `👤 ${escapeMarkdown(order.customer_name.trim())}`,
    `📞 ${phone}`,
  ];

  if (options?.isPatient) {
    lines.push("🌟 Este cliente é paciente!");
  }

  lines.push("", `📦 ${escapeMarkdown(items)}`);

  if (addons) {
    lines.push("", escapeMarkdown(addons));
  }

  lines.push(
    "",
    `💳 ${escapeMarkdown(paymentMethod)} — ${paymentStatus}`,
    `💰 ${value}`
  );

  if (order.coupon_code?.trim()) {
    const couponLine = order.coupon_discount_cents
      ? `Cupom ${order.coupon_code} (−${formatMoney(order.coupon_discount_cents)})`
      : `Cupom ${order.coupon_code}`;
    lines.push(`🎟 ${escapeMarkdown(couponLine)}`);
  }

  lines.push(
    "",
    `🕐 Pedido: ${orderedAt.toLocaleString("pt-BR")}`,
    `📅 Retirada: ${escapeMarkdown(pickup)}`
  );

  if (order.user_notes?.trim()) {
    lines.push(`📝 ${escapeMarkdown(order.user_notes.trim())}`);
  }

  return lines.join("\n");
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
  if (!token || !chatId) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN ou TELEGRAM_ADMIN_CHAT_ID não configurados.");
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
    if (!res.ok) {
      console.error("[Telegram] sendMessage:", await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Telegram] sendMessage:", err);
    return false;
  }
}
