"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAuthHash, parseAuthHashError } from "@/lib/auth-redirect";
import { consumeAuthNext } from "@/lib/auth-next";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function run() {
      const hashError = parseAuthHashError();
      if (hashError) {
        clearAuthHash();
        setErrorMsg(hashError);
        setStatus("error");
        return;
      }

      const supabase = getSupabaseBrowser();
      const code = searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setErrorMsg(error.message);
          setStatus("error");
          return;
        }
      }

      let session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        session = (await supabase.auth.getSession()).data.session;
      }

      clearAuthHash();

      if (!session) {
        setErrorMsg("Link inválido ou expirado. Solicite um novo e-mail.");
        setStatus("error");
        return;
      }

      const flow = searchParams.get("flow");
      if (flow === "recovery") {
        router.replace("/perfil/redefinir-senha");
      } else {
        const next = consumeAuthNext();
        router.replace(next ?? "/perfil");
      }
    }

    void run();
  }, [router, searchParams]);

  if (status === "error") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-nutrir-emerald">Link expirado</h1>
        <p className="mt-4 text-sm text-nutrir-emerald/80">{errorMsg}</p>
        <p className="mt-2 text-sm text-nutrir-emerald/60">
          Links de confirmação expiram rápido. Peça um novo e-mail e clique assim que receber.
        </p>
        <Link href="/perfil" className="btn-primary mt-8 inline-block">
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center text-nutrir-emerald/70">
      Confirmando login…
    </div>
  );
}
