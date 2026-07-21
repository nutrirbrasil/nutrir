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

  async function handleGoogleLogin() {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dieta` },
    });
    if (error) setError(error.message);
  }

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

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="btn-secondary mt-8 flex w-full items-center justify-center gap-2 py-3"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.27-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
        </svg>
        Entrar com Google
      </button>

      <div className="my-6 flex items-center gap-3 text-xs text-nootr-faint">
        <div className="h-px flex-1 bg-nootr-line" />
        ou
        <div className="h-px flex-1 bg-nootr-line" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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
