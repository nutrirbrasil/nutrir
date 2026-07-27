"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { MealReminders } from "@/components/MealReminders";
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
  // MealReminders não renderiza nada: fica aqui só pra rodar em qualquer tela
  // autenticada, já que o lembrete vale o dia todo, não só no Perfil.
  return (
    <>
      <MealReminders token={session.access_token} />
      {children(session.access_token)}
    </>
  );
}
