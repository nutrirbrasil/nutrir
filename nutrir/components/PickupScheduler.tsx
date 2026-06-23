"use client";

import { useMemo } from "react";
import {
  formatPickupDayLabel,
  getAvailableSlotsForDay,
  getNextAvailablePickupDates,
  parseISODate,
  toISODate,
  PICKUP_SLOTS,
  type PickupRule,
  type PickupSelection,
  type PickupSlotId,
} from "@/lib/pickup-schedule";

interface Props {
  rule: PickupRule;
  title?: string;
  value: PickupSelection | null;
  onChange: (value: PickupSelection | null) => void;
  now?: Date;
}

export function PickupScheduler({ rule, title, value, onChange, now = new Date() }: Props) {
  const dates = useMemo(() => getNextAvailablePickupDates(rule, now, 5), [rule, now]);

  const selectedDate = value?.date ? parseISODate(value.date) : null;
  const slots = selectedDate ? getAvailableSlotsForDay(rule, selectedDate, now) : [];

  function selectDate(iso: string) {
    const day = parseISODate(iso);
    const daySlots = getAvailableSlotsForDay(rule, day, now);
    onChange({
      date: iso,
      slot: value?.date === iso && value.slot && daySlots.includes(value.slot)
        ? value.slot
        : daySlots[0] ?? "morning",
    });
  }

  function selectSlot(slot: PickupSlotId) {
    if (!value?.date) return;
    onChange({ date: value.date, slot });
  }

  if (dates.length === 0) {
    return (
      <p className="text-sm text-nutrir-emerald/70">
        Nenhuma data disponível no momento. Tente novamente mais tarde.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {title && (
        <h3 className="font-display text-lg font-bold uppercase tracking-wide text-nutrir-emerald">
          {title}
        </h3>
      )}

      <div>
        <p className="text-sm font-medium text-nutrir-emerald">Selecione a data da retirada</p>

        <div className="mt-3 grid grid-cols-5 gap-2">
          {dates.map((d) => {
            const iso = toISODate(d);
            const { day, weekday } = formatPickupDayLabel(d);
            const selected = value?.date === iso;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => selectDate(iso)}
                className={`rounded-xl border-2 px-1 py-3 text-center transition ${
                  selected
                    ? "border-nutrir-emerald bg-nutrir-emerald/10 text-nutrir-emerald"
                    : "border-nutrir-burgundy/30 bg-nutrir-nude text-nutrir-emerald hover:border-nutrir-burgundy"
                }`}
              >
                <span className="block text-xl font-bold">{day}</span>
                <span className="block text-[10px] capitalize text-nutrir-emerald/70">{weekday}</span>
              </button>
            );
          })}
        </div>
      </div>

      {value?.date && slots.length > 0 && (
        <div>
          <p className="text-sm font-medium text-nutrir-emerald">
            Selecione o período que deseja retirar
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {PICKUP_SLOTS.filter((s) => slots.includes(s.id)).map((slot) => {
              const selected = value.slot === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => selectSlot(slot.id)}
                  className={`rounded-xl border-2 px-2 py-2.5 text-left transition sm:px-3 sm:py-3 ${
                    selected
                      ? "border-nutrir-emerald bg-nutrir-emerald/10"
                      : "border-nutrir-burgundy/30 bg-nutrir-nude hover:border-nutrir-burgundy"
                  }`}
                >
                  <span
                    className={`block text-sm font-bold ${
                      selected ? "text-nutrir-emerald" : "text-nutrir-emerald-dark"
                    }`}
                  >
                    {slot.label}
                  </span>
                  <span
                    className={`mt-0.5 block text-xs ${
                      selected ? "text-nutrir-emerald/80" : "text-nutrir-emerald/55"
                    }`}
                  >
                    {slot.range}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
