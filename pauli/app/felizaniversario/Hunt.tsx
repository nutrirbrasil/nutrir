"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { FaCakeCandles } from "react-icons/fa6";
import { LuGift, LuHeart, LuLock, LuPartyPopper, LuSearch } from "react-icons/lu";
import { Confetti, type Burst } from "./Confetti";
import { bonus, finale, opener, places } from "./puzzles";

const STORAGE_KEY = "pauli_felizaniversario_v3";
const TOTAL = places.length;
const GOLD_GRADIENT = "linear-gradient(135deg, #7a6240 0%, #c4a574 55%, #dcc9a3 100%)";

type Screen = "intro" | "opener" | "level" | "bonus" | "finale";
type Progress = { screen: Screen; index: number };

const INITIAL: Progress = { screen: "intro", index: 0 };

const WRONG_PLACE = [
  "Essa senha não abriu o cadeado. Confere o que está escrito no papel!",
  "Quase lá! Será que você achou o papel certo?",
  "Hmm, ainda não. Releia a charada com calma, amor.",
];
const WRONG_OPENER = [
  "Hmm, esse não é o resultado. Faz a conta com calma!",
  "Quase! Confere a conta com calma, passo a passo.",
];

const balloons = [
  { left: "4%", size: 44, delay: "0s", duration: "18s", from: "#dcc9a3", to: "#a8875c", opacity: 0.5 },
  { left: "16%", size: 60, delay: "5s", duration: "22s", from: "#c4a574", to: "#7a6240", opacity: 0.4 },
  { left: "29%", size: 38, delay: "9s", duration: "16s", from: "#f5ecd9", to: "#c4a574", opacity: 0.45 },
  { left: "42%", size: 54, delay: "2s", duration: "24s", from: "#dcc9a3", to: "#8b7044", opacity: 0.35 },
  { left: "55%", size: 40, delay: "12s", duration: "19s", from: "#e8c9a0", to: "#a8875c", opacity: 0.5 },
  { left: "67%", size: 58, delay: "7s", duration: "23s", from: "#c4a574", to: "#7a6240", opacity: 0.4 },
  { left: "79%", size: 42, delay: "3s", duration: "17s", from: "#f5ecd9", to: "#a8875c", opacity: 0.45 },
  { left: "90%", size: 52, delay: "10s", duration: "21s", from: "#dcc9a3", to: "#8b7044", opacity: 0.4 },
];

