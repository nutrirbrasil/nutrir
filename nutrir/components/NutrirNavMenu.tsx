"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavDropdown } from "@/components/NavDropdown";

export const NUTRIR_MENU_LINKS = [
  { href: "/nutrir/sobre", label: "Sobre a Nutrir" },
  { href: "/nutrir/como-funciona", label: "Como Funciona" },
  { href: "/nutrir/formas-de-pagamento", label: "Formas de Pagamento" },
  { href: "/beneficios", label: "Paciente VIP" },
] as const;

export function NutrirNavMenu({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const pathname = usePathname();

  return (
    <NavDropdown
      label="Nutrir"
      active={pathname.startsWith("/nutrir") || pathname === "/beneficios"}
      variant={variant}
      pathname={pathname}
    >
      {({ linkClass, isActive }) =>
        NUTRIR_MENU_LINKS.map((item) => {
          // Paciente VIP se destaca em bordô, diferente dos outros links (verde).
          const baseClass =
            item.href === "/beneficios" ? linkClass.replace(/text-nutrir-emerald(\/\d+)?/, "text-nutrir-burgundy") : linkClass;
          return (
            <li key={item.href} role="none">
              <Link
                href={item.href}
                role="menuitem"
                className={`${baseClass}${
                  isActive(item.href) ? " bg-nutrir-nude text-nutrir-burgundy" : ""
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })
      }
    </NavDropdown>
  );
}
