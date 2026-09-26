"use client";

import { useMemo } from "react";
import {
  formatPickupDayLabel,
  getAvailableSlotsForDay,
  getNextAvailablePickupDates,
  parseISODate,
  toISODate,
  PICKUP_SLOTS,
  type PickupSelection,
  type PickupSlotId,
} from "@/lib/pickup-schedule";

interface Props {
  title?: string;
  value: PickupSelection | null;
  onChange: (value: PickupSelection | null) => void;
  now?: Date;
  /** true quando a sacola inteira está no estoque de hoje (e ainda dentro do horário) — libera "hoje" como opção normal. */
  allowToday?: boolean;
  /** Mostra um "Hoje" desabilitado (cinza) explicando que algum item da sacola não está disponível pra retirada imediata. */
  todayBlockedByStock?: boolean;
  /** Dias extras de antecedência exigidos (combos grandes = 1, ou seja 48h em vez de 24h). */
  extraDays?: number;
}

export function PickupScheduler({
  title,
  value,
  onChange,
  now = new Date(),
  allowToday = false,
  todayBlockedByStock = false,
  extraDays = 0,
}: Props) {
  const dates = useMemo(
    () => getNextAvailablePickupDates(now, 5, allowToday, extraDays),
    [now, allowToday, extraDays]
  );

  const selectedDate = value?.date ? parseISODate(value.date) : null;
  const slots = selectedDate ? getAvailableSlotsForDay(selectedDate, now, allowToday, extraDays) : [];

  function selectDate(iso: string) {
    const day = parseISODate(iso);
    const daySlots = getAvailableSlotsForDay(day, now, allowToday, extraDays);
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

  const showDisabledToday = todayBlockedByStock && !allowToday;

  if (dates.length === 0 && !showDisabledToday) {
    return (
      <p className="text-sm text-nutrir-ink/70">
        Nenhuma data disponível no momento. Tente novamente mais tarde.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {title && (
        <h3 className="font-display text-lg font-bold uppercase tracking-wide text-nutrir-ink">
          {title}
        </h3>
      )}

      <div>
        <p className="text-sm font-medium text-nutrir-ink">Selecione a data da retirada</p>

        <div className="mt-3 grid grid-cols-5 gap-2">
          {showDisabledToday && (
            <div
              className="rounded-xl border-2 border-nutrir-nude-dark/40 bg-nutrir-canvas-alt/10 px-1 py-3 text-center text-nutrir-ink/40"
              title="Um ou mais itens da sacola não estão disponíveis para retirada hoje"
            >
              <span className="block text-xl font-bold">Hoje</span>
              <span className="block text-[10px]">Indisponível</span>
            </div>
          )}
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
                    ? "border-nutrir-emerald bg-nutrir-emerald/10 text-nutrir-ink"
                    : "border-nutrir-burgundy/30 bg-nutrir-canvas text-nutrir-ink hover:border-nutrir-burgundy"
                }`}
              >
                <span className="block text-xl font-bold">{day}</span>
                <span className="block text-[10px] capitalize text-nutrir-ink/70">{weekday}</span>
              </button>
            );
          })}
        </div>
      </div>

      {value?.date && slots.length > 0 && (
        <div>
          <p className="text-sm font-medium text-nutrir-ink">
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
                      : "border-nutrir-burgundy/30 bg-nutrir-canvas hover:border-nutrir-burgundy"
                  }`}
                >
                  <span
                    className={`block text-sm font-bold ${
                      selected ? "text-nutrir-ink" : "text-nutrir-ink"
                    }`}
                  >
                    {slot.label}
                  </span>
                  <span
                    className={`mt-0.5 block text-xs ${
                      selected ? "text-nutrir-ink/80" : "text-nutrir-ink/55"
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
