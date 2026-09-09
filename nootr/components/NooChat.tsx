"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { nootrApi } from "@/lib/api";
import { Icon } from "@/components/Icon";
import type { Meal, NooDayView, NooMessage, NooReply, Plan } from "@/lib/types";
import { formatQuantityWithGrams } from "@/lib/units";

/** Primeiro alimento de uma refeição cujo nome contém `nameIncludes` (ex:
 * "café", "almoço"), sem acento pra casar "Café da manhã"/"café da tarde"
 * do mesmo jeito. `null` quando a pessoa não tem essa refeição ou ela está
 * vazia, aí quem chama cai no exemplo genérico. */
function firstFoodOf(meals: Meal[], nameIncludes: string): string | null {
  const meal = meals.find((m) => m.name.toLowerCase().includes(nameIncludes));
  return meal?.foods[0]?.name ?? null;
}

/** Exemplos da tela vazia do Noo: sempre que der, usa um alimento de verdade
 * da própria dieta (café da manhã e almoço) em vez de "pão"/"frango" fixos,
 * que não fazem sentido pra quem não tem esses alimentos no plano. A pizza
 * continua fixa, é só um exemplo de imprevisto, não precisa vir da dieta.
 *
 * `meals` tem que ser o TEMPLATE original (sem os ajustes de hoje, ver
 * `original_diet` em `GET /nootr/diets/today`), não o dia já materializado:
 * sugerir "não comi X" pra um alimento que uma troca de hoje já tirou da
 * dieta não faz sentido nenhum. */
function buildSuggestions(meals: Meal[]): string[] {
  const cafeFood = firstFoodOf(meals, "café");
  const almocoFood = firstFoodOf(meals, "almoço");
  return [
    cafeFood ? `Não comi ${cafeFood} no café` : "Não comi o pão do café",
    "Vou comer pizza no jantar",
    almocoFood ? `Estou sem ${almocoFood} pro almoço` : "Estou sem frango pro almoço",
  ];
}

