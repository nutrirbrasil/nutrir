"use client";

import { useState } from "react";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Sem permissão de clipboard — nada a fazer, o link já aparece na tela.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="mt-2 w-full rounded-lg border border-nutrir-emerald/30 px-3 py-1.5 text-xs font-bold text-nutrir-emerald transition hover:bg-nutrir-emerald/5"
    >
      {copied ? "Link copiado!" : "Copiar link da avaliação"}
    </button>
  );
}
