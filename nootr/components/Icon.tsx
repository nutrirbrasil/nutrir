import type { SVGProps } from "react";

/**
 * Ícones de traço fino (line icons) compartilhados pelo app, coerentes com o
 * estilo das opções de "Vamos começar" e dos cabeçalhos de seção. Todos usam
 * currentColor, então herdam a cor do container (ex: .icon-badge). Tamanho
 * padrão 20px; passe width/height pra ajustar.
 */
export type IconName =
  | "user"
  | "crown"
  | "flame"
  | "pie"
  | "heart"
  | "sliders"
  | "swap"
  | "chef"
  | "barcode"
  | "calendar"
  | "sparkle"
  | "globe"
  | "leaf"
  | "handshake"
  | "lock";

const PATHS: Record<IconName, React.ReactNode> = {
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
    </>
  ),
  crown: (
    <>
      <path d="M4 9l3.2 2.2L12 5l4.8 6.2L20 9l-1.6 9.5H5.6z" />
      <path d="M5.6 18.5h12.8" />
    </>
  ),
  flame: (
    <path d="M12 3c2.2 3.2 5.5 4.8 5.5 9a5.5 5.5 0 0 1-11 0c0-1.9.9-3.3 2.3-4.6.3 1.2 1 2 2 2.4C10.8 6.8 10.7 5 12 3z" />
  ),
  pie: (
    <>
      <path d="M12 3a9 9 0 1 0 9 9" />
      <path d="M12 3v9h9a9 9 0 0 0-9-9z" />
    </>
  ),
  heart: (
    <path d="M12 20s-6.6-4.2-6.6-9A3.4 3.4 0 0 1 12 7.3 3.4 3.4 0 0 1 18.6 11c0 4.8-6.6 9-6.6 9z" />
  ),
  sliders: (
    <>
      <path d="M4 7h9M18 7h2M4 17h2M11 17h9" />
      <circle cx="15.5" cy="7" r="2" />
      <circle cx="8.5" cy="17" r="2" />
    </>
  ),
  swap: (
    <>
      <path d="M4 8h13l-3.2-3.2M20 16H7l3.2 3.2" />
    </>
  ),
  chef: (
    <>
      <path d="M7 14v5h10v-5" />
      <path d="M7 14a4 4 0 0 1-1-7.85A4 4 0 0 1 13 4a4 4 0 0 1 5 2.15A4 4 0 0 1 17 14z" />
    </>
  ),
  barcode: <path d="M4 6v12M7.5 6v12M11 6v9M14.5 6v12M18 6v9M20.5 6v12" />,
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 9.5h16M8.5 3v4M15.5 3v4" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z" />
      <path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.4 3.8 5.6 3.8 9S14.5 18.6 12 21c-2.5-2.4-3.8-5.6-3.8-9S9.5 5.4 12 3z" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 4C10 4 4 9 4 17c0 1.5.5 3 .5 3s7-1 11-5 4.5-11 4.5-11z" />
      <path d="M4.5 20C7 14 12 10 18 8" />
    </>
  ),
  handshake: (
    <>
      <path d="M8 12l2.5 2.5a1.5 1.5 0 0 0 2.1 0L18 9" />
      <path d="M3 8l3-2 6 2 6-2 3 2v6l-3 2-2-2M6 6v8" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  ...props
}: { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
