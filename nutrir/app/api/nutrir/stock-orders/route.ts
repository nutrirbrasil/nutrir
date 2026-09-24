import { NextResponse } from "next/server";
import { verifyUserEmail } from "@/lib/session-auth";
import { isValidPhoneBR } from "@/lib/br-fields";
import {
  composeDeliveryAddressPreview,
  getDeliveryBairroOption,
  getDeliveryFeeCents,
  isBairroDeliverable,
  MUNICIPIO_LABELS,
} from "@/lib/delivery-fees";
import { getStockCatalogItem, getStockCatalogSizeOption, type StockSize } from "@/lib/stock-catalog";
import { decrementStockForOrder, listStock, restockOrderItems } from "@/lib/stock-db";
import { generateUniqueOrderId } from "@/lib/order-id";
import { saveOrder } from "@/lib/order-store";
import { sendOrderTelegramNotification } from "@/lib/order-telegram";
import { createInfinitePayLink, isInfinitePayConfigured } from "@/lib/infinitepay";
import { isPixConfigured } from "@/lib/pix-brcode";
import {
  isLocalPayment,
  isOnlineCardPayment,
  isOnlinePixPayment,
  normalizePaymentMethod,
} from "@/lib/payment-utils";
import {
  brazilTodayDeadlineISO,
  brazilTodayISODate,
  isStockDeliveryEligible,
  STOCK_DELIVERY_TIME_MESSAGE,
  STOCK_ORDER_TAG,
  STOCK_PICKUP_TIME_MESSAGE,
} from "@/lib/stock-orders-shared";
import type { FulfillmentType, Order, OrderItem, PaymentMethod } from "@/lib/types";

interface StockOrderLine {
  item_id?: string;
  size?: string;
  quantity?: number;
}

interface StockOrderPayload {
  customer_name?: string;
  customer_phone?: string;
  fulfillment_type?: FulfillmentType;
  payment_method?: PaymentMethod;
  delivery_bairro_id?: string;
  delivery_street?: string;
  delivery_number?: string;
  delivery_complement?: string;
  delivery_reference?: string;
  user_notes?: string;
  items?: StockOrderLine[];
}

