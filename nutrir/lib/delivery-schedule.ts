import { startOfDay, toISODate, parseISODate } from "./pickup-schedule";
import {
  getDeliveryBairroOption,
  getDeliveryScheduleGroup,
  type DeliveryScheduleGroup,
} from "./delivery-fees";

/** Antecedência mínima pra qualquer entrega (marmita ou combo), igual à retirada. */
const LEAD_MS = 24 * 60 * 60 * 1000;

export interface DeliveryWindow {
  label: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

const WEEKDAY_WINDOW: DeliveryWindow = {
  label: "16h às 19h",
  startHour: 16,
  startMinute: 0,
  endHour: 19,
  endMinute: 0,
};

/** Domingo (Piçarras/Penha e Navegantes) e sábado (Barra Velha) usam a mesma janela. */
const WEEKEND_WINDOW: DeliveryWindow = {
  label: "14h30 às 19h30",
  startHour: 14,
  startMinute: 30,
  endHour: 19,
  endMinute: 30,
};

/** Dias da semana (0=domingo…6=sábado) em que cada grupo de município entrega. */
const GROUP_WEEKDAYS: Record<DeliveryScheduleGroup, Set<number>> = {
  picarrasPenha: new Set([0, 1, 2, 3, 4, 5]), // todo dia, menos sábado
  barraVelha: new Set([6]), // só sábado
  navegantes: new Set([0]), // só domingo
};

export interface DeliverySelection {
  date: string;
}

export function getDeliveryWindow(group: DeliveryScheduleGroup, weekday: number): DeliveryWindow {
  if (group === "picarrasPenha" && weekday === 0) return WEEKEND_WINDOW;
  if (group === "picarrasPenha") return WEEKDAY_WINDOW;
  return WEEKEND_WINDOW; // barraVelha (sábado) e navegantes (domingo)
}

export function isDeliveryWeekday(group: DeliveryScheduleGroup, day: Date): boolean {
  return GROUP_WEEKDAYS[group].has(day.getDay());
}

export function isDeliveryDayEligible(group: DeliveryScheduleGroup, day: Date, now: Date): boolean {
  if (!isDeliveryWeekday(group, day)) return false;
  const window = getDeliveryWindow(group, day.getDay());
  const windowStart = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    window.startHour,
    window.startMinute
  );
  return windowStart.getTime() >= now.getTime() + LEAD_MS;
}

export function getNextAvailableDeliveryDates(
  group: DeliveryScheduleGroup,
  now: Date = new Date(),
  count = 5
): Date[] {
  const results: Date[] = [];
  const cursor = startOfDay(now);

  for (let offset = 0; offset < 30 && results.length < count; offset++) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() + offset);

    if (isDeliveryDayEligible(group, day, now)) {
      results.push(day);
    }
  }

  return results;
}

/** bairroId decide o grupo (e portanto os dias/janela válidos) — sem bairro válido, nada é elegível. */
export function isDeliveryDateEligible(
  bairroId: string | undefined,
  iso: string,
  now: Date = new Date()
): boolean {
  const option = bairroId ? getDeliveryBairroOption(bairroId) : undefined;
  if (!option) return false;

  let day: Date;
  try {
    day = parseISODate(iso);
  } catch {
    return false;
  }
  if (Number.isNaN(day.getTime())) return false;

  const group = getDeliveryScheduleGroup(option.municipio);
  return isDeliveryDayEligible(group, day, now);
}

const WEEKDAYS_LONG = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export function formatDeliverySummary(bairroId: string | undefined, selection: DeliverySelection): string {
  const day = parseISODate(selection.date);
  const dateStr = day.toLocaleDateString("pt-BR");
  const option = bairroId ? getDeliveryBairroOption(bairroId) : undefined;
  const group = option ? getDeliveryScheduleGroup(option.municipio) : "picarrasPenha";
  const window = getDeliveryWindow(group, day.getDay());
  return `${WEEKDAYS_LONG[day.getDay()]} ${dateStr}, ${window.label}`;
}

export function formatDeliveryShort(selection: DeliverySelection): string {
  const day = parseISODate(selection.date);
  const dd = String(day.getDate()).padStart(2, "0");
  const mm = String(day.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm} - Entrega`;
}

export { toISODate };
