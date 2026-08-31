export interface PratoDoDiaDish {
  itemId: string;
  name: string;
}

export interface PratoDoDiaDay {
  weekday: number;
  weekdayLabel: string;
  dishes: PratoDoDiaDish[];
}

export const PRATO_DO_DIA_SCHEDULE: PratoDoDiaDay[] = [
  {
    weekday: 0,
    weekdayLabel: "Domingo",
    dishes: [{ itemId: "car-batata", name: "Escondidinho de Carne" }],
  },
  {
    weekday: 1,
    weekdayLabel: "Segunda",
    dishes: [{ itemId: "frg-arroz", name: "Frango da Casa" }],
  },
  {
    weekday: 2,
    weekdayLabel: "Terça",
    dishes: [{ itemId: "car-arroz", name: "Carne da Casa" }],
  },
  {
    weekday: 3,
    weekdayLabel: "Quarta",
    dishes: [{ itemId: "car-massa", name: "Ragu à Bolonhesa" }],
  },
  {
    weekday: 4,
    weekdayLabel: "Quinta",
    dishes: [{ itemId: "frg-massa", name: "Frango ao Sugo" }],
  },
  {
    weekday: 5,
    weekdayLabel: "Sexta",
    dishes: [{ itemId: "frg-batata", name: "Escondidinho de Frango" }],
  },
  {
    weekday: 6,
    weekdayLabel: "Sábado",
    dishes: [
      { itemId: "veg-ervilha", name: "Mix de Ervilha" },
      { itemId: "veg-grao", name: "Mix de Grão de Bico" },
      { itemId: "veg-cogumelo", name: "Escondidinho de Cogu" },
    ],
  },
];

/** Dia da semana em Brasília, não no fuso do servidor — troca à meia-noite local, não em outro horário. */
function getBrazilWeekday(date: Date): number {
  const WEEKDAY_INDEX: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
  }).format(date);
  return WEEKDAY_INDEX[formatted] ?? date.getDay();
}

export function getPratoDoDia(date: Date = new Date()): PratoDoDiaDay {
  const weekday = getBrazilWeekday(date);
  return PRATO_DO_DIA_SCHEDULE.find((d) => d.weekday === weekday) ?? PRATO_DO_DIA_SCHEDULE[0];
}

/** 1ª unidade do prato do dia no pedido = 5%, 2ª = 10%, 3ª = 15%, 4ª = 20%, 5ª = 25%, 6ª em diante volta a 5%. */
export function pratoDoDiaPercentForRank(rank: number): number {
  if (rank >= 1 && rank <= 5) return rank * 5;
  return 5;
}
