import { NextResponse } from "next/server";
import { getCoupon } from "@/lib/coupons";
import { findPartnerByCouponCode, findPartnerByEmail, redeemPartnerPoints, PARTNER_COUPON_PERCENT } from "@/lib/partners";
import { verifyUserEmail } from "@/lib/session-auth";
import { createInfinitePayLink, isInfinitePayConfigured } from "@/lib/infinitepay";
import { isValidPhoneBR } from "@/lib/br-fields";
import {
  composeDeliveryAddressPreview,
  getDeliveryBairroOption,
  getDeliveryFeeCents,
  isBairroDeliverable,
  MUNICIPIO_LABELS,
} from "@/lib/delivery-fees";
import { isDeliveryDateEligible } from "@/lib/delivery-schedule";
import { computeOrderPricing, getChargedItems, validateCatalogItemPrice } from "@/lib/order-pricing";
import {
  calcLocalPaymentDeadline,
  isLocalPayment,
  isOnlineCardPayment,
  isOnlinePixPayment,
  normalizePaymentMethod,
} from "@/lib/payment-utils";
import { isPixConfigured } from "@/lib/pix-brcode";
import { generateUniqueOrderId } from "@/lib/order-id";
import { saveOrder } from "@/lib/order-store";
import { findPacienteByCpf } from "@/lib/supabase-db";
import { sendOrderTelegramNotification } from "@/lib/order-telegram";
import type { CreateOrderPayload, FulfillmentType, Order } from "@/lib/types";

function validate(body: CreateOrderPayload, fulfillmentType: FulfillmentType): string | null {
  if (!body.customer_name?.trim() || body.customer_name.trim().length < 3) {
    // A InfinitePay rejeita nomes com menos de 3 caracteres no checkout de cartão
    // ("size cannot be less than 3"); exigimos o mesmo mínimo aqui pra não criar
    // um pedido que depois falha silenciosamente ao gerar o link de pagamento.
    return "Informe seu nome completo (mínimo 3 letras).";
  }
  if (!body.customer_phone?.trim() || !isValidPhoneBR(body.customer_phone)) {
    return "Informe um telefone válido com DDD.";
  }

  if (fulfillmentType === "pickup") {
    if (!body.delivery_address?.trim() || body.delivery_address.trim().length < 5) {
      return "Informe o endereço de retirada.";
    }
    if (!body.delivery_date?.trim()) {
      return "Selecione a data de retirada.";
    }
  } else {
    if (!body.delivery_street?.trim() || !body.delivery_number?.trim()) {
      return "Informe o endereço de entrega (rua e número).";
    }
    if (!body.delivery_bairro_id) {
      return "Selecione o bairro de entrega.";
    }
    if (!isBairroDeliverable(body.delivery_bairro_id)) {
      return "Não entregamos nesse bairro no momento. Escolha retirada na loja.";
    }
    if (!body.delivery_date?.trim() || !isDeliveryDateEligible(body.delivery_date)) {
      return "Selecione um domingo válido para entrega.";
    }
  }

  if (!body.items?.length) {
    return "O pedido precisa ter pelo menos um item.";
  }
  for (const item of body.items) {
    if (!item.name?.trim()) return "Item inválido no pedido.";
    if (!item.quantity || item.quantity < 1) return "Quantidade inválida no pedido.";
    if (item.price_cents < 0) return "Preço inválido no pedido.";
    const catalogError = validateCatalogItemPrice(item);
    if (catalogError) return catalogError;
  }
  return null;
}

async function notifyTelegram(order: Order): Promise<boolean> {
  const paciente = order.customer_cpf
    ? await findPacienteByCpf(order.customer_cpf)
    : null;
  return sendOrderTelegramNotification(order, { isPatient: !!paciente });
}