export async function POST(request: Request) {
  // Mesma regra do checkout normal: sem sessão válida, sem pedido — o e-mail
  // autenticado (não o campo do formulário) é quem identifica o cliente.
  const authEmail = await verifyUserEmail(request);
  if (!authEmail) {
    return NextResponse.json(
      { error: "É necessário estar logado para reservar." },
      { status: 401 }
    );
  }

  let body: StockOrderPayload;
  try {
    body = (await request.json()) as StockOrderPayload;
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  if (!body.customer_name?.trim() || body.customer_name.trim().length < 3) {
    return NextResponse.json(
      { error: "Informe seu nome completo (mínimo 3 letras)." },
      { status: 400 }
    );
  }
  if (!body.customer_phone?.trim() || !isValidPhoneBR(body.customer_phone)) {
    return NextResponse.json({ error: "Informe um telefone válido com DDD." }, { status: 400 });
  }
  if (!body.items?.length) {
    return NextResponse.json({ error: "A sacola está vazia." }, { status: 400 });
  }

  const fulfillment_type: FulfillmentType = body.fulfillment_type === "delivery" ? "delivery" : "pickup";
  const payment_method = normalizePaymentMethod(body.payment_method);

  // Entrega imediata só em Balneário Piçarras (todos os bairros) e no Centro
  // de Penha (os demais bairros de Penha e o resto do agendamento ficam de
  // fora, longe demais pra entrega imediata).
  let delivery_bairro: string | undefined;
  let delivery_municipio: string | undefined;
  // Retirada é sempre na loja — sem endereço de cliente pra compor aqui.
  let delivery_address = "Retirada na loja Nutrir Piçarras";
  let delivery_fee_cents = 0;

  if (fulfillment_type === "delivery") {
    if (!body.delivery_bairro_id || !isBairroDeliverable(body.delivery_bairro_id)) {
      return NextResponse.json({ error: "Selecione o bairro de entrega." }, { status: 400 });
    }
    const option = getDeliveryBairroOption(body.delivery_bairro_id);
    if (!option || !isStockDeliveryEligible(body.delivery_bairro_id)) {
      return NextResponse.json(
        { error: "Pronta entrega disponível apenas em Balneário Piçarras e no Centro de Penha." },
        { status: 400 }
      );
    }
    if (!body.delivery_street?.trim() || !body.delivery_number?.trim()) {
      return NextResponse.json(
        { error: "Informe o endereço de entrega (rua e número)." },
        { status: 400 }
      );
    }
    if (!isOnlinePixPayment(payment_method) && !isOnlineCardPayment(payment_method)) {
      return NextResponse.json(
        { error: "Entrega exige pagamento online (Pix ou cartão)." },
        { status: 400 }
      );
    }

    delivery_bairro = option.bairro;
    delivery_municipio = MUNICIPIO_LABELS[option.municipio];
    delivery_fee_cents = getDeliveryFeeCents(body.delivery_bairro_id) ?? 0;
    delivery_address = composeDeliveryAddressPreview(
      body.delivery_bairro_id,
      body.delivery_street,
      body.delivery_number,
      body.delivery_complement,
      body.delivery_reference
    );
  }
  // Retirada: qualquer forma de pagamento vale, incluindo dinheiro/cartão na
  // hora pra qualquer cliente (não só pacientes, diferente do checkout normal).

  // Preços sempre recalculados a partir do catálogo do servidor — o cliente só manda item_id/size/quantidade.
  const stock = await listStock();
  const orderItems: OrderItem[] = [];
  const stockLines: { itemId: string; size: StockSize; quantity: number }[] = [];

  for (const line of body.items) {
    const quantity = Math.floor(Number(line.quantity));
    if (!line.item_id || !line.size || !Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json({ error: "Item inválido na sacola." }, { status: 400 });
    }

    const catalogItem = getStockCatalogItem(line.item_id);
    const catalogOption = getStockCatalogSizeOption(line.item_id, line.size);
    if (!catalogItem || !catalogOption) {
      return NextResponse.json(
        { error: `Item indisponível pra pronta entrega: ${line.item_id}.` },
        { status: 400 }
      );
    }

    const available = stock.find((s) => s.item_id === line.item_id && s.size === line.size)?.quantity ?? 0;
    if (available < quantity) {
      return NextResponse.json(
        { error: `"${catalogItem.name}" (${line.size}) não tem mais estoque suficiente. Atualize a página.` },
        { status: 409 }
      );
    }

    orderItems.push({
      name: catalogOption.size === "UN" ? catalogItem.name : `${catalogItem.name} (${catalogOption.label})`,
      quantity,
      price_cents: catalogOption.cashCents,
      item_id: line.item_id,
      section_id: catalogItem.kind === "marmita" ? undefined : catalogItem.kind === "suco" ? "suco" : "bebida",
      size: line.size as OrderItem["size"],
    });
    stockLines.push({ itemId: line.item_id, size: line.size as StockSize, quantity });
  }

  const itemsTotalCents = orderItems.reduce((sum, item) => {
    const catalogOption = getStockCatalogSizeOption(item.item_id!, item.size!);
    const unit = isOnlineCardPayment(payment_method) ? catalogOption!.cardCents : catalogOption!.cashCents;
    return sum + unit * item.quantity;
  }, 0);
  const total_cents = itemsTotalCents + delivery_fee_cents;

  const decrement = await decrementStockForOrder(stockLines);
  if (!decrement.ok) {
    const msg = decrement.outOfStockItemId
      ? `"${decrement.outOfStockItemId}" (${decrement.outOfStockSize}) esgotou nesse instante. Atualize a página e tente de novo.`
      : "Não foi possível reservar o estoque agora.";
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  const created_at = new Date().toISOString();
  const orderId = await generateUniqueOrderId();

  const order: Order = {
    id: orderId,
    is_stock_order: true,
    customer_name: body.customer_name.trim(),
    customer_phone: body.customer_phone.trim(),
    customer_email: authEmail,
    user_notes: [STOCK_ORDER_TAG, body.user_notes?.trim()].filter(Boolean).join(" — "),
    items: orderItems,
    total_cents,
    status: "pending",
    payment_method,
    payment_status: "pending",
    created_at,
    fulfillment_type,
    delivery_date: brazilTodayISODate(),
    pickup_display: fulfillment_type === "delivery" ? STOCK_DELIVERY_TIME_MESSAGE : STOCK_PICKUP_TIME_MESSAGE,
    delivery_address,
    delivery_bairro,
    delivery_municipio,
    delivery_fee_cents,
  };

  if (isLocalPayment(payment_method)) {
    // Reserva vale só até o fim do expediente de hoje (19h30), não as 48h padrão do checkout agendado.
    order.local_pay_deadline = brazilTodayDeadlineISO(19, 30);
  }

  let checkout_url: string | undefined;

  if (isOnlineCardPayment(payment_method)) {
    if (!isInfinitePayConfigured()) {
      await restockOrderItems(stockLines);
      return NextResponse.json(
        { error: "Pagamento com cartão online não configurado." },
        { status: 503 }
      );
    }

    const link = await createInfinitePayLink({
      orderId: order.id,
      totalCents: order.total_cents,
      items: order.items,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      redirectPath: "/estoque/obrigado",
    });

    if (!link) {
      await restockOrderItems(stockLines);
      return NextResponse.json(
        { error: "Não foi possível abrir o checkout InfinitePay. Tente novamente." },
        { status: 503 }
      );
    }

    order.checkout_url = link.url;
    checkout_url = link.url;
  }

  if (isOnlinePixPayment(payment_method) && !isPixConfigured()) {
    await restockOrderItems(stockLines);
    return NextResponse.json({ error: "Pix online não configurado." }, { status: 503 });
  }

  await saveOrder(order);

  const notified = isLocalPayment(payment_method)
    ? await sendOrderTelegramNotification(order, { isPatient: false })
    : false;

  return NextResponse.json({ order, notified, checkout_url });
}
