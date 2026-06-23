"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiLayers, FiUser, FiBox } from "react-icons/fi";

const tabs = [
  { href: "/", label: "Combos", icon: FiLayers, match: (path: string) => path === "/" },
  {
    href: "/marmitas",
    label: "Marmitas",
    icon: FiBox,
    match: (path: string) => path === "/marmitas",
  },
  {
    href: "/perfil",
    label: "Perfil",
    icon: FiUser,
    match: (path: string) => path.startsWith("/perfil"),
  },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-nutrir-nude-dark/60 bg-nutrir-cream/95 shadow-[0_-4px_24px_rgba(28,28,28,0.08)] backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-2.5 text-[10px] font-bold uppercase tracking-wide transition ${
                  active ? "text-nutrir-burgundy" : "text-nutrir-emerald/55"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-2xl transition ${
                    active ? "bg-nutrir-burgundy text-nutrir-nude" : "bg-transparent"
                  }`}
                >
                  <Icon className="text-xl" aria-hidden />
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