const css = `
@keyframes huntFloat {
  0% { transform: translate3d(0, 110vh, 0) rotate(-4deg); opacity: 0; }
  10% { opacity: 1; }
  50% { transform: translate3d(16px, 50vh, 0) rotate(4deg); }
  90% { opacity: 1; }
  100% { transform: translate3d(-12px, -30vh, 0) rotate(-3deg); opacity: 0; }
}
@keyframes huntFade {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes huntGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(196, 165, 116, 0.45); }
  50% { box-shadow: 0 0 0 14px rgba(196, 165, 116, 0); }
}
.hunt-fade { opacity: 0; animation: huntFade 0.8s ease-out forwards; }
.hunt-glow { animation: huntGlow 2.2s ease-out infinite; }
.hunt-balloon { position: absolute; top: 0; animation: huntFloat linear infinite; will-change: transform; }
@media (prefers-reduced-motion: reduce) {
  .hunt-fade { opacity: 1; animation: none; }
  .hunt-glow { animation: none; }
  .hunt-balloon { display: none; }
}
`;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function Balloon({ id, size, from, to }: { id: number; size: number; from: string; to: string }) {
  return (
    <svg viewBox="0 0 60 92" width={size} height={(size * 92) / 60} aria-hidden="true">
      <defs>
        <radialGradient id={`hunt-balloon-${id}`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="35%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </radialGradient>
      </defs>
      <ellipse cx="30" cy="32" rx="26" ry="30" fill={`url(#hunt-balloon-${id})`} />
      <path d="M30 62 L25.5 69 L34.5 69 Z" fill={to} />
      <path d="M30 69 C24 78 36 84 30 92" stroke={from} strokeWidth="1.2" fill="none" />
    </svg>
  );
}

export function Hunt() {
  const [progress, setProgress] = useState<Progress>(INITIAL);
  const [ready, setReady] = useState(false);
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "wrong" | "right">("idle");
  const [message, setMessage] = useState("");
  const [wrongCount, setWrongCount] = useState(0);
  const [burst, setBurst] = useState<Burst>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Progress;
        const validScreen = ["intro", "opener", "level", "bonus", "finale"].includes(saved.screen);
        if (validScreen && Number.isInteger(saved.index) && saved.index >= 0 && saved.index < TOTAL) {
          setProgress(saved);
        }
      }
    } catch {
      setProgress(INITIAL);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      return;
    }
  }, [progress, ready]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [progress.screen, progress.index]);

  function resetAnswer() {
    setValue("");
    setStatus("idle");
    setMessage("");
    setWrongCount(0);
  }

  function shake() {
    fieldRef.current?.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-8px)" },
        { transform: "translateX(8px)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(6px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 380, easing: "ease-in-out" },
    );
  }

  function go(next: Progress) {
    setProgress(next);
    resetAnswer();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (status === "right") return;

    const isOpener = progress.screen === "opener";
    const place = places[progress.index];
    const expected = isOpener ? opener.answer : (place.password ?? "");

    if (normalize(value) !== normalize(expected)) {
      const pool = isOpener ? WRONG_OPENER : WRONG_PLACE;
      setStatus("wrong");
      setMessage(pool[wrongCount % pool.length]);
      setWrongCount((count) => count + 1);
      shake();
      return;
    }

    setBurst({ id: Date.now(), big: false });
    setStatus("right");
  }

  function findGift() {
    setBurst({ id: Date.now(), big: true });
    go({ screen: "bonus", index: progress.index });
  }

  function findSecondGift() {
    setBurst({ id: Date.now(), big: true });
    go({ screen: "finale", index: progress.index });
  }

  function afterRight() {
    if (progress.screen === "opener") {
      go({ screen: "level", index: 0 });
    } else {
      go({ screen: "level", index: progress.index + 1 });
    }
  }

  if (!ready) return <div className="fixed inset-0 z-[60] bg-black" />;

  const place = places[progress.index];
  const completed = progress.screen === "level" ? progress.index : progress.index + 1;
  const shownCompleted = progress.screen === "opener" ? 0 : completed + (status === "right" ? 1 : 0);
  const pct = (shownCompleted / TOTAL) * 100;

  const inputClass =
    "w-full bg-transparent py-3 text-base text-white placeholder:text-pauli-sand/40 focus:outline-none";

  return (
    <div
      ref={scrollRef}
      className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-black text-pauli-sand"
    >
      <style>{css}</style>

      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(168,135,92,0.28),transparent_55%)]" />
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        {balloons.map((b, i) => (
          <div
            key={i}
            className="hunt-balloon"
            style={{ left: b.left, animationDuration: b.duration, animationDelay: b.delay }}
          >
            <div style={{ opacity: b.opacity }}>
              <Balloon id={i} size={b.size} from={b.from} to={b.to} />
            </div>
          </div>
        ))}
      </div>

      <Confetti burst={burst} />

      {progress.screen === "intro" ? (
        <main className="relative z-10 mx-auto flex min-h-[100dvh] max-w-xl flex-col justify-center px-5 py-12">
          <div className="hunt-fade text-center">
            <FaCakeCandles className="mx-auto h-10 w-10 text-pauli-gold-light" aria-hidden="true" />
            <p className="dark-accent-label mt-4">Para a Bilu</p>
            <h1 className="gold-text mt-2 font-display text-4xl font-bold leading-tight md:text-5xl">
              Parabéns, meu amor!
            </h1>
            <p className="dark-accent-body mt-2 text-lg">Hoje você completa 32 anos.</p>
          </div>

          <div
            className="hunt-fade mt-8 space-y-4 text-center text-base leading-relaxed text-pauli-sand/90"
            style={{ animationDelay: "250ms" }}
          >
            <p>
              Hoje o mundo ganhou mais um ano da pessoa mais especial que eu conheço. Obrigado por ser
              luz nos meus dias, por cuidar tanto de mim e de todo mundo ao seu redor, e por
              transformar tudo o que você toca em algo mais bonito.
            </p>
            <p>
              Eu te amo muito, Bilu. Amo o seu jeito, o seu sorriso, a sua força e a forma como você
              faz a nossa casa virar lar. Cada ano ao seu lado é o meu presente favorito.
            </p>
            <p>
              Como hoje é um dia só seu, preparei uma surpresa feita com muito carinho (e um pouquinho
              de mistério).
            </p>
          </div>

          <div className="hunt-fade surface-card mt-8 p-6" style={{ animationDelay: "500ms" }}>
            <h2 className="gold-text font-display text-xl font-bold">Como funciona</h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-pauli-sand/90">
              <li className="flex gap-3">
                <LuPartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-pauli-gold-light" aria-hidden="true" />
                <span>São 32 charadas, uma para cada ano da sua vida.</span>
              </li>
              <li className="flex gap-3">
                <LuSearch className="mt-0.5 h-5 w-5 shrink-0 text-pauli-gold-light" aria-hidden="true" />
                <span>
                  Cada charada leva a um lugar da nossa casa, onde escondi um papel com uma senha.
                </span>
              </li>
              <li className="flex gap-3">
                <LuLock className="mt-0.5 h-5 w-5 shrink-0 text-pauli-gold-light" aria-hidden="true" />
                <span>Achou o papel? Digite a senha aqui para destrancar a próxima charada.</span>
              </li>
              <li className="flex gap-3">
                <LuHeart className="mt-0.5 h-5 w-5 shrink-0 text-pauli-gold-light" aria-hidden="true" />
                <span>Para começar, só uma continha rápida. Pronta? Respira fundo e clica em Iniciar.</span>
              </li>
            </ul>
          </div>

          <div className="hunt-fade mt-8 flex justify-center" style={{ animationDelay: "750ms" }}>
            <button
              type="button"
              onClick={() => go({ screen: "opener", index: 0 })}
              className="btn-primary hunt-glow px-12 py-4 text-base"
            >
              Iniciar
            </button>
          </div>

          <p className="hunt-fade mt-6 text-center text-sm text-pauli-sand/70" style={{ animationDelay: "900ms" }}>
            Com todo o meu amor, Pedro
          </p>
        </main>
      ) : null}

      {progress.screen === "opener" || progress.screen === "level" ? (
        <main className="relative z-10 mx-auto min-h-[100dvh] max-w-xl px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-6">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-pauli-sand/70">
            <span>
              {progress.screen === "opener" ? "Desafio de abertura" : `Charada ${progress.index + 1} de ${TOTAL}`}
            </span>
            <span>
              {shownCompleted}/{TOTAL}
            </span>
          </div>
          <div className="relative mt-2 h-2 rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundImage: GOLD_GRADIENT }}
            />
            <span
              className={`absolute -top-2 right-0 flex h-6 w-6 items-center justify-center rounded-full border bg-black ${
                pct >= 100
                  ? "border-pauli-gold text-pauli-gold-light"
                  : "border-pauli-gold/40 text-pauli-sand/60"
              }`}
              aria-hidden="true"
            >
              <LuGift className="h-3 w-3" />
            </span>
          </div>

          <div className="hunt-fade surface-card mt-8 p-6 md:p-8" key={`${progress.screen}-${progress.index}`}>
            <div className="flex flex-wrap gap-2">
              <span className="gold-badge inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                {progress.screen === "opener" ? (
                  <LuPartyPopper className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <LuSearch className="h-3 w-3" aria-hidden="true" />
                )}
                {progress.screen === "opener" ? "Aquecimento" : "Charada da casa"}
              </span>
              {progress.screen === "level" && place.last ? (
                <span className="gold-badge inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                  A última
                </span>
              ) : null}
            </div>

            <p className="dark-accent-heading mt-5 font-display text-xl font-bold leading-snug md:text-2xl">
              {progress.screen === "opener" ? opener.prompt : place.prompt}
            </p>

            {progress.screen === "opener" ? (
              <p className="gold-text mt-5 text-center font-display text-2xl font-bold sm:text-4xl md:text-5xl">
                {opener.equation}
              </p>
            ) : place.last ? (
              <p className="mt-4 text-sm text-pauli-sand/70">
                Esta é a última charada e não tem senha. Quando encontrar o seu presente, é só tocar no botão
                abaixo.
              </p>
            ) : (
              <p className="mt-4 text-sm text-pauli-sand/70">
                Ache o papel escondido, ele tem uma senha. Digite aqui para destrancar.
              </p>
            )}

            {progress.screen === "level" && place.last ? (
              <button type="button" onClick={findGift} className="btn-primary mt-6 w-full">
                Encontrei o meu presente
              </button>
            ) : status === "right" ? (
              <div className="hunt-fade mt-6 text-center">
                <LuHeart className="mx-auto h-8 w-8 text-pauli-gold-light" aria-hidden="true" />
                <p className="gold-text mt-3 font-display text-xl font-bold">
                  {progress.screen === "opener"
                    ? "Exatamente! 32 anos de pura luz. Que comece a caçada!"
                    : "Senha certa! O cadeado abriu."}
                </p>
                <button type="button" onClick={afterRight} className="btn-primary mt-5 w-full">
                  {progress.screen === "opener" ? "Ir para a primeira charada" : "Próxima charada"}
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-6">
                <label htmlFor="hunt-answer" className="detail-text block text-sm font-semibold">
                  {progress.screen === "opener" ? "O resultado" : "Senha do papel"}
                </label>
                <div
                  ref={fieldRef}
                  className="mt-2 flex items-center gap-2 rounded-xl border border-pauli-gold/30 bg-black/40 px-4 focus-within:border-pauli-gold"
                >
                  <LuLock className="h-4 w-4 shrink-0 text-pauli-gold-light" aria-hidden="true" />
                  <input
                    id="hunt-answer"
                    type="text"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="send"
                    inputMode={progress.screen === "opener" ? "numeric" : "text"}
                    placeholder={progress.screen === "opener" ? "Digite o resultado" : "Digite a senha"}
                    className={inputClass}
                  />
                </div>
                <p aria-live="polite" className="mt-2 min-h-[1.5rem] text-sm text-rose-300">
                  {status === "wrong" ? message : ""}
                </p>
                <button type="submit" className="btn-primary mt-2 w-full">
                  {progress.screen === "opener" ? "Responder" : "Destrancar"}
                </button>
              </form>
            )}
          </div>
        </main>
      ) : null}

      {progress.screen === "bonus" ? (
        <main className="relative z-10 mx-auto flex min-h-[100dvh] max-w-xl items-center px-5 py-12">
          <div className="hunt-fade surface-card w-full p-8 text-center md:p-10">
            <div className="gold-badge hunt-glow mx-auto flex h-20 w-20 items-center justify-center rounded-full">
              <LuGift className="h-9 w-9" aria-hidden="true" />
            </div>
            <h2 className="gold-text mt-6 font-display text-3xl font-bold leading-tight">{bonus.title}</h2>
            <p className="dark-accent-body mt-4 text-lg leading-relaxed">{bonus.hint}</p>
            <button type="button" onClick={findSecondGift} className="btn-primary mt-8 w-full">
              {bonus.button}
            </button>
          </div>
        </main>
      ) : null}

      {progress.screen === "finale" ? (
        <main className="relative z-10 mx-auto flex min-h-[100dvh] max-w-xl items-center px-5 py-12">
          <div className="hunt-fade surface-card w-full p-8 text-center md:p-10">
            <div className="gold-badge hunt-glow mx-auto flex h-20 w-20 items-center justify-center rounded-full">
              <FaCakeCandles className="h-9 w-9" aria-hidden="true" />
            </div>
            <h2 className="gold-text mt-6 font-display text-3xl font-bold leading-tight">{finale.title}</h2>
            <p className="dark-accent-body mt-4 text-lg leading-relaxed">{finale.message}</p>
            <button type="button" onClick={() => go(INITIAL)} className="btn-primary mt-8 w-full">
              Recomeçar do início
            </button>
          </div>
        </main>
      ) : null}
    </div>
  );
}
