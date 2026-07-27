import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";

/**
 * Cabeçalho padrão de página: filete bordô, selo de ícone, título display e
 * subtítulo, com entrada suave (rise-in). Um slot opcional à direita pra ações
 * (ex: seletor de país no Perfil). Mantém todas as telas visualmente coerentes.
 */
export function PageHeader({
  icon,
  title,
  subtitle,
  right,
}: {
  icon?: IconName;
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="rise-in">
      <div className="divider-bordo mb-4" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          {icon && (
            <span className="icon-badge mt-1 sm:h-12 sm:w-12 sm:rounded-xl">
              <Icon name={icon} size={18} className="sm:hidden" />
              <Icon name={icon} size={22} className="hidden sm:block" />
            </span>
          )}
          <div>
            <h1 className="font-display text-2xl text-nootr-cream sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-1.5 max-w-xl text-xs text-nootr-muted sm:mt-2 sm:text-sm">{subtitle}</p>}
          </div>
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </div>
  );
}
