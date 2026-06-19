"use client";

import { useEffect } from "react";
import { hasAuthHash } from "@/lib/auth-redirect";

/** Encaminha tokens/erros do Supabase na URL (#...) para /auth/callback. */
export function AuthHashRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname === "/auth/callback") return;
    if (!hasAuthHash()) return;

    const target = `/auth/callback${window.location.search}${window.location.hash}`;
    window.location.replace(target);
  }, []);

  return null;
}
