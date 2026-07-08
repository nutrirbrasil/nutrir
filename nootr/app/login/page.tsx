"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          router.push("/dieta");
        } else {
          setInfo("Conta criada. Confirme seu e-mail para entrar.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dieta");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center">
      <div className="divider-bordo mb-5" />
      <h1 className="font-display text-4xl text-nootr-cream">
        {mode === "signin" ? "Entrar" : "Criar conta"}
      </h1>
      <p className="mt-2 text-sm text-nootr-muted">
        {mode === "signin"
          ? "Acesse sua dieta e os ajustes do dia."
          : "Comece do zero: monte sua dieta e adapte quando precisar."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="label-caps">E-mail</label>
          <input
            type="email"
            required
            autoComplete="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
          />
        </div>
        <div>
          <label className="label-caps">Senha</label>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="mínimo 6 caracteres"
          />
        </div>

        {error && <p className="text-sm text-nootr-bordoSoft">{error}</p>}
        {info && <p className="text-sm text-emerald-400/90">{info}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? "Processando…" : mode === "signin" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError("");
          setInfo("");
        }}
        className="mt-6 text-sm text-nootr-muted transition-colors hover:text-nootr-bordoSoft"
      >
        {mode === "signin" ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}
      </button>

      <p className="mt-10 text-center text-[11px] leading-relaxed text-nootr-faint">
        Ao continuar, você concorda com os{" "}
        <Link href="/termos" className="underline decoration-nootr-bordo/50 hover:text-nootr-muted">
          Termos de uso
        </Link>{" "}
        e a{" "}
        <Link href="/privacidade" className="underline decoration-nootr-bordo/50 hover:text-nootr-muted">
          Política de privacidade
        </Link>
        .
      </p>
    </div>
  );
}
