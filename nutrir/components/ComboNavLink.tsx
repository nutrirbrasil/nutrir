"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComboSectionId } from "@/lib/combo-nav-links";
import {
  COMBO_MENU_LINKS,
  isCombosHome,
  navigateToComboSection,
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

export { COMBO_MENU_LINKS };
