import { FiInstagram } from "react-icons/fi";

const INSTAGRAM_URL = "https://www.instagram.com/nutrirpicarras";

/** Faixa fina acima do cabeçalho. Altura fixa (--bar-h no layout) pra home e main calcularem o vão da tela. */
export function InstagramBar() {
  return (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-[var(--bar-h)] items-center justify-center gap-2 overflow-hidden bg-nutrir-burgundy px-3 text-center font-display text-xs leading-tight text-nutrir-nude transition-colors hover:bg-nutrir-burgundy-dark md:text-sm"
    >
      <FiInstagram aria-hidden className="shrink-0 text-base" />
      <span>
        Nos siga no Instagram para acompanhar as novidades e ficar por dentro de promoções. Clique
        aqui: <strong className="font-bold underline underline-offset-2">@nutrirpicarras</strong>
      </span>
    </a>
  );
}
