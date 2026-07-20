import { startOfDay, toISODate, parseISODate } from "./pickup-schedule";

/** Domingo=0 */
export const DELIVERY_WEEKDAY = 0;

export const DELIVERY_WINDOW = {
  label: "15h às 19h",
  startHour: 15,
  startMinute: 0,
  endHour: 19,
  endMinute: 0,
};

/** Corte: sexta-feira 23:59. Pedidos depois disso caem pro domingo seguinte. */
const CUTOFF_WEEKDAY_OFFSET_FROM_SUNDAY = 2; // sexta = domingo - 2 dias
const CUTOFF_HOUR = 23;
const CUTOFF_MINUTE = 59;

export interface DeliverySelection {
  date: string;
}

function getNextSundayFrom(day: Date): Date {
  const d = new Date(day);
  const diff = (7 - d.getDay()) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

export function getDeliveryOrderCutoff(sunday: Date): Date {
  const cutoffDay = new Date(sunday);
  cutoffDay.setDate(cutoffDay.getDate() - CUTOFF_WEEKDAY_OFFSET_FROM_SUNDAY);
  return new Date(
    cutoffDay.getFullYear(),
    cutoffDay.getMonth(),
    cutoffDay.getDate(),
    CUTOFF_HOUR,
    CUTOFF_MINUTE,
    59,
    999
  );
}

/** Domingo mais próximo elegível, respeitando o corte de sexta 23:59. */
export function getNearestEligibleSunday(now: Date): Date {
  const candidate = getNextSundayFrom(startOfDay(now));
  const cutoff = getDeliveryOrderCutoff(candidate);

  if (now.getTime() > cutoff.getTime()) {
    const next = new Date(candidate);
    next.setDate(next.getDate() + 7);
    return next;
  }

  return candidate;
}

export function getNextAvailableDeliveryDates(now: Date = new Date(), count = 3): Date[] {
  const first = getNearestEligibleSunday(now);
  const results: Date[] = [];

  for (let i = 0; i < count; i++) {
    const day = new Date(first);
    day.setDate(day.getDate() + i * 7);
    results.push(day);
  }

  return results;
}

export function isDeliveryDateEligible(iso: string, now: Date = new Date()): boolean {
  let day: Date;
  try {
    day = parseISODate(iso);
  } catch {
    return false;
  }
  if (Number.isNaN(day.getTime()) || day.getDay() !== DELIVERY_WEEKDAY) return false;

  const nearest = getNearestEligibleSunday(now);
  return day.getTime() >= nearest.getTime();
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

export function formatDeliverySummary(selection: DeliverySelection): string {
  const day = parseISODate(selection.date);
  const dateStr = day.toLocaleDateString("pt-BR");
  return `${WEEKDAYS_LONG[day.getDay()]} ${dateStr} — ${DELIVERY_WINDOW.label}`;
}

export function formatDeliveryShort(selection: DeliverySelection): string {
  const day = parseISODate(selection.date);
  const dd = String(day.getDate()).padStart(2, "0");
  const mm = String(day.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm} - Entrega`;
}

export { toISODate };
