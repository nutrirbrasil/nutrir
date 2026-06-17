/** Segunda=1, Sexta=5 */
const COMBO_WEEKDAYS = new Set([1, 5]);

const MS_HOUR = 60 * 60 * 1000;
export const LEAD_COMBO_MS = 48 * MS_HOUR;
export const LEAD_REGULAR_MS = 12 * MS_HOUR;

export type PickupRule = "combo" | "regular";
export type PickupSlotId = "morning" | "afternoon";

export interface PickupSlot {
  id: PickupSlotId;
  label: string;
  range: string;
  hour: number;
  minute: number;
}

export const PICKUP_SLOTS: PickupSlot[] = [
  { id: "morning", label: "Manhã", range: "9:00 - 11:30", hour: 9, minute: 0 },
  { id: "afternoon", label: "Tarde", range: "15:00 - 19:00", hour: 15, minute: 0 },
];

export interface PickupSelection {
  date: string;
  slot: PickupSlotId;
}

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
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

export function getLeadMs(rule: PickupRule): number {
  return rule === "combo" ? LEAD_COMBO_MS : LEAD_REGULAR_MS;
}

export function isComboWeekday(day: Date): boolean {
  return COMBO_WEEKDAYS.has(day.getDay());
}

/** Pedido no domingo não pode retirar na segunda imediatamente seguinte. */
export function isComboDayBlocked(day: Date, now: Date): boolean {
  if (now.getDay() !== 0 || day.getDay() !== 1) return false;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + 1);
  return isSameCalendarDay(day, nextMonday);
}

export function isDayEligible(rule: PickupRule, day: Date, now: Date): boolean {
  if (rule === "combo") {
    if (!isComboWeekday(day)) return false;
    if (isComboDayBlocked(day, now)) return false;
  }
  if (rule === "regular" && isSameCalendarDay(day, now)) return false;
  return getAvailableSlotsForDay(rule, day, now).length > 0;
}

export function getAvailableSlotsForDay(
  rule: PickupRule,
  day: Date,
  now: Date
): PickupSlotId[] {
  const leadMs = getLeadMs(rule);
  const minTime = now.getTime() + leadMs;

  return PICKUP_SLOTS.filter((slot) => {
    const slotStart = getSlotDateTime(day, slot.id);
    return slotStart.getTime() >= minTime;
  }).map((s) => s.id);
}

export function getNextAvailablePickupDates(
  rule: PickupRule,
  now: Date = new Date(),
  count = 5
): Date[] {
  const results: Date[] = [];
  const cursor = startOfDay(now);

  for (let offset = 0; offset < 120 && results.length < count; offset++) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() + offset);

    if (isDayEligible(rule, day, now)) {
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

export function formatMonthYear(d: Date): string {
  const month = d.toLocaleDateString("pt-BR", { month: "long" });
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} de ${d.getFullYear()}`;
}

export function formatPickupSummary(selection: PickupSelection): string {
  const day = parseISODate(selection.date);
  const slot = PICKUP_SLOTS.find((s) => s.id === selection.slot)!;
  const wd = WEEKDAYS_LONG[day.getDay()];
  const dateStr = day.toLocaleDateString("pt-BR");
  return `${wd} ${dateStr} — ${slot.label} (${slot.range})`;
}

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

export type MixedPickupMode = "together" | "separate";
