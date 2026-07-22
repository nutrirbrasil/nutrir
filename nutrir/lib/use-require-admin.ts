"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useProfile } from "./profile-context";

/** Mesmo e-mail checado no servidor (lib/session-auth.ts) — aqui é só pra esconder a tela mais cedo. */
const ADMIN_EMAIL = "contatonutrirbrasil@gmail.com";

export function useRequireAdmin() {
  const router = useRouter();
  const { isLoggedIn, authLoading, session } = useProfile();

  const isAdmin = useMemo(
    () => session?.user.email?.trim().toLowerCase() === ADMIN_EMAIL,
    [session?.user.email]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn || !isAdmin) router.replace("/perfil");
  }, [authLoading, isLoggedIn, isAdmin, router]);

  return { ready: !authLoading && isLoggedIn && isAdmin, session };
}
