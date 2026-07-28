"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { nootrApi } from "@/lib/api";
import { Icon } from "@/components/Icon";
import type { NooDayView, NooMessage, Plan } from "@/lib/types";

const SUGGESTIONS = [
  "Não comi o pão do café",
  "Vou comer pizza no jantar",
  "Estou sem frango pro almoço",
];

// Verde = ganhou (mais quantidade ou alimento novo). Vermelho = perdeu
// (menos quantidade ou alimento retirado). Nome colorido quando o alimento
// entrou/saiu; só a seta colorida quando foi a quantidade que mudou.
const FOOD_STYLE: Record<string, { arrow: string; name: string; label: string }> = {
  added: { arrow: "+", name: "text-emerald-400", label: "adicionado" },
  removed: { arrow: "−", name: "text-red-400", label: "removido" },
  increased: { arrow: "↑", name: "", label: "aumentou" },
  decreased: { arrow: "↓", name: "", label: "diminuiu" },
};
const ARROW_COLOR: Record<string, string> = {
  added: "text-emerald-400",
  increased: "text-emerald-400",
  removed: "text-red-400",
  decreased: "text-red-400",
};

/** "512 kcal · P 30g · C 60g · G 12g" */
function macroLine(t: { calories: number; protein_g: number; carbs_g: number; fat_g: number }) {
  return `${Math.round(t.calories)} kcal · P ${Math.round(t.protein_g)}g · C ${Math.round(t.carbs_g)}g · G ${Math.round(t.fat_g)}g`;
}

/**
 * Guarda contra formato antigo/inesperado em `changes` (ex: mensagens
 * salvas antes da reescrita pra `build_day_view`), pra não quebrar a tela
 * inteira ao carregar uma conversa com histórico.
 */
function isDayView(value: unknown): value is NooDayView {
  const v = value as NooDayView | null | undefined;
  return !!v && Array.isArray(v.meals) && !!v.macros_before && !!v.macros_after;
}

/**
 * O dia inteiro depois do ajuste: todas as refeições, todos os alimentos, com
 * o que mudou destacado por cor. Mostra os totais antes → depois do dia e de
 * cada refeição, que é como a pessoa confere se as metas continuam batendo.
 */
