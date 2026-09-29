"use client";

import { useEffect } from "react";

export function IfoodRedirect({ url }: { url: string }) {
  useEffect(() => {
    window.location.replace(url);
  }, [url]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-nutrir-ink/70">Redirecionando para o iFood...</p>
      <a href={url} className="btn-primary">
        Ir para o iFood
      </a>
    </div>
  );
}
