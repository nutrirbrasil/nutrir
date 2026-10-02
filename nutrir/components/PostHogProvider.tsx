"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHReactProvider } from "posthog-js/react";
import { Suspense, useEffect, useState } from "react";
import { PostHogPageView } from "@/components/PostHogPageView";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_TOKEN;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
    if (!key) {
      setReady(true);
      return;
    }
    // Desenvolvimento local não entra nas métricas.
    const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    if (isLocal) {
      setReady(true);
      return;
    }
    posthog.init(key, {
      api_host: host,
      capture_pageview: false,
      capture_pageleave: true,
      // Gravação de tela: nada digitado (CPF, telefone, senha, endereço) é gravado.
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "[data-ph-mask]",
      },
    });
    // Abrir qualquer página com ?ignorar-metricas=1 desliga a coleta neste navegador
    // (para equipe/dono); ?ignorar-metricas=0 volta a coletar.
    try {
      const ignore = new URLSearchParams(window.location.search).get("ignorar-metricas");
      if (ignore === "1") posthog.opt_out_capturing();
      else if (ignore === "0") posthog.opt_in_capturing();
    } catch {
      // ignore
    }
    try {
      const url = new URL(window.location.href);
      const params = url.searchParams;
      const utm_source = params.get("utm_source");
      const utm_medium = params.get("utm_medium");
      const utm_campaign = params.get("utm_campaign");
      const utm_content = params.get("utm_content");
      const utm_term = params.get("utm_term");
      const referrer = document.referrer || null;
      posthog.register_once(
        {
          initial_referrer: referrer,
          initial_landing_url: url.toString(),
          initial_utm_source: utm_source,
          initial_utm_medium: utm_medium,
          initial_utm_campaign: utm_campaign,
          initial_utm_content: utm_content,
          initial_utm_term: utm_term,
        },
        "initial_tracking_set",
      );
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  if (!ready) return <>{children}</>;

  if (!process.env.NEXT_PUBLIC_POSTHOG_TOKEN || !posthog.__loaded) {
    return <>{children}</>;
  }

  return (
    <PHReactProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHReactProvider>
  );
}
