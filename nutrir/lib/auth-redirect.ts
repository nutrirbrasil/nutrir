export type AuthCallbackFlow = "signup" | "recovery";

export function getAuthCallbackUrl(flow: AuthCallbackFlow): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/auth/callback?flow=${flow}`;
}

export function parseAuthHashError(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  if (!params.get("error")) return null;
  const description = params.get("error_description");
  if (description) {
    try {
      return decodeURIComponent(description.replace(/\+/g, " "));
    } catch {
      return description;
    }
  }
  return params.get("error");
}

export function hasAuthHash(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash;
  return (
    hash.includes("access_token=") ||
    hash.includes("error=") ||
    hash.includes("type=signup") ||
    hash.includes("type=recovery")
  );
}

export function clearAuthHash(): void {
  if (typeof window === "undefined") return;
  window.history.replaceState({}, "", window.location.pathname + window.location.search);
}
