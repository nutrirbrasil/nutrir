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
}

export const PICKUP_SLOTS: PickupSlot[] = [
  { id: "morning", label: "Manhã", range: "09:00 - 12:00", hour: 9, minute: 0 },
  { id: "afternoon", label: "Tarde", range: "14:00 - 19:30", hour: 14, minute: 0 },
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

/** Antes das 19h30 → amanhã à tarde; após 19h30 → depois de amanhã (qualquer turno). Isso garante ~24h de antecedência mínima pra qualquer pedido. */
export function getEarliestSlotStart(now: Date): Date {
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
    day.setDate(day.getDate() + 2);
    return getSlotDateTime(day, "morning");
  }

  const day = startOfDay(now);
  day.setDate(day.getDate() + 1);
  return getSlotDateTime(day, "afternoon");
}

export function isWeekday(day: Date): boolean {
  return WEEKDAYS.has(day.getDay());
}

export function isDayEligible(day: Date, now: Date): boolean {
  if (!isWeekday(day)) return false;
  if (isSameCalendarDay(day, now)) return false;
  return getAvailableSlotsForDay(day, now).length > 0;
}

export function getAvailableSlotsForDay(day: Date, now: Date): PickupSlotId[] {
  if (!isWeekday(day) || isSameCalendarDay(day, now)) {
    return [];
  }

  const minTime = getEarliestSlotStart(now).getTime();

  return PICKUP_SLOTS.filter((slot) => {
    const slotStart = getSlotDateTime(day, slot.id);
    return slotStart.getTime() >= minTime;
  }).map((s) => s.id);
}

export function getNextAvailablePickupDates(now: Date = new Date(), count = 5): Date[] {
  const results: Date[] = [];
  const cursor = startOfDay(now);

  for (let offset = 0; offset < 120 && results.length < count; offset++) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() + offset);

    if (isDayEligible(day, now)) {
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
