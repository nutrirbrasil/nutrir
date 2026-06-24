"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavDropdown } from "@/components/NavDropdown";
import {
  COMBO_MENU_LINKS,
  COMBO_SECTION_IDS,
  isCombosHome,
  navigateToComboSection,
  type ComboSectionId,
} from "@/lib/combo-nav-links";

export function ComboNavLink({
  href,
  sectionId,
  label,
  className,
  onNavigate,
}: {
  href: string;
  sectionId: ComboSectionId;
  label: string;
  className: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!isCombosHome(pathname)) return;
    event.preventDefault();
    onNavigate?.();
    navigateToComboSection(sectionId);
  }

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {label}
    </Link>
  );
}

export function CombosNavMenu({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const pathname = usePathname();

  return (
    <NavDropdown
      label="Combos"
      active={isCombosHome(pathname)}
      variant={variant}
      pathname={pathname}
      panelMaxHeight="max-h-64"
    >
      {({ close, linkClass }) =>
        COMBO_MENU_LINKS.map((item) => (
          <li key={item.sectionId} role="none">
            <ComboNavLink
              href={item.href}
              sectionId={item.sectionId}
              label={item.label}
              className={linkClass}
              onNavigate={variant === "mobile" ? close : undefined}
            />
          </li>
        ))
      }
    </NavDropdown>
  );
}

export { COMBO_MENU_LINKS, COMBO_SECTION_IDS };
