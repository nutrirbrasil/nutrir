"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A assinatura visual do Nootr: o "razão" de uma refeição, o que saiu, o que
 * entrou, o total recalculado. Linguagem de etiqueta de laboratório/farmácia
 * (mono, hairlines, tag numérica), não de card de app genérico. O total
 * conta de verdade de "antes" pra "depois" uma vez quando entra na tela,
 * é a única animação daqui, mostra o produto fazendo a única coisa que ele
 * faz: transformar "comi diferente" num número exato.
 */
export function Ledger() {
  const ref = useRef<HTMLDivElement>(null);
  const [played, setPlayed] = useState(false);
  const before = 731;
  const after = 795;
  const [shown, setShown] = useState(before);

  useEffect(() => {
    const el = ref.current;
    if (!el || played) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(after);
      setPlayed(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        setPlayed(true);
        const duration = 900;
        const start = performance.now();
        function step(now: number) {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          setShown(Math.round(before + (after - before) * eased));
          if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={ref} className="ledger">
      <div className="flex items-center justify-between px-4 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-caps text-nootr-faint">
          Almoço 12:00
        </p>
        <p className="num text-[10px] text-nootr-faint">#0431</p>
      </div>
      <div className="ledger-row">
        <span className="flex items-baseline gap-2.5">
          <span className="ledger-tag">−</span>
          <span className="text-nootr-faint line-through decoration-nootr-faint/60">
            Arroz branco, 150g
          </span>
        </span>
        <span className="num text-xs text-nootr-faint">−197 kcal</span>
      </div>
      <div className="ledger-row">
        <span className="flex items-baseline gap-2.5">
          <span className="ledger-tag text-nootr-bordoSoft">+</span>
          <span className="text-nootr-cream">Batata doce cozida, 200g</span>
        </span>
        <span className="num text-xs text-nootr-bordoSoft">+164 kcal</span>
      </div>
      <div className="ledger-row">
        <span className="flex items-baseline gap-2.5">
          <span className="ledger-tag text-nootr-bordoSoft">+</span>
          <span className="text-nootr-cream">Azeite, 1 colher de sopa (12ml)</span>
        </span>
        <span className="num text-xs text-nootr-bordoSoft">+97 kcal</span>
      </div>
      <div className="flex items-baseline justify-between gap-4 bg-nootr-wine/40 px-4 py-3">
        <span className="text-xs uppercase tracking-caps text-nootr-muted">Almoço recalculado</span>
        <span className="num text-lg text-nootr-cream">{shown} kcal</span>
      </div>
    </div>
  );
}
