"use client";

import { useState } from "react";
import type { ReactNode } from "react";

const UPGRADE_MSG = "Faça upgrade para o Nootr PRO e libere o acesso a esse recurso.";

/** Botão que, quando `locked` (plano Basic), mostra um cadeado e, ao passar o
 * mouse ou clicar, um aviso de upgrade em vez de disparar `onClick` — usado
 * nos recursos exclusivos do Pro (gerar/importar dieta com IA) que agora
 * ficam visíveis (não escondidos) também no Basic, como isca de upgrade. */
export function ProLockButton({
  locked,
  onClick,
  className,
  wrapperClassName = "relative inline-block",
  lockIcon = "inline",
  children,
}: {
  locked: boolean;
  onClick: () => void;
  className?: string;
  // Controla o display do wrapper — o padrão é inline-block (bom pros botões
  // de ação), mas as opções full-width da tela "Vamos começar" passam "block".
  wrapperClassName?: string;
  // "inline" desenha o cadeado logo após o texto; "none" deixa o próprio
  // children posicionar o cadeado (ex: num canto do card).
  lockIcon?: "inline" | "none";
  children: ReactNode;
}) {
  const [showMsg, setShowMsg] = useState(false);

  return (
    <div className={wrapperClassName}>
      <button
        type="button"
        onClick={() => (locked ? setShowMsg((v) => !v) : onClick())}
        title={locked ? UPGRADE_MSG : undefined}
        className={`${className ?? ""} ${locked ? "opacity-80" : ""}`.trim()}
      >
        {children}
        {locked && lockIcon === "inline" && (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="ml-1.5 inline-block align-[-1px]" aria-hidden>
            <rect x="2" y="5.5" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="1.1" />
            <path d="M3.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
        )}
      </button>
      {locked && showMsg && (
        <div className="absolute left-1/2 z-20 mt-2 w-64 -translate-x-1/2 rounded-lg border border-nootr-bordo/40 bg-nootr-black p-3 text-center text-[11px] text-nootr-muted shadow-xl">
          {UPGRADE_MSG}
        </div>
      )}
    </div>
  );
}
