"use client";

import { useEffect, type ReactNode } from "react";
import { FiChevronDown } from "react-icons/fi";
import { useNavDropdown } from "@/lib/use-nav-dropdown";

interface NavDropdownProps {
  label: string;
  active: boolean;
  variant?: "desktop" | "mobile";
  pathname: string;
  panelMaxHeight?: string;
  children: (ctx: {
    open: boolean;
    close: () => void;
    linkClass: string;
    isActive: (href: string) => boolean;
  }) => ReactNode;
}

export function NavDropdown({
  label,
  active,
  variant = "desktop",
  pathname,
  panelMaxHeight = "max-h-48",
  children,
}: NavDropdownProps) {
  const { open, setOpen, rootRef, openMenu, scheduleClose, close } = useNavDropdown(variant);

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

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
      ? `min-w-[15.5rem] rounded-2xl border border-nutrir-nude-dark/50 bg-nutrir-cream p-2 shadow-xl transition duration-200 ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`
      : `mt-1 space-y-1 overflow-hidden rounded-xl border border-nutrir-nude/20 bg-nutrir-burgundy-dark/40 p-2 transition-all ${
          open ? `${panelMaxHeight} opacity-100` : "max-h-0 border-transparent p-0 opacity-0"
        }`;

  const linkClass =
    variant === "desktop"
      ? "block rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wide text-nutrir-emerald transition hover:bg-nutrir-nude hover:text-nutrir-burgundy"
      : "block rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wide text-nutrir-emerald/90 transition hover:bg-nutrir-nude/10";

  const items = children({
    open,
    close,
    linkClass,
    isActive: (href) => pathname === href,
  });

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={variant === "mobile" ? () => setOpen((v) => !v) : undefined}
        onMouseEnter={variant === "desktop" ? openMenu : undefined}
        onMouseLeave={variant === "desktop" ? scheduleClose : undefined}
        className={triggerClass}
      >
        {label}
        <FiChevronDown className={`text-base transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {variant === "desktop" ? (
        <div
          className={`absolute left-0 top-full z-50 pt-0.5 ${open ? "" : "pointer-events-none"}`}
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          <ul className={panelClass} role="menu">
            {items}
          </ul>
        </div>
      ) : (
        <ul className={panelClass} role="menu">
          {items}
        </ul>
      )}
    </div>
  );
}
