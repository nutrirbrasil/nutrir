"use client";

import { useEffect, useState } from "react";
import { FiInstagram } from "react-icons/fi";

const INSTAGRAM_URL = "https://www.instagram.com/nutrirpicarras";
const ROTATION_MS = 5000;

const MESSAGES = [
  <>
    Nos siga no Instagram para acompanhar as novidades e ficar por dentro de promoções. Clique
    aqui: <strong className="font-bold underline underline-offset-2">@nutrirpicarras</strong>
  </>,
  <>
    Quer experimentar? Use o cupom{" "}
    <strong className="font-bold underline underline-offset-2">PRIMEIRACOMPRA</strong> e ganhe 10%
    de desconto em seu primeiro pedido.
  </>,
];

/** Faixa fina acima do cabeçalho. Altura fixa (--bar-h no layout) pra home e main calcularem o vão da tela. */
export function InstagramBar() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length);
    }, ROTATION_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-[var(--bar-h)] items-center justify-center gap-2 overflow-hidden bg-nutrir-burgundy px-3 text-center font-display text-xs leading-tight text-nutrir-nude transition-colors hover:bg-nutrir-burgundy-dark md:text-sm"
    >
      <FiInstagram aria-hidden className="shrink-0 text-base" />
      <span>{MESSAGES[index]}</span>
    </a>
  );
}
