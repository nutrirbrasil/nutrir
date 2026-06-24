"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { FiX } from "react-icons/fi";
import { COMBO_MENU_LINKS } from "@/lib/combo-nav-links";
import { NUTRIR_MENU_LINKS } from "@/components/NutrirNavMenu";

const mainLinks = [
  { href: "/marmitas", label: "Marmitas" },
  { href: "/perfil", label: "Perfil" },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MobileNavDrawer({ open, onClose }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        aria-label="Fechar menu"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col bg-nutrir-cream shadow-2xl">
        <div className="flex items-center justify-between border-b border-nutrir-nude-dark/50 px-5 py-4">
          <p className="font-display text-lg font-bold uppercase tracking-wide text-nutrir-burgundy">Menu</p>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-nutrir-emerald transition hover:bg-nutrir-nude"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4">
          <div>
            <p className="px-4 text-xs font-bold uppercase tracking-[0.2em] text-nutrir-emerald/50">
              Combos
            </p>
            <ul className="mt-2 space-y-1">
              <li>
                <Link
                  href="/"
                  className={`block rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide transition ${
                    pathname === "/"
                      ? "bg-nutrir-burgundy text-nutrir-nude"
                      : "text-nutrir-emerald hover:bg-nutrir-nude"
                  }`}
                >
                  Ver todos
                </Link>
              </li>
              {COMBO_MENU_LINKS.map((link) => (
                <li key={link.sectionId}>
                  <Link
                    href={link.href}
                    className="block rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide text-nutrir-emerald/85 transition hover:bg-nutrir-nude"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <ul className="mt-4 space-y-1 border-t border-nutrir-nude-dark/50 pt-4">
            {mainLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`block rounded-xl px-4 py-3.5 text-sm font-bold uppercase tracking-wide transition ${
                    pathname === link.href ||
                    (link.href === "/perfil" && pathname.startsWith("/perfil"))
                      ? "bg-nutrir-burgundy text-nutrir-nude"
                      : "text-nutrir-emerald hover:bg-nutrir-nude"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-nutrir-nude-dark/50 pt-4">
            <p className="px-4 text-xs font-bold uppercase tracking-[0.2em] text-nutrir-emerald/50">
              Nutrir
            </p>
            <ul className="mt-2 space-y-1">
              {NUTRIR_MENU_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`block rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide transition ${
                      pathname === link.href
                        ? "bg-nutrir-burgundy/10 text-nutrir-burgundy"
                        : "text-nutrir-emerald/85 hover:bg-nutrir-nude"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </aside>
    </div>
  );
}
