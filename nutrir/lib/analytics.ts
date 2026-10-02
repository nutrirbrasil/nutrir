import posthog from "posthog-js";

/** Envia um evento pro PostHog. Vira no-op sem NEXT_PUBLIC_POSTHOG_TOKEN ou no servidor. */
export function track(event: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_TOKEN) return;
  try {
    posthog.capture(event, props);
  } catch {
    // métrica nunca pode quebrar o site
  }
}

export function identifyUser(id: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_TOKEN) return;
  try {
    posthog.identify(id, props);
  } catch {
    // ignore
  }
}

export function resetAnalytics(): void {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_TOKEN) return;
  try {
    posthog.reset();
  } catch {
    // ignore
  }
}
