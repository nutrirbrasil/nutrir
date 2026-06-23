"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FiChevronDown } from "react-icons/fi";

export const NUTRIR_MENU_LINKS = [
  { href: "/nutrir/sobre", label: "Sobre a Nutrir" },
  { href: "/nutrir/como-funciona", label: "Como Funciona" },
  { href: "/nutrir/formas-de-pagamento", label: "Formas de Pagamento" },
] as const;

function isNutrirSection(pathname: string) {
  return pathname.startsWith("/nutrir");
}

export function NutrirNavMenu({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const pathname = usePathname();
  const active = isNutrirSection(pathname);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== "mobile") return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [variant]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const triggerClass =
    variant === "desktop"
      ? `inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition ${
          active
            ? "bg-nutrir-nude text-nutrir-burgundy"
            : "text-nutrir-nude/85 hover:bg-nutrir-nude/10 hover:text-nutrir-nude"
        }`
      : `flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition ${
          active || open
            ? "bg-nutrir-nude text-nutrir-burgundy"
            : "text-nutrir-nude/90 hover:bg-nutrir-nude/10"
        }`;

  const panelClass =
    variant === "desktop"
      ? "invisible absolute left-0 top-[calc(100%+0.35rem)] z-50 min-w-[15.5rem] translate-y-1 rounded-2xl border border-nutrir-nude-dark/50 bg-nutrir-cream p-2 opacity-0 shadow-xl transition duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
      : `mt-1 space-y-1 overflow-hidden rounded-xl border border-nutrir-nude/20 bg-nutrir-burgundy-dark/40 p-2 transition-all ${
          open ? "max-h-48 opacity-100" : "max-h-0 border-transparent p-0 opacity-0"
        }`;

  return (
    <div
      ref={rootRef}
      className={variant === "desktop" ? "group relative" : "relative"}
      onMouseEnter={variant === "desktop" ? () => setOpen(true) : undefined}
      onMouseLeave={variant === "desktop" ? () => setOpen(false) : undefined}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={variant === "mobile" ? () => setOpen((value) => !value) : undefined}
        className={triggerClass}
      >
        Nutrir
        <FiChevronDown
          className={`text-base transition ${open ? "rotate-180" : ""} ${variant === "desktop" ? "group-hover:rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <ul className={panelClass} role="menu">
        {NUTRIR_MENU_LINKS.map((item) => (
          <li key={item.href} role="none">
            <Link
              href={item.href}
              role="menuitem"
              className={`block rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wide transition hover:bg-nutrir-nude hover:text-nutrir-burgundy ${
                pathname === item.href
                  ? "bg-nutrir-nude text-nutrir-burgundy"
                  : "text-nutrir-emerald"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