// Dourado = ganhou (mais quantidade ou alimento novo), mesmo tom de
// confirmação usado no resto do app (ver .num/nootr-gold). Removido/diminuído
// usa o tom apagado (não vermelho: vermelho é o acento da marca, usá-lo pra
// "erro"/perda criaria ambiguidade, e sair de algo na troca não é uma falha).
// Nome colorido quando o alimento entrou/saiu, com risco no que saiu; só a
// seta colorida quando foi a quantidade que mudou.
const FOOD_STYLE: Record<string, { arrow: string; name: string; label: string }> = {
  added: { arrow: "+", name: "text-nootr-gold", label: "adicionado" },
  removed: { arrow: "−", name: "text-nootr-faint line-through decoration-nootr-faint/50", label: "removido" },
  increased: { arrow: "↑", name: "", label: "aumentou" },
  decreased: { arrow: "↓", name: "", label: "diminuiu" },
};
const ARROW_COLOR: Record<string, string> = {
  added: "text-nootr-gold",
  increased: "text-nootr-gold",
  removed: "text-nootr-faint",
  decreased: "text-nootr-faint",
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
      <div className="rounded-lg bg-nootr-black/40 px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-caps text-nootr-faint">Dia</p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="tabular-nums text-nootr-muted">{Math.round(day.macros_before.calories)}</span>
          <span className="text-nootr-faint">→</span>
          <span className="font-semibold tabular-nums text-nootr-cream">
            {Math.round(day.macros_after.calories)} kcal
          </span>
          {Math.abs(deltaKcal) >= 1 && (
            <span className={`num text-xs ${deltaKcal > 0 ? "text-nootr-gold" : "text-nootr-faint"}`}>
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
                  <span className="shrink-0 tabular-nums text-nootr-faint">{Math.round(food.calories)} kcal</span>
                  <span className="ml-auto shrink-0 tabular-nums text-nootr-faint">
                    {food.previous_quantity && (
                      <>
                        <span>{formatQuantityWithGrams(food.previous_quantity, food.previous_grams)}</span>
                        <span className="mx-1">→</span>
                      </>
                    )}
                    {formatQuantityWithGrams(food.quantity, food.grams)}
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
export function NooChat({
  token, onApplied, meals = [],
}: {
  token: string;
  onApplied?: () => void;
  // Dieta ORIGINAL (template, sem ajustes de hoje), só usada pros exemplos
  // da tela vazia, ver buildSuggestions.
  meals?: Meal[];
}) {
  const SUGGESTIONS = useMemo(() => buildSuggestions(meals), [meals]);
  const [messages, setMessages] = useState<NooMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState(0);
  const [limit, setLimit] = useState(0);
  const [plan, setPlan] = useState<Plan>("basic");
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);
  // Ação destrutiva (desfaz o dia inteiro), então pede confirmação inline
  // antes de executar, em vez de agir no primeiro clique.
  const [confirmingReset, setConfirmingReset] = useState(false);
  // Áudio (Pro): grava pelo MediaRecorder e manda pro backend transcrever.
  const [recording, setRecording] = useState(false);
  // Segundos gravados, só pra mostrar o cronômetro na barra de gravação.
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  // Detectado só depois de montar: no SSR não existe navigator, e navegador
  // sem MediaRecorder (ou página sem HTTPS) não deve mostrar o botão.
  const [canRecord, setCanRecord] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // true entre clicar em "cancelar" e o MediaRecorder de fato parar: o
  // onstop precisa saber que é pra descartar o áudio em vez de mandar.
  const cancelledRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!recording) return;
    setRecordingSeconds(0);
    const interval = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [recording]);

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
    setText("");
    // Otimista: a mensagem da pessoa aparece na hora, a resposta vem depois.
    const optimisticId = `local-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: optimisticId, role: "user", text: trimmed, changes: null,
      created_at: new Date().toISOString(),
    }]);
    await runTurn(
      () => nootrApi.noo.send(token, trimmed),
      optimisticId,
      () => setText(trimmed),
    );
  }

  /**
   * A parte comum de mandar uma mensagem (digitada ou falada): dispara a
   * chamada, cola a resposta do Noo na conversa e, se der erro, remove a
   * mensagem otimista da pessoa e devolve o que ela tinha (`onFailure`).
   */
  async function runTurn(
    call: () => Promise<NooReply>,
    optimisticId: string,
    onFailure: () => void,
  ) {
    setError("");
    setSending(true);
    try {
      const r = await call();
      setMessages((prev) => [
        // Áudio: troca o placeholder pela transcrição real (o texto que o
        // backend de fato usou como mensagem) e anexa o áudio, pra pessoa
        // poder reouvir e conferir se foi entendido direito.
        ...prev.map((m) =>
          m.id === optimisticId && r.transcript
            ? { ...m, text: r.transcript, audio: r.audio ?? null }
            : m
        ),
        {
          id: `${optimisticId}-a`, role: "assistant" as const, text: r.reply,
          changes: r.day, created_at: new Date().toISOString(),
        },
      ]);
      setRemaining(r.remaining);
      // O dia mudou: quem embute o chat recarrega a dieta.
      if (r.day && onApplied) onApplied();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      onFailure();
      setError(err instanceof Error ? err.message : "Não consegui falar com o Noo agora.");
    } finally {
      setSending(false);
    }
  }

  /**
   * Decodifica o áudio gravado e mede o pico de amplitude, pra pegar dois
   * jeitos de gravação ruim ANTES de mandar pro Gemini: (1) corrompida (o
   * decode falha) e (2) sem som de verdade (pico bem abaixo de qualquer fala
   * audível, mesmo baixinho). -50dB de pico é a régua: fala captada de
   * qualquer jeito minimamente razoável passa disso, silêncio/ruído de fundo
   * puro não passa.
   */
  async function analyzeRecording(blob: Blob): Promise<{ ok: true } | { ok: false; reason: "corrupted" | "silent" }> {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
      ctx.close();
      let peak = 0;
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
          const abs = Math.abs(data[i]);
          if (abs > peak) peak = abs;
        }
      }
      return peak > 0.003 ? { ok: true } : { ok: false, reason: "silent" };
    } catch {
      return { ok: false, reason: "corrupted" };
    }
  }

  async function startRecording() {
    if (sending || recording || remaining <= 0) return;
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Bitrate reduzido de propósito: é voz falada, não música, e o áudio
      // fica guardado junto da mensagem pra reouvir (ver noo_messages.audio).
      // 32kbps é o mínimo recomendado pro Opus manter voz clara (abaixo
      // disso arrisca prejudicar a própria transcrição), um recado de 1
      // minuto ainda fica em ~240KB, bem abaixo do ~1MB do padrão do Chrome.
      const recorder = new MediaRecorder(stream, { audioBitsPerSecond: 32000 });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        // Solta o microfone assim que para, senão o indicador de gravação do
        // navegador fica aceso mesmo com o chat já parado.
        stream.getTracks().forEach((t) => t.stop());
        if (cancelledRef.current) {
          cancelledRef.current = false;
          chunksRef.current = [];
          return;
        }
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        chunksRef.current = [];
        if (blob.size === 0) return;
        // Confere se deu pra gravar som de verdade ANTES de gastar uma
        // mensagem: às vezes a captura do microfone sai corrompida ou
        // silenciosa (falha de hardware/driver, não é bug do app), e nesses
        // casos o Gemini pode "alucinar" uma frase que ninguém falou em vez
        // de admitir que não ouviu nada. Barra isso aqui, com uma mensagem
        // que a pessoa consegue agir (ela sabe se o mic dela está ok).
        const check = await analyzeRecording(blob);
        if (!check.ok) {
          setError(
            check.reason === "corrupted"
              ? "Não consegui processar esse áudio, tenta gravar de novo."
              : "Não captei nenhum som nesse áudio. Verifique se o microfone está funcionando e tente de novo, falando mais perto dele."
          );
          return;
        }
        sendAudio(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Não consegui acessar o microfone. Confira a permissão do navegador.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  // Descarta a gravação em andamento, sem transcrever nem gastar mensagem
  // do limite diário, pro caso da pessoa mudar de ideia no meio da fala.
  function cancelRecording() {
    cancelledRef.current = true;
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  function formatRecordingTime(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  async function sendAudio(blob: Blob) {
    const optimisticId = `local-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: optimisticId, role: "user", text: "🎙️ …", changes: null,
      created_at: new Date().toISOString(),
    }]);
    await runTurn(() => nootrApi.noo.sendAudio(token, blob), optimisticId, () => {});
  }

  useEffect(() => {
    setCanRecord(
      typeof window !== "undefined" &&
        typeof window.MediaRecorder !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia
    );
  }, []);

  // Se o componente sair da tela no meio de uma gravação, o microfone
  // continuaria aberto: solta as tracks e para o recorder. O `onstop` é
  // desligado antes pra um chat desmontado não disparar um envio (e o gasto
  // de uma mensagem) por um áudio que ninguém vai ver.
  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (!recorder) return;
      recorder.onstop = null;
      if (recorder.state !== "inactive") recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
    };
  }, []);

  async function handleReset() {
    if (resetting) return;
    setConfirmingReset(false);
    setResetting(true);
    setError("");
    try {
      const r = await nootrApi.noo.reset(token);
      setMessages([]);
      setRemaining(r.remaining);
      setLimit(r.limit);
      // A dieta voltou pro original: quem embute o chat recarrega.
      onApplied?.();
    } catch {
      setError("Não consegui reiniciar o Noo agora.");
    } finally {
      setResetting(false);
    }
  }

  const isEmpty = messages.length === 0;
  const outOfMessages = remaining <= 0 && !loading;

  return (
    <div className="card flex h-[min(70vh,640px)] flex-col p-0">
      <header className="flex items-center gap-3 border-b border-nootr-line px-5 py-3.5">
        <Image src="/noo-icon.png" alt="Noo" width={36} height={36} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-nootr-cream">
            Noo
            {plan === "pro" && (
              <span className="ml-2 rounded-full bg-nootr-wine/40 px-1.5 py-px text-[9px] font-bold uppercase tracking-caps text-nootr-bordoSoft">
                Pro
              </span>
            )}
          </p>
          <p className="text-xs text-nootr-faint">Seu companheiro de dieta</p>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-nootr-faint" title="Mensagens restantes hoje">
          {loading ? "…" : `${remaining}/${limit} mensagens restantes`}
        </span>
        {!isEmpty && (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            disabled={resetting}
            title="Reiniciar Noo"
            className="shrink-0 text-xs text-nootr-faint transition-colors hover:text-nootr-bordoSoft disabled:opacity-50"
          >
            {resetting ? "…" : "Reiniciar Noo"}
          </button>
        )}
      </header>

      {confirmingReset && (
        <div className="border-b border-nootr-bordo/30 bg-nootr-wine/25 px-5 py-3">
          <p className="text-sm text-nootr-cream">Tem certeza?</p>
          <p className="mt-1 text-xs text-nootr-muted">
            Isso limpa esta conversa e desfaz TODAS as alterações de hoje, a dieta volta pro estado
            original (como você montou, sem os ajustes do Noo nem das funções manuais).
          </p>
          <div className="mt-2.5 flex gap-2">
            <button type="button" onClick={handleReset} className="btn-primary px-3 py-1.5 text-xs">
              Sim, reiniciar
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReset(false)}
              className="btn-ghost px-3 py-1.5 text-xs"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {loading && <div className="h-16 animate-pulse rounded-lg bg-nootr-line/40" />}

        {!loading && isEmpty && (
          <div className="py-6 text-center">
            <Image src="/noo-icon.png" alt="Noo" width={64} height={64} className="mx-auto" priority />
            <p className="mt-2 font-display text-xl text-nootr-cream">Oi, eu sou o Noo.</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-nootr-muted">
              Comeu algo fora do plano? Vai comer algo diferente na janta? Acabou algum ingrediente?
              Me conta o seu problema que eu reajusto para suas metas continuarem batendo.
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
            <div key={m.id} className="flex items-end justify-end gap-2">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-nootr-bordo/90 px-3.5 py-2">
                {m.audio && (
                  // Áudio que a pessoa mandou: dá pra reouvir o que ela falou
                  // e conferir contra a transcrição logo abaixo.
                  <audio
                    controls
                    preload="metadata"
                    src={m.audio}
                    aria-label="Seu áudio"
                    className="mb-1.5 h-9 w-56 max-w-full"
                  />
                )}
                <p className="text-sm text-nootr-cream">{m.text}</p>
              </div>
              <span className="mb-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-nootr-wine/40 text-nootr-bordoSoft">
                <Icon name="user" size={14} />
              </span>
            </div>
          ) : (
            <div key={m.id} className="flex items-end gap-2">
              <Image src="/noo-icon.png" alt="" width={24} height={24} className="mb-1 shrink-0" />
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-nootr-black px-3.5 py-2.5">
                <p className="text-sm leading-relaxed text-nootr-cream">{m.text}</p>
                {isDayView(m.changes) && <DayView day={m.changes} />}
              </div>
            </div>
          )
        )}

        {sending && (
          <div className="flex items-center gap-2" aria-label="Noo está pensando">
            <Image src="/noo-icon.png" alt="" width={24} height={24} className="shrink-0" />
            <div className="flex items-center gap-1.5 text-nootr-faint">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <footer className="border-t border-nootr-line px-5 py-3.5">
        {error && <p className="mb-2 text-xs text-nootr-bordoSoft">{error}</p>}

        {outOfMessages ? (
          <div className="rounded-lg bg-nootr-wine/25 px-3.5 py-3 text-center">
            <p className="text-sm text-nootr-cream">Você usou suas mensagens de hoje.</p>
            <p className="mt-1 text-xs text-nootr-muted">
              O limite renova amanhã, ou reinicie o Noo pra ganhar mais uma (só rende bônus algumas
              vezes por dia).
            </p>
            {plan !== "pro" && (
              <p className="mt-1 text-xs text-nootr-muted">
                No Pro são 20 por dia (+5 reiniciando), com um modelo de IA mais avançado.{" "}
                <Link href="/plano" className="text-nootr-bordoSoft underline-offset-4 hover:underline">
                  Conhecer o Pro
                </Link>
              </p>
            )}
          </div>
        ) : recording ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              aria-label="Cancelar gravação"
              title="Cancelar gravação"
              className="shrink-0 rounded-lg border border-nootr-line px-3 py-2.5 text-nootr-muted transition-colors hover:border-nootr-bordo/50 hover:text-nootr-bordoSoft"
            >
              <Icon name="trash" size={18} />
            </button>
            <div className="input-field flex flex-1 items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-nootr-bordo" />
              <span className="text-sm text-nootr-cream">Gravando áudio…</span>
              <span className="num ml-auto text-sm text-nootr-faint">{formatRecordingTime(recordingSeconds)}</span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              aria-label="Parar gravação e enviar"
              title="Parar e enviar"
              className="shrink-0 rounded-lg bg-nootr-bordo px-3 py-2.5 text-nootr-cream transition-colors hover:bg-nootr-bordoDeep"
            >
              <Icon name="mic" size={18} />
            </button>
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
              aria-label="Mensagem para o Noo"
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
            {plan === "pro" && canRecord && (
              <button
                type="button"
                onClick={startRecording}
                disabled={sending}
                aria-label="Gravar áudio para o Noo"
                title="Falar em vez de digitar"
                className="shrink-0 rounded-lg border border-nootr-line px-3 py-2.5 text-nootr-muted transition-colors hover:border-nootr-bordo/50 hover:text-nootr-bordoSoft disabled:opacity-50"
              >
                <Icon name="mic" size={18} />
              </button>
            )}
            <button type="submit" disabled={sending || !text.trim()} className="btn-primary shrink-0 px-4 py-2.5">
              {sending ? "…" : "Enviar"}
            </button>
          </form>
        )}

        {plan !== "pro" && !outOfMessages && (
          <p className="mt-2 text-center text-[11px] text-nootr-faint">
            O Noo do Pro tem 20 mensagens por dia (+5 reiniciando), aceita áudio e usa um modelo de IA
            mais avançado.{" "}
            <Link href="/plano" className="underline-offset-4 hover:text-nootr-bordoSoft hover:underline">
              Saiba mais
            </Link>
          </p>
        )}
      </footer>
    </div>
  );
}