export async function POST(request: Request) {
  let body: CreateOrderPayload;
  try {
    body = (await request.json()) as CreateOrderPayload;
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const fulfillment_type: FulfillmentType = body.fulfillment_type === "delivery" ? "delivery" : "pickup";

  const validationError = validate(body, fulfillment_type);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const payment_method = normalizePaymentMethod(body.payment_method);

  // Cupom de parceiro (banco) tem prioridade sobre a lista fixa (lib/coupons.ts).
  let partner_id: string | undefined;
  let couponOverride: { percent: number; label?: string } | null = null;

  if (body.coupon_code?.trim()) {
    const partner = await findPartnerByCouponCode(body.coupon_code);
    if (partner) {
      partner_id = partner.id;
      couponOverride = { percent: PARTNER_COUPON_PERCENT };
    } else if (!getCoupon(body.coupon_code)) {
      return NextResponse.json({ error: "Cupom inválido." }, { status: 400 });
    }
  }

  // Resgate de pontos: só aceito com sessão verificada do próprio parceiro —
  // nunca a partir de customer_cpf/e-mail do formulário, que não são
  // vinculados à sessão logada. Sem token válido ou sem saldo, ignora
  // silenciosamente em vez de travar o checkout.
  let redeemingPartnerId: string | undefined;
  let pointsToRedeemCents = 0;

  if (body.points_redeemed_cents && body.points_redeemed_cents > 0) {
    const email = await verifyUserEmail(request);
    const redeemingPartner = email ? await findPartnerByEmail(email) : null;
    if (redeemingPartner) {
      redeemingPartnerId = redeemingPartner.id;
      pointsToRedeemCents = Math.max(
        0,
        Math.min(body.points_redeemed_cents, redeemingPartner.points_balance_cents)
      );
    }
  }

  let delivery_fee_cents = 0;
  let delivery_bairro: string | undefined;
  let delivery_municipio: string | undefined;
  let delivery_address = body.delivery_address;

  if (fulfillment_type === "delivery") {
    // Taxa e endereço sempre recalculados a partir do bairro_id — nunca aceitos literalmente do cliente.
    delivery_fee_cents = getDeliveryFeeCents(body.delivery_bairro_id!) ?? 0;
    const option = getDeliveryBairroOption(body.delivery_bairro_id!);
    delivery_bairro = option?.bairro;
    delivery_municipio = option ? MUNICIPIO_LABELS[option.municipio] : undefined;
    delivery_address = composeDeliveryAddressPreview(
      body.delivery_bairro_id!,
      body.delivery_street ?? "",
      body.delivery_number ?? "",
      body.delivery_complement,
      body.delivery_reference
    );

    if (isLocalPayment(payment_method)) {
      const paciente = body.customer_cpf ? await findPacienteByCpf(body.customer_cpf) : null;
      if (!paciente) {
        return NextResponse.json(
          {
            error:
              "Pagamento na entrega disponível apenas para pacientes. Escolha Pix ou Cartão Online.",
          },
          { status: 400 }
        );
      }
    }
  }

  const chargedItems = getChargedItems(body.items, payment_method);
  const pricing = computeOrderPricing(
    body.items,
    payment_method,
    body.coupon_code,
    delivery_fee_cents,
    couponOverride,
    pointsToRedeemCents
  );
  // computeOrderPricing pode ter reduzido o desconto de pontos se ele excedesse
  // o total do pedido — usar o valor real aplicado, não o que foi pedido.
  pointsToRedeemCents = pricing.points_discount_cents;
  const created_at = new Date().toISOString();
  const orderId = await generateUniqueOrderId();

  const order: Order = {
    ...body,
    items: chargedItems,
    id: orderId,
    status: "pending",
    payment_method,
    payment_status: "pending",
    total_cents: pricing.total_cents,
    coupon_discount_cents: pricing.coupon_discount_cents || undefined,
    partner_id,
    points_redeemed_cents: pointsToRedeemCents,
    created_at,
    fulfillment_type,
    delivery_address,
    delivery_bairro,
    delivery_municipio,
    delivery_fee_cents,
  };

  if (isLocalPayment(payment_method)) {
    order.local_pay_deadline = calcLocalPaymentDeadline(new Date(created_at));
  }

  let checkout_url: string | undefined;

  if (isOnlineCardPayment(payment_method)) {
    if (!isInfinitePayConfigured()) {
      return NextResponse.json(
        {
          error:
            "Pagamento com cartão online não configurado. Defina INFINITEPAY_HANDLE e NEXT_PUBLIC_SITE_URL.",
        },
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
    });

    if (!link) {
      return NextResponse.json(
        { error: "Não foi possível abrir o checkout InfinitePay. Tente novamente." },
        { status: 503 }
      );
    }

    order.checkout_url = link.url;
    checkout_url = link.url;
  }

  if (isOnlinePixPayment(payment_method) && !isPixConfigured()) {
    return NextResponse.json(
      { error: "Pix online não configurado. Defina PIX_KEY no servidor." },
      { status: 503 }
    );
  }

  await saveOrder(order);

  if (redeemingPartnerId && pointsToRedeemCents > 0) {
    await redeemPartnerPoints(redeemingPartnerId, order.id, pointsToRedeemCents);
  }

  const notified = isLocalPayment(payment_method) ? await notifyTelegram(order) : false;

  return NextResponse.json({
    order,
    notified,
    checkout_url,
  });
}
