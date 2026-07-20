"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/** Menu de conta (Perfil, plano, receitas, alimentos, sair) — fica junto do
 * ícone de hambúrguer na Navbar, separado da navegação principal (Dieta/Substituir). */
export function HamburgerMenu({ onSignOut }: { onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const itemClass =
    "block w-full px-4 py-2.5 text-left text-sm text-nootr-cream transition-colors hover:bg-nootr-line/40";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-md text-nootr-muted transition-colors hover:text-nootr-cream"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 4.5H16M2 9H16M2 13.5H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-nootr-line bg-nootr-black shadow-lg">
          <Link href="/perfil" className={itemClass} onClick={() => setOpen(false)}>
            Perfil
          </Link>
          <Link href="/plano" className={itemClass} onClick={() => setOpen(false)}>
            Alterar plano
          </Link>
          <Link href="/nootricionista" className={itemClass} onClick={() => setOpen(false)}>
            Nootricionista
          </Link>
          <Link href="/receitas" className={itemClass} onClick={() => setOpen(false)}>
            Minhas receitas
          </Link>
          <Link href="/alimentos" className={itemClass} onClick={() => setOpen(false)}>
            Meus alimentos
          </Link>
          <div className="border-t border-nootr-line">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              className={`${itemClass} text-nootr-bordoSoft`}
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
