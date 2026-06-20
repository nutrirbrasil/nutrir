const STORAGE_KEY = "nutrir-auth-next";

const ALLOWED_PREFIXES = ["/agendar", "/checkout/"];

export function sanitizeAuthNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.startsWith("/auth/") || path.startsWith("/perfil")) return null;
  if (!ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix))) {
    return null;
  }
  return path;
}

export function rememberAuthNext(next: string | null): void {
  if (typeof window === "undefined") return;
  const safe = sanitizeAuthNext(next);
  if (safe) sessionStorage.setItem(STORAGE_KEY, safe);
}

export function peekAuthNext(): string | null {
  if (typeof window === "undefined") return null;
  return sanitizeAuthNext(sessionStorage.getItem(STORAGE_KEY));
}

export function consumeAuthNext(): string | null {
  if (typeof window === "undefined") return null;
  const safe = peekAuthNext();
  if (safe) sessionStorage.removeItem(STORAGE_KEY);
  return safe;
}

export function buildPerfilUrl(next?: string | null): string {
  const safe = sanitizeAuthNext(next);
  return safe ? `/perfil?next=${encodeURIComponent(safe)}` : "/perfil";
}
