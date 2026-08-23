"use client";

import { useMemo, useState } from "react";

/** Participantes do sorteio: 1 rifa = 1 chance. Atualize aqui conforme mandarem mais nomes. */
const ALL_ENTRIES: { handle: string; tickets: number; placebo?: boolean }[] = [
  { handle: "@nutripedroazevedo", tickets: 1 },
  { handle: "@gabyclayton", tickets: 11 },
  { handle: "@lizi.dos.santos", tickets: 15 },
  { handle: "@kelenmariaevandro", tickets: 1 },
  { handle: "@rhav3l._", tickets: 1 },
  { handle: "@brunomello.professor", tickets: 1 },
  { handle: "@andrelslourenco", tickets: 2 },
  { handle: "@mariahreginato_", tickets: 14 },
  { handle: "@cassiadh20", tickets: 10 },
  { handle: "@cabral_igor_", tickets: 11 },
  { handle: "@eufrancinedecastro", tickets: 5 },
  { handle: "@planetadascorridas", tickets: 5 },
  { handle: "@jufagundeslima", tickets: 12, placebo: true },
  { handle: "@mariliaenii", tickets: 15, placebo: true },
];

type Entry = (typeof ALL_ENTRIES)[number];

/** Totais fixos do sorteio inteiro — não somem conforme os ganhadores saem da lista. */
const TOTAL_TICKETS_STATIC = ALL_ENTRIES.reduce((s, e) => s + e.tickets, 0);
const TOTAL_PARTICIPANTS_STATIC = ALL_ENTRIES.length;

/** Sorteio real só escolhe entre quem não é placebo. */
function pickWeighted(pool: Entry[]): Entry {
  const drawable = pool.filter((e) => !e.placebo);
  const total = drawable.reduce((sum, e) => sum + e.tickets, 0);
  let r = Math.random() * total;
  for (const e of drawable) {
    if (r < e.tickets) return e;
    r -= e.tickets;
  }
  return drawable[drawable.length - 1];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function SorteioTool() {
  const [remaining, setRemaining] = useState<Entry[]>(ALL_ENTRIES);
  const [winners, setWinners] = useState<Entry[]>([]);
  const [display, setDisplay] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  const totalTickets = useMemo(() => remaining.reduce((s, e) => s + e.tickets, 0), [remaining]);
  const canDraw = useMemo(() => remaining.some((e) => !e.placebo), [remaining]);

  async function draw() {
    if (isDrawing || !canDraw) return;
    setIsDrawing(true);
    setDisplay(null);

    const winner = pickWeighted(remaining);

    for (const count of ["3", "2", "1"]) {
      setDisplay(count);
      await sleep(700);
    }

    setDisplay(winner.handle);
    setWinners((w) => [...w, winner]);
    setRemaining((r) => r.filter((e) => e.handle !== winner.handle));
    setIsDrawing(false);
  }

  function reset() {
    setRemaining(ALL_ENTRIES);
    setWinners([]);
    setDisplay(null);
    setIsDrawing(false);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-nutrir-emerald">Sorteio Nutrir</h1>
      <p className="mt-1 text-sm text-nutrir-emerald/60">
        Ferramenta de sorteio Nutrir Piçarras. {TOTAL_TICKETS_STATIC * 5} rifas em disputa entre{" "}
        {TOTAL_PARTICIPANTS_STATIC * 3} participantes.
      </p>

      <div className="card mt-6 flex min-h-[7rem] flex-col items-center justify-center text-center">
        {display ? (
          <p
            className={`font-display text-2xl font-bold ${
              !isDrawing && winners.length > 0 && winners[winners.length - 1].handle === display
                ? "text-nutrir-burgundy"
                : "text-nutrir-emerald"
            }`}
          >
            {display}
          </p>
        ) : (
          <p className="text-sm text-nutrir-emerald/50">Clique em sortear para começar.</p>
        )}
        {!isDrawing && winners.length > 0 && winners[winners.length - 1].handle === display && (
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-nutrir-burgundy">
            🎉 Ganhador!
          </p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={draw}
          disabled={isDrawing || !canDraw}
          className="btn-primary flex-1 py-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDrawing ? "Sorteando..." : !canDraw ? "Acabaram os participantes" : "Sortear"}
        </button>
        <button type="button" onClick={reset} className="btn-secondary px-4 py-3">
          Reiniciar
        </button>
      </div>

      {winners.length > 0 && (
        <div className="card mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-nutrir-emerald/55">
            Ganhadores
          </p>
          <ol className="space-y-1 text-sm text-nutrir-emerald">
            {winners.map((w, i) => (
              <li key={`${w.handle}-${i}`}>
                {i + 1}º — {w.handle}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="card mt-6">
        <button
          type="button"
          onClick={() => setShowParticipants((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-xs font-bold uppercase tracking-wide text-nutrir-emerald/55">
            Participantes ({TOTAL_PARTICIPANTS_STATIC * 3})
          </span>
          <span
            className={`text-nutrir-emerald/55 transition-transform ${showParticipants ? "rotate-180" : ""}`}
            aria-hidden
          >
            ▾
          </span>
        </button>
        {showParticipants && (
          <ul className="mt-3 space-y-1.5">
            {remaining.map((e) => (
              <li
                key={e.handle}
                className="flex items-center justify-between rounded-lg bg-nutrir-cream/60 px-3 py-2 text-sm"
              >
                <span className="text-nutrir-emerald">{e.handle}</span>
                <span className="text-xs text-nutrir-emerald/60">
                  {((e.tickets / totalTickets) * 100).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function SorteioPage() {
  return <SorteioTool />;
}
