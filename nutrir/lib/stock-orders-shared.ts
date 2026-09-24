import { getDeliveryBairroOption } from "./delivery-fees";

/** Textos e horários fixos da sacola de pronta entrega (/estoque), usados tanto no servidor (ao criar o pedido) quanto na UI. */

/** Bairros elegíveis pra entrega de pronta entrega: todo Balneário Piçarras, mas só o Centro de Penha (os demais bairros de Penha ficam longe demais pra entrega imediata). */
export function isStockDeliveryEligible(bairroId: string): boolean {
  const option = getDeliveryBairroOption(bairroId);
  if (!option || !option.available) return false;
  if (option.municipio === "balnearioPicarras") return true;
  if (option.municipio === "penha") return option.bairro === "Centro";
  return false;
}

export const STOCK_DELIVERY_TIME_MESSAGE = "Entrega pronta entrega, tempo aproximado de 45 a 60 minutos";
export const STOCK_PICKUP_TIME_MESSAGE = "Retirada pronta entrega, produto fica reservado até o final do expediente (19:30)";
export const STOCK_ORDER_TAG = "🚀 Pedido de pronta entrega (via /estoque)";

/** Data de hoje (AAAA-MM-DD) no fuso de Brasília, não no fuso do servidor. */
export function brazilTodayISODate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/** Instante (ISO, UTC) de hoje às `hour:minute` em Brasília (UTC-3 o ano todo, sem horário de verão desde 2019). */
export function brazilTodayDeadlineISO(hour: number, minute: number): string {
  const [y, m, d] = brazilTodayISODate().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour + 3, minute, 0)).toISOString();
}
