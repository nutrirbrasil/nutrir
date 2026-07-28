"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { SkeletonPage } from "@/components/Skeleton";

/**
 * Envolve páginas que exigem login. Enquanto a sessão carrega mostra um
 * placeholder; sem sessão, redireciona para /login. Passa o access_token para
 * o children via render prop, já que toda chamada ao backend precisa dele.
 */
export function RequireAuth({ children }: { children: (token: string) => React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  if (loading) {
    return <SkeletonPage cards={2} />;
  }
  if (!session) {
    return <p className="text-sm text-nootr-muted">Redirecionando para o login…</p>;
  }
  return <>{children(session.access_token)}</>;
}
