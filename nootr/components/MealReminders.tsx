"use client";

import { useEffect, useRef, useState } from "react";
import { nootrApi } from "@/lib/api";

/**
 * Lembrete na hora da refeição, usando os horários que a pessoa cadastrou no
 * onboarding (`preferences.meal_times`).
 *
 * ESCOPO ATUAL: notificação local, disparada pelo próprio app enquanto ele
 * está aberto (nem que seja numa aba de fundo). Isso já cobre o caso comum de
 * quem deixa o Nootr aberto no celular ou no navegador durante o dia, e não
 * exige nenhuma infraestrutura nova.
 *
 * O que falta pra notificar com o app FECHADO: service worker + Web Push
 * (chaves VAPID) + um agendador no servidor disparando por usuário. A parte de
 * dados (horários, permissão e o liga/desliga em `preferences.meal_reminders`)
 * já está pronta pra isso, é só trocar quem dispara.
 */

/** "HH:MM" -> minutos desde a meia-noite, ou null se o formato não bate. */
function toMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

const CHECK_INTERVAL_MS = 60_000;

export function MealReminders({ token }: { token: string }) {
  const [times, setTimes] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(false);
  // Horários já notificados hoje, pra não repetir a cada tique do intervalo.
  const firedRef = useRef<Set<string>>(new Set());
  const dayRef = useRef<string>("");

  useEffect(() => {
    nootrApi
      .getPreferences(token)
      .then((p) => {
        setEnabled(Boolean(p.meal_reminders));
        setTimes(p.meal_times ?? []);
      })
      // Lembrete é acessório: se as preferências não carregarem, o app inteiro
      // continua funcionando sem ele.
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!enabled || times.length === 0) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    function check() {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      // Vira o dia: limpa o que já foi notificado pra recomeçar amanhã.
      if (dayRef.current !== today) {
        dayRef.current = today;
        firedRef.current = new Set();
      }
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      for (const time of times) {
        const target = toMinutes(time);
        if (target === null || firedRef.current.has(time)) continue;
        // Janela de 2 minutos: o intervalo roda a cada minuto, e a aba pode
        // ficar suspensa um pouco. Passou muito da hora, não avisa mais (não
        // adianta lembrar do café da manhã às 15h).
        if (nowMinutes >= target && nowMinutes <= target + 2) {
          firedRef.current.add(time);
          new Notification("Hora da refeição", {
            body: "Comeu conforme o plano? Se saiu do combinado, o Nootr ajusta o resto do dia.",
            tag: `nootr-meal-${time}`,
          });
        }
      }
    }

    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled, times]);

  return null;
}

/**
 * Liga/desliga dos lembretes, no Perfil. Pede a permissão do navegador na
 * hora em que a pessoa ativa (nunca antes: pedir permissão sem contexto é o
 * jeito mais rápido de ser bloqueado pra sempre).
 */
export function MealRemindersToggle({
  token,
  enabled,
  times,
  onChange,
}: {
  token: string;
  enabled: boolean;
  times: string[];
  onChange: (enabled: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const supported = typeof window !== "undefined" && "Notification" in window;

  async function toggle() {
    setNote("");
    if (enabled) {
      setBusy(true);
      try {
        await nootrApi.updatePreferences(token, { meal_reminders: false });
        onChange(false);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!supported) {
      setNote("Seu navegador não suporta notificações.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setNote("Permissão negada. Libere as notificações do site nas configurações do navegador.");
      return;
    }
    setBusy(true);
    try {
      await nootrApi.updatePreferences(token, { meal_reminders: true });
      onChange(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-nootr-cream">Lembretes de refeição</p>
          <p className="mt-0.5 text-xs text-nootr-muted">
            {times.length > 0
              ? `Um aviso nos seus horários (${times.join(", ")}) pra registrar o que comeu.`
              : "Cadastre os horários das suas refeições no Perfil pra ativar os lembretes."}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={busy || times.length === 0}
          className={`chip shrink-0 ${enabled ? "chip-active" : ""} disabled:opacity-40`}
          aria-pressed={enabled}
        >
          {busy ? "…" : enabled ? "Ativado" : "Ativar"}
        </button>
      </div>
      {note && <p className="mt-2 text-xs text-nootr-bordoSoft">{note}</p>}
      {enabled && (
        <p className="mt-2 text-xs text-nootr-faint">
          Por enquanto o aviso chega com o Nootr aberto (mesmo em outra aba).
        </p>
      )}
    </div>
  );
}
