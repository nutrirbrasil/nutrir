import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";

/**
 * Estado vazio que ensina o próximo passo, em vez de só constatar que a lista
 * está vazia ("Nenhuma receita salva ainda."). Quem chega numa tela vazia é
 * quase sempre alguém no primeiro uso, então é justamente onde vale explicar
 * o que a funcionalidade faz e como começar.
 *
 * `action` vira um botão (link interno) quando há um próximo passo claro;
 * quando o preenchimento acontece em outro fluxo (ex: receitas nascem do
 * "Descrever com IA"), fica só a explicação.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IconName;
  title: string;
  description: ReactNode;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-nootr-line px-6 py-10 text-center">
      <span className="icon-badge-lg mb-4">
        <Icon name={icon} size={22} />
      </span>
      <p className="text-sm font-semibold text-nootr-cream">{title}</p>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-nootr-muted">{description}</p>
      {action && (
        <Link href={action.href} className="btn-secondary mt-5 text-xs">
          {action.label}
        </Link>
      )}
    </div>
  );
}
