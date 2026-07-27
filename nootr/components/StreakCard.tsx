"use client";

import { useEffect, useState } from "react";
import { nootrApi } from "@/lib/api";
import type { StreakStats } from "@/lib/types";

const WEEKDAY_INITIALS = ["D", "S", "T", "Q", "Q", "S", "S"];

/**
 * Sequência de dias de uso, em faixa de 7 dias.
 *
 * O check-in é passivo: abrir a dieta do dia já conta (ver
 * services/streak.py), então isso é reconhecimento e não mais uma tarefa
 * pendente. Por isso o dia de hoje ainda não usado aparece como "aberto"
 * (anel pontilhado), nunca como falha.
 */
export function StreakCard({ token }: { token: string }) {
  const [stats, setStats] = useState<StreakStats | null>(null);

  useEffect(() => {
    let active = true;
    // Indicador secundário: se falhar, some da tela em vez de virar erro.
    nootrApi.getStreak(token).then((s) => active && setStats(s)).catch(() => {});
    return () => {
      active = false;
    };
  }, [token]);

  if (!stats) return null;

  const { current_streak: current, longest_streak: longest, days, used_today: usedToday } = stats;
  const isRecord = current > 0 && current === longest;

  return (
    <section className="card">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps mb-0">Sequência</p>
          <p className="mt-1 font-display text-4xl leading-none text-nootr-cream">
            {current}
            <span className="ml-1.5 text-base text-nootr-muted">
              {current === 1 ? "dia" : "dias"}
            </span>
          </p>
          <p className="mt-1.5 text-xs text-nootr-faint">
            {current === 0
              ? "Abra sua dieta hoje pra começar."
              : isRecord
              ? "Seu melhor momento até agora."
              : `Seu recorde é de ${longest} dias.`}
          </p>
        </div>

        <div className="flex gap-1.5">
          {days.map((d) => {
            const dayDate = new Date(`${d.date}T12:00:00`);
            const isToday = d.date === days[days.length - 1].date;
            return (
              <div key={d.date} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-caps text-nootr-faint">
                  {WEEKDAY_INITIALS[dayDate.getDay()]}
                </span>
                <span
                  title={dayDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  className={
                    d.used
                      ? "flex h-8 w-8 items-center justify-center rounded-full border border-nootr-bordo bg-nootr-bordo/90 text-nootr-cream"
                      : isToday
                      ? "flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-nootr-bordo/50 text-nootr-faint"
                      : "flex h-8 w-8 items-center justify-center rounded-full border border-nootr-line text-nootr-faint"
                  }
                >
                  {d.used ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <span className="text-[11px] tabular-nums">{dayDate.getDate()}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {!usedToday && current > 0 && (
        <p className="mt-4 border-t border-nootr-line pt-3 text-xs text-nootr-muted">
          Você ainda não abriu a dieta hoje, sua sequência continua valendo.
        </p>
      )}
    </section>
  );
}
