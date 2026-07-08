"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

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
    return <p className="text-sm text-gray-500">Carregando...</p>;
  }
  if (!session) {
    return <p className="text-sm text-gray-500">Redirecionando para o login...</p>;
  }
  return <>{children(session.access_token)}</>;
}
