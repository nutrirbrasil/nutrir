"use client";

import { useMemo } from "react";
import {
  formatDeliverySummary,
  getDeliveryWindow,
  getNextAvailableDeliveryDates,
  toISODate,
  type DeliverySelection,
} from "@/lib/delivery-schedule";
import { formatPickupDayLabel, parseISODate } from "@/lib/pickup-schedule";
import { getDeliveryBairroOption, getDeliveryScheduleGroup } from "@/lib/delivery-fees";

interface Props {
  bairroId: string;
  value: DeliverySelection | null;
  onChange: (value: DeliverySelection | null) => void;
  now?: Date;
}

export function DeliveryScheduler({ bairroId, value, onChange, now = new Date() }: Props) {
  const option = getDeliveryBairroOption(bairroId);
  const group = option ? getDeliveryScheduleGroup(option.municipio) : null;

  const dates = useMemo(
    () => (group ? getNextAvailableDeliveryDates(group, now, 5) : []),
    [group, now]
  );

  function selectDate(iso: string) {
    onChange({ date: iso });
  }

  if (!group) {
    return (
      <p className="text-sm text-nutrir-emerald/70">
        Escolha o bairro de entrega abaixo para ver as datas disponíveis.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-nutrir-emerald">Selecione a data da entrega</p>

        {dates.length === 0 ? (
          <p className="mt-2 text-sm text-nutrir-emerald/70">
            Nenhuma data disponível no momento. Tente novamente mais tarde.
          </p>
        ) : (
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
        )}
      </div>

      {value?.date && (
        <p className="text-sm text-nutrir-emerald/70">
          Janela de entrega:{" "}
          <strong className="text-nutrir-emerald">
            {getDeliveryWindow(group, parseISODate(value.date).getDay()).label}
          </strong>
        </p>
      )}

      {value?.date && (
        <p className="text-sm font-medium text-nutrir-emerald">
          {formatDeliverySummary(bairroId, value)}
        </p>
      )}
    </div>
  );
}
