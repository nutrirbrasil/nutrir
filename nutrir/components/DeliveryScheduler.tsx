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
  /** true quando a sacola inteira está no estoque de hoje (e o bairro é elegível pra entrega no mesmo dia) — libera "hoje" como opção normal. */
  allowToday?: boolean;
  /** Mostra um "Hoje" desabilitado (cinza) explicando que algum item da sacola não está disponível pra entrega imediata. */
  todayBlockedByStock?: boolean;
  /** Dias extras de antecedência exigidos (combos grandes = 1, ou seja 48h em vez de 24h). */
  extraDays?: number;
}

export function DeliveryScheduler({
  bairroId,
  value,
  onChange,
  now = new Date(),
  allowToday = false,
  todayBlockedByStock = false,
  extraDays = 0,
}: Props) {
  const option = getDeliveryBairroOption(bairroId);
  const group = option ? getDeliveryScheduleGroup(option.municipio) : null;

  const dates = useMemo(
    () => (group ? getNextAvailableDeliveryDates(group, now, 5, allowToday, extraDays) : []),
    [group, now, allowToday, extraDays]
  );

  const showDisabledToday = todayBlockedByStock && !allowToday;

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

        {dates.length === 0 && !showDisabledToday ? (
          <p className="mt-2 text-sm text-nutrir-emerald/70">
            Nenhuma data disponível no momento. Tente novamente mais tarde.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-5 gap-2">
            {showDisabledToday && (
              <div
                className="rounded-xl border-2 border-nutrir-nude-dark/40 bg-nutrir-nude-dark/10 px-1 py-3 text-center text-nutrir-emerald/40"
                title="Um ou mais itens da sacola não estão disponíveis para entrega hoje"
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
