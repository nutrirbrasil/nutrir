/** Segunda=1 … Sexta=5 — retirada de marmitas e combos, mesma regra pra todos. */
const WEEKDAYS = new Set([1, 2, 3, 4, 5]);

/** Pedidos até este horário podem retirar amanhã à tarde; depois disso, só depois de amanhã. */
const ORDER_CUTOFF_HOUR = 19;
const ORDER_CUTOFF_MINUTE = 30;

export type PickupSlotId = "morning" | "afternoon";

export interface PickupSlot {
  id: PickupSlotId;
  label: string;
  range: string;
  hour: number;
  minute: number;
  endHour: number;
  endMinute: number;
}

export const PICKUP_SLOTS: PickupSlot[] = [
  { id: "morning", label: "Manhã", range: "09:00 - 12:00", hour: 9, minute: 0, endHour: 12, endMinute: 0 },
  { id: "afternoon", label: "Tarde", range: "14:00 - 19:30", hour: 14, minute: 0, endHour: 19, endMinute: 30 },
];

export interface PickupSelection {
  date: string;
  slot: PickupSlotId;
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

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function getSlotDateTime(day: Date, slotId: PickupSlotId): Date {
  const slot = PICKUP_SLOTS.find((s) => s.id === slotId)!;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), slot.hour, slot.minute);
}

export function getSlotEndDateTime(day: Date, slotId: PickupSlotId): Date {
  const slot = PICKUP_SLOTS.find((s) => s.id === slotId)!;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), slot.endHour, slot.endMinute);
}

/**
 * Antes das 19h30 → amanhã à tarde; após 19h30 → depois de amanhã (qualquer turno). Isso garante ~24h de
 * antecedência mínima pra qualquer pedido. extraDays soma dias além desse mínimo, usado pra combos grandes
 * que exigem 48h em vez de 24h.
 */
export function getEarliestSlotStart(now: Date, extraDays = 0): Date {
  const cutoff = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    ORDER_CUTOFF_HOUR,
    ORDER_CUTOFF_MINUTE,
    0,
    0
  );

  if (now.getTime() >= cutoff.getTime()) {
    const day = startOfDay(now);
    day.setDate(day.getDate() + 2 + extraDays);
    return getSlotDateTime(day, "morning");
  }

  const day = startOfDay(now);
  day.setDate(day.getDate() + 1 + extraDays);
  return getSlotDateTime(day, "afternoon");
}

export function isWeekday(day: Date): boolean {
  return WEEKDAYS.has(day.getDay());
}

/** Pedidos pra "hoje" só valem até esse horário — depois disso, só a partir de amanhã, mesmo com estoque. */
export const TODAY_ORDER_CUTOFF_HOUR = 19;
export const TODAY_ORDER_CUTOFF_MINUTE = 0;

export function isBeforeTodayCutoff(now: Date): boolean {
  const cutoff = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    TODAY_ORDER_CUTOFF_HOUR,
    TODAY_ORDER_CUTOFF_MINUTE,
    0,
    0
  );
  return now.getTime() < cutoff.getTime();
}

export function isDayEligible(day: Date, now: Date, allowToday = false, extraDays = 0): boolean {
  if (!isWeekday(day)) return false;
  if (isSameCalendarDay(day, now) && !allowToday) return false;
  return getAvailableSlotsForDay(day, now, allowToday, extraDays).length > 0;
}

export function getAvailableSlotsForDay(
  day: Date,
  now: Date,
  allowToday = false,
  extraDays = 0
): PickupSlotId[] {
  if (!isWeekday(day)) return [];

  if (isSameCalendarDay(day, now)) {
    // Combos grandes (extraDays > 0) nunca podem sair hoje, mesmo com estoque liberado.
    if (!allowToday || extraDays > 0 || !isBeforeTodayCutoff(now)) return [];
    // Pro dia de hoje, o que importa é o período ainda não ter terminado (não ter começado é bom demais: quem
    // pede às 15h ainda pode retirar no período da tarde, que só termina às 19h30).
    return PICKUP_SLOTS.filter((slot) => getSlotEndDateTime(day, slot.id).getTime() > now.getTime()).map(
      (s) => s.id
    );
  }

  const minTime = getEarliestSlotStart(now, extraDays).getTime();

  return PICKUP_SLOTS.filter((slot) => {
    const slotStart = getSlotDateTime(day, slot.id);
    return slotStart.getTime() >= minTime;
  }).map((s) => s.id);
}

export function getNextAvailablePickupDates(
  now: Date = new Date(),
  count = 5,
  allowToday = false,
  extraDays = 0
): Date[] {
  const results: Date[] = [];
  const cursor = startOfDay(now);

  for (let offset = 0; offset < 120 && results.length < count; offset++) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() + offset);

    if (isDayEligible(day, now, allowToday, extraDays)) {
      results.push(day);
    }
  }

  return results;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatPickupDayLabel(d: Date): { day: number; weekday: string } {
  return {
    day: d.getDate(),
    weekday: WEEKDAYS_LONG[d.getDay()],
  };
}

export interface PickupDisplayLine {
  label: string;
  value: string;
}

export function formatPickupDisplayLines(display: string): PickupDisplayLine[] {
  if (!display.trim()) return [];

  return display.split(" · ").map((segment) => {
    const idx = segment.indexOf(":");
    if (idx === -1) return { label: "", value: segment.trim() };
    return {
      label: segment.slice(0, idx + 1).trim(),
      value: segment.slice(idx + 1).trim(),
    };
  });
}

export function formatPickupShort(selection: PickupSelection): string {
  const day = parseISODate(selection.date);
  const slot = PICKUP_SLOTS.find((s) => s.id === selection.slot)!;
  const dd = String(day.getDate()).padStart(2, "0");
  const mm = String(day.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm} - ${slot.label}`;
}

export function formatPickupSummary(selection: PickupSelection): string {
  const day = parseISODate(selection.date);
  const slot = PICKUP_SLOTS.find((s) => s.id === selection.slot)!;
  const wd = WEEKDAYS_LONG[day.getDay()];
  const dateStr = day.toLocaleDateString("pt-BR");
  return `${wd} ${dateStr}, ${slot.label} (${slot.range})`;
}

/** Usado só pra decidir opções de pagamento local (ver PaymentMethodStep) — não afeta mais o agendamento. */
export function analyzeCartItems(items: { section_id?: string }[]): {
  hasCombo: boolean;
  hasRegular: boolean;
  isMixed: boolean;
} {
  const hasCombo = items.some((i) => i.section_id === "kit" || i.section_id === "combo");
  const hasRegular = items.some(
    (i) => i.section_id && i.section_id !== "kit" && i.section_id !== "combo"
  );
  return { hasCombo, hasRegular, isMixed: hasCombo && hasRegular };
}
