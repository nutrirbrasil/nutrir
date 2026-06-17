"use client";

import { useState } from "react";
import Link from "next/link";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useProfile, SOCIAL_LOGIN_HINT } from "@/lib/profile-context";

export function ProfilePage() {
  const { isLoggedIn, profile, login, register, logout, updateProfile, socialLoginHint } =
    useProfile();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "register" && password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password);
    } catch {
      setError("Não foi possível concluir. Tente novamente.");
    }
  }

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (isLoggedIn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <h1 className="section-title text-center">Meu perfil</h1>
        <p className="mt-2 text-center text-sm text-nutrir-emerald/70">
          Complete seus dados para agilizar a retirada.
        </p>

        <form onSubmit={handleProfileSave} className="card mt-8 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nome</label>
            <input
              required
              className="input-field"
              value={profile.name}
              onChange={(e) => updateProfile({ name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Telefone</label>
            <input
              required
              className="input-field"
              value={profile.phone}
              onChange={(e) => updateProfile({ phone: e.target.value })}
              placeholder="(47) 99999-9999"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">CPF</label>
            <input
              required
              className="input-field"
              value={profile.cpf}
              onChange={(e) => updateProfile({ cpf: e.target.value })}
              placeholder="000.000.000-00"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">E-mail</label>
            <input
              required
              type="email"
              className="input-field"
              value={profile.email}
              onChange={(e) => updateProfile({ email: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Endereço</label>
            <input
              required
              className="input-field"
              value={profile.address}
              onChange={(e) => updateProfile({ address: e.target.value })}
              placeholder="Rua, número, bairro"
            />
          </div>

          {saved && (
            <p className="text-sm font-medium text-nutrir-emerald">Dados salvos com sucesso!</p>
          )}

          <button type="submit" className="btn-primary w-full">
            Salvar dados
          </button>
          <button type="button" onClick={logout} className="btn-secondary w-full">
            Sair da conta
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-center font-display text-2xl font-bold uppercase tracking-tight text-nutrir-emerald md:text-3xl">
        Crie sua conta e vamos às compras
      </h1>

      <p className="mt-6 text-center text-sm text-nutrir-emerald/70">
        Use sua rede social para cadastrar sua conta
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "Facebook", bg: "bg-[#1877F2]", icon: "f", title: socialLoginHint },
          { label: "Google", bg: "bg-nutrir-cream border border-gray-200", icon: "G", title: socialLoginHint },
          { label: "Apple", bg: "bg-black", icon: "", title: socialLoginHint },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            title={s.title}
            onClick={() => setError(SOCIAL_LOGIN_HINT)}
            className={`flex h-12 items-center justify-center rounded-lg text-lg font-bold opacity-60 ${s.bg} ${
              s.label === "Google" ? "text-gray-700" : "text-white"
            }`}
          >
            {s.icon || ""}
          </button>
        ))}
      </div>

      <p className="mt-2 text-center text-xs text-nutrir-emerald/50">
        Disponível quando o site estiver online com login social configurado.
      </p>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-nutrir-nude-dark" />
        <span className="text-sm text-nutrir-emerald/50">ou</span>
        <div className="h-px flex-1 bg-nutrir-nude-dark" />
      </div>

      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <input
            required
            type="email"
            placeholder="E-mail"
            className="input-field w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="relative">
          <input
            required
            type={showPass ? "text" : "password"}
            placeholder="Senha"
            className="input-field w-full pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-nutrir-emerald/40"
          >
            {showPass ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
        {mode === "register" && (
          <div className="relative">
            <input
              required
              type={showPass ? "text" : "password"}
              placeholder="Confirmar senha"
              className="input-field w-full"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" className="btn-primary w-full py-3">
          {mode === "register" ? "Continuar" : "Entrar"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "register" ? "login" : "register");
          setError("");
        }}
        className="mt-4 w-full rounded-full border-2 border-nutrir-emerald py-3 text-sm font-semibold text-nutrir-emerald transition hover:bg-nutrir-emerald/5"
      >
        {mode === "register" ? "Já tenho uma conta" : "Criar nova conta"}
      </button>

      <p className="mt-6 text-center text-sm text-nutrir-emerald/60">
        <Link href="/" className="font-medium text-nutrir-burgundy hover:underline">
          ← Voltar ao cardápio
        </Link>
      </p>
    </div>
  );
}
