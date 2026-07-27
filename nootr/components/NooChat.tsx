"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { nootrApi } from "@/lib/api";
import { Icon } from "@/components/Icon";
import type { MealChanges, NooMessage, Plan } from "@/lib/types";

const SUGGESTIONS = [
  "Não comi o pão do café",
  "Vou comer pizza no jantar",
  "Estou sem frango pro almoço",
];

const CHANGE_ICONS: Record<string, { symbol: string; label: string; className: string }> = {
  increased: { symbol: "↑", label: "aumentei", className: "text-nootr-bordoSoft" },
  decreased: { symbol: "↓", label: "reduzi", className: "text-nootr-muted" },
  added: { symbol: "+", label: "adicionei", className: "text-nootr-bordoSoft" },
  removed: { symbol: "−", label: "tirei", className: "text-nootr-faint" },
};

/** O que o Noo mexeu, junto da resposta dele. */
function ChangeList({ changes }: { changes: MealChanges[] }) {
  if (changes.length === 0) return null;
  return (
    <div className="mt-2.5 space-y-2 border-t border-nootr-bordo/20 pt-2.5">
      {changes.map((meal) => (
        <div key={meal.meal}>
          <p className="text-[10px] uppercase tracking-caps text-nootr-faint">{meal.meal}</p>
          <ul className="mt-0.5 space-y-0.5">
            {meal.changes.map((c) => {
              const icon = CHANGE_ICONS[c.kind];
              return (
                <li key={`${c.kind}-${c.name}`} className="flex items-baseline gap-1.5 text-xs">
                  <span className={`${icon.className} font-semibold`} aria-label={icon.label}>
                    {icon.symbol}
                  </span>
                  <span className="text-nootr-cream">{c.name}</span>
                  <span className="ml-auto shrink-0 tabular-nums text-nootr-faint">
                    {c.from && <span className="line-through">{c.from}</span>}
                    {c.from && c.to && " → "}
                    {c.to || (c.from ? "" : null)}
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
        changes: r.changes.length ? r.changes : null, created_at: new Date().toISOString(),
      }]);
      setRemaining(r.remaining);
      // O dia mudou: quem embute o chat recarrega a dieta.
      if (r.changes.length && onApplied) onApplied();
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
              {m.changes && <ChangeList changes={m.changes} />}
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