function DayView({ day }: { day: NooDayView }) {
  const deltaKcal = day.macros_after.calories - day.macros_before.calories;

  return (
    <div className="mt-3 space-y-3 border-t border-nootr-bordo/20 pt-3">
      {/* Totais do dia */}
      <div className="rounded-lg border border-nootr-line bg-nootr-card/70 px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-caps text-nootr-faint">Dia</p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="tabular-nums text-nootr-muted">{Math.round(day.macros_before.calories)}</span>
          <span className="text-nootr-faint">→</span>
          <span className="font-semibold tabular-nums text-nootr-cream">
            {Math.round(day.macros_after.calories)} kcal
          </span>
          {Math.abs(deltaKcal) >= 1 && (
            <span className={`text-xs tabular-nums ${deltaKcal > 0 ? "text-emerald-400" : "text-red-400"}`}>
              ({deltaKcal > 0 ? "+" : ""}{Math.round(deltaKcal)})
            </span>
          )}
        </p>
        <p className="mt-1 text-xs tabular-nums text-nootr-muted">
          P {Math.round(day.macros_after.protein_g)}g · C {Math.round(day.macros_after.carbs_g)}g
          {" · "}G {Math.round(day.macros_after.fat_g)}g
        </p>
      </div>

      {/* Refeições */}
      {day.meals.map((meal) => (
        <div key={meal.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <p className="text-[10px] uppercase tracking-caps text-nootr-faint">
              {meal.name}
              {meal.time && <span className="ml-1.5 normal-case tracking-normal">{meal.time}</span>}
            </p>
            <p className="text-[10px] tabular-nums text-nootr-faint">
              {Math.round(meal.before.calories) !== Math.round(meal.after.calories) && (
                <>
                  <span>{Math.round(meal.before.calories)}</span>
                  <span className="mx-1">→</span>
                </>
              )}
              {macroLine(meal.after)}
            </p>
          </div>
          <ul className="mt-1 space-y-0.5">
            {meal.foods.map((food) => {
              const style = food.kind ? FOOD_STYLE[food.kind] : null;
              return (
                <li key={`${food.name}-${food.kind ?? ""}`} className="flex items-baseline gap-1.5 text-xs">
                  <span
                    className={`w-3 shrink-0 text-center font-semibold ${food.kind ? ARROW_COLOR[food.kind] : "text-transparent"}`}
                    aria-label={style?.label}
                  >
                    {style?.arrow ?? "·"}
                  </span>
                  <span className={style?.name || "text-nootr-cream"}>{food.name}</span>
                  <span className="ml-auto shrink-0 tabular-nums text-nootr-faint">
                    {food.previous_quantity && (
                      <>
                        <span>{food.previous_quantity}</span>
                        <span className="mx-1">→</span>
                      </>
                    )}
                    {food.quantity}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * Noo, a IA do Nootr: a quarta porta das substituições.
 *
 * As três funções manuais continuam sendo o caminho de precisão; aqui a
 * pessoa conta em uma frase o que mudou (em quantas refeições quiser) e o Noo
 * aplica tudo junto, explicando o que fez. Cada mensagem é uma chamada de IA,
 * por isso o limite diário por plano (ver plan_limits.NOO_DAILY_MESSAGES).
 */
export function NooChat({ token, onApplied }: { token: string; onApplied?: () => void }) {
  const [messages, setMessages] = useState<NooMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState(0);
  const [limit, setLimit] = useState(0);
  const [plan, setPlan] = useState<Plan>("basic");
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    nootrApi.noo
      .getConversation(token)
      .then((c) => {
        if (!active) return;
        setMessages(c.messages);
        setRemaining(c.remaining);
        setLimit(c.limit);
        setPlan(c.plan);
      })
      .catch(() => active && setError("Não consegui abrir a conversa com o Noo."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed || sending || remaining <= 0) return;
    setError("");
    setSending(true);
    setText("");
    // Otimista: a mensagem da pessoa aparece na hora, a resposta vem depois.
    const optimistic: NooMessage = {
      id: `local-${Date.now()}`, role: "user", text: trimmed, changes: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const r = await nootrApi.noo.send(token, trimmed);
      setMessages((prev) => [...prev, {
        id: `local-${Date.now()}-a`, role: "assistant", text: r.reply,
        changes: r.day, created_at: new Date().toISOString(),
      }]);
      setRemaining(r.remaining);
      // O dia mudou: quem embute o chat recarrega a dieta.
      if (r.day && onApplied) onApplied();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setText(trimmed);
      setError(err instanceof Error ? err.message : "Não consegui falar com o Noo agora.");
    } finally {
      setSending(false);
    }
  }

  const isEmpty = messages.length === 0;
  const outOfMessages = remaining <= 0 && !loading;

  return (
    <div className="card flex h-[min(70vh,640px)] flex-col p-0">
      <header className="flex items-center gap-3 border-b border-nootr-line px-5 py-3.5">
        <span className="icon-badge h-9 w-9">
          <Icon name="sparkle" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-nootr-cream">
            Noo
            {plan === "pro" && (
              <span className="ml-2 rounded-full border border-nootr-bordo/40 px-1.5 py-px text-[9px] font-bold uppercase tracking-caps text-nootr-bordoSoft">
                Pro
              </span>
            )}
          </p>
          <p className="text-xs text-nootr-faint">Conte o que mudou, eu ajusto o resto do dia.</p>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-nootr-faint" title="Mensagens restantes hoje">
          {loading ? "…" : `${remaining}/${limit}`}
        </span>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {loading && <div className="h-16 animate-pulse rounded-lg bg-nootr-line/40" />}

        {!loading && isEmpty && (
          <div className="py-6 text-center">
            <p className="font-display text-xl text-nootr-cream">Oi, eu sou o Noo.</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-nootr-muted">
              Comeu algo fora do plano? Vai comer? Está sem um ingrediente? Me conta numa frase, do
              seu jeito, e eu reajusto o resto do dia pra suas metas continuarem batendo.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="chip" disabled={outOfMessages}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-nootr-bordo/90 px-3.5 py-2 text-sm text-nootr-cream">
                {m.text}
              </p>
            </div>
          ) : (
            <div key={m.id} className="max-w-[92%] rounded-2xl rounded-bl-sm border border-nootr-line bg-nootr-black px-3.5 py-2.5">
              <p className="text-sm leading-relaxed text-nootr-cream">{m.text}</p>
              {isDayView(m.changes) && <DayView day={m.changes} />}
            </div>
          )
        )}

        {sending && (
          <div className="flex items-center gap-1.5 px-1 text-nootr-faint" aria-label="Noo está pensando">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <footer className="border-t border-nootr-line px-5 py-3.5">
        {error && <p className="mb-2 text-xs text-nootr-bordoSoft">{error}</p>}

        {outOfMessages ? (
          <div className="rounded-lg border border-nootr-bordo/30 bg-nootr-wine/25 px-3.5 py-3 text-center">
            <p className="text-sm text-nootr-cream">
              {plan === "pro"
                ? "Você usou suas mensagens de hoje. O limite renova amanhã."
                : "Você usou suas 3 mensagens de hoje."}
            </p>
            {plan !== "pro" && (
              <p className="mt-1 text-xs text-nootr-muted">
                No Pro são 25 por dia, com um modelo de IA mais avançado.{" "}
                <Link href="/plano" className="text-nootr-bordoSoft underline-offset-4 hover:underline">
                  Conhecer o Pro
                </Link>
              </p>
            )}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
            className="flex items-end gap-2"
          >
            <textarea
              className="input-field max-h-32 min-h-[42px] resize-none py-2.5"
              rows={1}
              value={text}
              disabled={sending}
              placeholder="Ex: não comi o pão e vou comer pizza no jantar"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                // Enter envia, Shift+Enter quebra linha (padrão de chat).
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(text);
                }
              }}
            />
            <button type="submit" disabled={sending || !text.trim()} className="btn-primary shrink-0 px-4 py-2.5">
              {sending ? "…" : "Enviar"}
            </button>
          </form>
        )}

        {plan !== "pro" && !outOfMessages && (
          <p className="mt-2 text-center text-[11px] text-nootr-faint">
            O Noo do Pro tem 25 mensagens por dia e um modelo de IA mais avançado.{" "}
            <Link href="/plano" className="underline-offset-4 hover:text-nootr-bordoSoft hover:underline">
              Saiba mais
            </Link>
          </p>
        )}
      </footer>
    </div>
  );
}
