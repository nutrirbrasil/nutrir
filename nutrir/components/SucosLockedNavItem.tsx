"use client";

import { useState } from "react";
import { FiLock } from "react-icons/fi";

interface Props {
  variant: "desktop" | "mobile";
}

/** Aba "Sucos" ainda sem página, só mostra "Em breve" ao passar o mouse ou tocar. */
export function SucosLockedNavItem({ variant }: Props) {
  const [showHint, setShowHint] = useState(false);

  if (variant === "mobile") {
    return (
      <button
        type="button"
        onClick={() => setShowHint((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-nutrir-emerald/40"
      >
        <span className="flex items-center gap-2">
          Sucos
          <FiLock className="text-xs" aria-hidden />
        </span>
        {showHint && (
          <span className="text-xs normal-case tracking-normal text-nutrir-emerald/60">
            Em breve
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => setShowHint((v) => !v)}
        aria-label="Sucos, em breve"
        className="flex cursor-not-allowed items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-nutrir-nude/40"
      >
        Sucos
        <FiLock className="text-xs" aria-hidden />
      </button>
      <div
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-nutrir-emerald-dark px-2.5 py-1 text-xs font-semibold text-nutrir-nude shadow-lg transition-opacity ${
          showHint ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        Em breve
      </div>
    </div>
  );
}
