"use client";

import { useMemo } from "react";
import {
  DELIVERY_WINDOW,
  formatDeliverySummary,
  getNextAvailableDeliveryDates,
  toISODate,
  type DeliverySelection,
} from "@/lib/delivery-schedule";
import { formatPickupDayLabel } from "@/lib/pickup-schedule";

interface Props {
  value: DeliverySelection | null;
  onChange: (value: DeliverySelection | null) => void;
  now?: Date;
}

export function DeliveryScheduler({ value, onChange, now = new Date() }: Props) {
  const dates = useMemo(() => getNextAvailableDeliveryDates(now, 3), [now]);

  function selectDate(iso: string) {
    onChange({ date: iso });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-nutrir-emerald">Selecione o domingo da entrega</p>

        <div className="mt-3 grid grid-cols-3 gap-2">
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

      <p className="text-sm text-nutrir-emerald/70">
        Janela de entrega: <strong className="text-nutrir-emerald">{DELIVERY_WINDOW.label}</strong>
      </p>

      {value?.date && (
        <p className="text-sm font-medium text-nutrir-emerald">{formatDeliverySummary(value)}</p>
      )}
    </div>
  );
}
