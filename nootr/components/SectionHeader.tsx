import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";

/** Cabeçalho de seção dentro de um cartão: selo de ícone + título + descrição.
 * Usado no Perfil e em outras telas pra dar hierarquia visual e um toque
 * premium consistente. */
export function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: IconName;
  title: string;
  subtitle?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="icon-badge mt-0.5">
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <p className="font-display text-lg leading-tight text-nootr-cream">{title}</p>
        {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-nootr-muted">{subtitle}</p>}
      </div>
    </div>
  );
}
