"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { FiChevronDown, FiX } from "react-icons/fi";
import { ComboNavLink } from "@/components/CombosNavMenu";
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

function DrawerAccordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-xl px-4 py-2 transition hover:bg-nutrir-nude/60"
      >
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-nutrir-emerald/50">
          {title}
        </span>
        <FiChevronDown
          className={`text-base text-nutrir-emerald/50 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      <div
        className={`grid transition-all duration-200 ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <ul className="mt-1 space-y-1 pb-1">{children}</ul>
        </div>
      </div>
    </div>
  );
}

export function MobileNavDrawer({ open, onClose }: Props) {
  const pathname = usePathname();
  const [combosOpen, setCombosOpen] = useState(false);
  const [nutrirOpen, setNutrirOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setCombosOpen(false);
      setNutrirOpen(false);
    }
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
          <DrawerAccordion
            title="Combos"
            open={combosOpen}
            onToggle={() => setCombosOpen((v) => !v)}
          >
            <li>
              <Link
                href="/"
                onClick={onClose}
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
                <ComboNavLink
                  href={link.href}
                  sectionId={link.sectionId}
                  label={link.label}
                  className="block rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide text-nutrir-emerald/85 transition hover:bg-nutrir-nude"
                  onNavigate={onClose}
                />
              </li>
            ))}
          </DrawerAccordion>

          <ul className="mt-4 space-y-1 border-t border-nutrir-nude-dark/50 pt-4">
            {mainLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onClose}
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
            <DrawerAccordion
              title="Nutrir"
              open={nutrirOpen}
              onToggle={() => setNutrirOpen((v) => !v)}
            >
              {NUTRIR_MENU_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={onClose}
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
            </DrawerAccordion>
          </div>
        </nav>
      </aside>
    </div>
  );
}
