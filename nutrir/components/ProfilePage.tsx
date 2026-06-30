"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import {
  cpfValidationMessage,
  formatCpf,
  formatPhoneBR,
  phoneValidationMessage,
} from "@/lib/br-fields";
import { formatPrice } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import {
  fetchRecentOrdersForEmail,
  syncCustomerToServer,
  type SavedOrder,
} from "@/lib/order-history";
import { useProfile } from "@/lib/profile-context";
import {
  rememberAuthNext,
  consumeAuthNext,
  sanitizeAuthNext,
  clearAuthNext,
  resolveAuthNext,
} from "@/lib/auth-next";
import { PAYMENT_METHOD_SHORT_LABELS } from "@/lib/payment-labels";
import type { PaymentMethod } from "@/lib/types";
import { OrderDetailsModal } from "@/components/OrderDetailsModal";

const PAYMENT_LABELS = PAYMENT_METHOD_SHORT_LABELS;

type AuthStep = "form" | "verify" | "forgot" | "reset";

export function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { replaceItems } = useCart();
  const {
    isLoggedIn,
    authConfigured,
    authLoading,
    passwordRecovery,
    session,
    profile,
    isPatient,
    login,
    register,
    verifyEmail,
    resendVerification,
    requestPasswordReset,
    resendPasswordReset,
    verifyRecoveryAndResetPassword,
    completePasswordRecovery,
    changePassword,
    loginWithGoogle,
    logout,
    updateProfile,
  } = useProfile();

  const [mode, setMode] = useState<"login" | "register">("register");
  const [authStep, setAuthStep] = useState<AuthStep>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [recentOrders, setRecentOrders] = useState<SavedOrder[]>([]);
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  const [detailOrder, setDetailOrder] = useState<SavedOrder | null>(null);

  const [showChangePass, setShowChangePass] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passSaved, setPassSaved] = useState(false);

  function goToPendingNext() {
    const next =
      resolveAuthNext(searchParams.get("next")) ??
      (typeof window !== "undefined"
        ? sanitizeAuthNext(new URLSearchParams(window.location.search).get("next"))
        : null) ??
      consumeAuthNext();
    if (!next) return false;
    clearAuthNext();
    router.replace(next);
    return true;
  }

  useEffect(() => {
    const next = sanitizeAuthNext(searchParams.get("next"));
    if (next) rememberAuthNext(next);
  }, [searchParams]);

  useEffect(() => {
    if (authLoading || !isLoggedIn || passwordRecovery) return;
    if (authStep === "verify" || authStep === "forgot" || authStep === "reset") return;
    goToPendingNext();
  }, [isLoggedIn, authLoading, authStep, passwordRecovery, searchParams]);

  useEffect(() => {
    const accountEmail = (session?.user.email ?? profile.email).trim().toLowerCase();
    if (!isLoggedIn || !accountEmail) {
      setRecentOrders([]);
      return;
    }
    fetchRecentOrdersForEmail(accountEmail, 5).then(setRecentOrders);
  }, [session?.user.email, profile.email, isLoggedIn, saved]);

  useEffect(() => {
    setOrdersExpanded(false);
  }, [recentOrders]);

  function handleReorder(orderId: string) {
    const order = recentOrders.find((o) => o.id === orderId);
    if (!order) return;
    replaceItems(order.items.map((item) => ({ ...item })));
    router.push("/agendar");
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!authConfigured) {
      setError("Autenticação não configurada. Adicione as chaves do Supabase no .env.local.");
      return;
    }

    if (mode === "register" && password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
        setPassword("");
        goToPendingNext();
        return;
      }

      const { needsVerification } = await register(email, password);
      if (needsVerification) {
        setAuthStep("verify");
        setInfo(
          "Enviamos um link de confirmação para seu e-mail. Clique no link para ativar a conta."
        );
        setVerifyCode("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar com Google.");
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!verifyCode.trim()) {
      setError("Informe o código recebido por e-mail.");
      return;
    }

    setLoading(true);
    try {
      await verifyEmail(email, verifyCode);
      setAuthStep("form");
      setPassword("");
      setConfirm("");
      setVerifyCode("");
      setInfo("Conta confirmada! Você já está logado.");
      goToPendingNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authStep === "verify" && isLoggedIn) {
      setAuthStep("form");
      setInfo("E-mail confirmado! Você já está logado.");
    }
  }, [authStep, isLoggedIn]);

  async function handleResendVerificationEmail() {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await resendVerification(email);
      setInfo("Novo link enviado para seu e-mail. Clique assim que receber.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível reenviar o código.");
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const cpfErr = cpfValidationMessage(profile.cpf);
    if (cpfErr) {
      setError(cpfErr);
      return;
    }
    const phoneErr = phoneValidationMessage(profile.phone);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }

    const cpf = formatCpf(profile.cpf);
    const phone = formatPhoneBR(profile.phone);
    updateProfile({ cpf, phone });

    const ok = await syncCustomerToServer({
      phone,
      whatsapp: phone,
      name: profile.name,
      email: profile.email,
      cpf,
      address: profile.address,
    });
    if (!ok) {
      setError("Não foi possível salvar no servidor. Dados ficaram só neste aparelho.");
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("A confirmação da nova senha não confere.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowChangePass(false);
      setPassSaved(true);
      setTimeout(() => setPassSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível trocar a senha.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!authConfigured) {
      setError("Autenticação não configurada.");
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(email);
      setAuthStep("reset");
      setInfo(
        "Enviamos um link para seu e-mail. Clique no link para redefinir a senha."
      );
      setVerifyCode("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o e-mail.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetWithCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("A confirmação da nova senha não confere.");
      return;
    }
    if (!verifyCode.trim()) {
      setError("Informe o código recebido por e-mail.");
      return;
    }

    setLoading(true);
    try {
      await verifyRecoveryAndResetPassword(email, verifyCode, newPassword);
      setAuthStep("form");
      setMode("login");
      setVerifyCode("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPassword("");
      setInfo("Senha redefinida com sucesso!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível redefinir a senha.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecoveryLinkReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("A confirmação da nova senha não confere.");
      return;
    }

    setLoading(true);
    try {
      await completePasswordRecovery(newPassword);
      setNewPassword("");
      setConfirmNewPassword("");
      router.push("/perfil");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível redefinir a senha.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendResetCode() {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await resendPasswordReset(email);
      setInfo("Novo link enviado para seu e-mail.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível reenviar.");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-nutrir-emerald/70">
        Carregando…
      </div>
    );
  }

  if (passwordRecovery) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-center font-display text-2xl font-bold text-nutrir-emerald">
          Nova senha
        </h1>
        <p className="mt-3 text-center text-sm text-nutrir-emerald/70">
          Escolha uma nova senha para sua conta.
        </p>

        <form onSubmit={handleRecoveryLinkReset} className="mt-8 space-y-4">
          <input
            required
            type="password"
            placeholder="Nova senha"
            className="input-field w-full"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <input
            required
            type="password"
            placeholder="Confirmar nova senha"
            className="input-field w-full"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? "Salvando…" : "Salvar nova senha"}
          </button>
        </form>
      </div>
    );
  }

  if (authStep === "forgot") {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-center font-display text-2xl font-bold text-nutrir-emerald">
          Esqueci minha senha
        </h1>
        <p className="mt-3 text-center text-sm text-nutrir-emerald/70">
          Informe seu e-mail para receber o código de redefinição.
        </p>

        <form onSubmit={handleForgotPassword} className="mt-8 space-y-4">
          <input
            required
            type="email"
            placeholder="E-mail"
            className="input-field w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {info && <p className="text-sm text-nutrir-emerald">{info}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading || !authConfigured} className="btn-primary w-full py-3">
            {loading ? "Enviando…" : "Enviar código"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthStep("form");
              setError("");
              setInfo("");
            }}
            className="w-full text-sm text-nutrir-emerald/60 hover:text-nutrir-emerald"
          >
            ← Voltar ao login
          </button>
        </form>
      </div>
    );
  }

  if (authStep === "reset") {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-center font-display text-2xl font-bold text-nutrir-emerald">
          Redefinir senha
        </h1>
        <p className="mt-3 text-center text-sm text-nutrir-emerald/70">
          Digite o código enviado para <strong>{email}</strong> e escolha uma nova senha.
        </p>

        <form onSubmit={handleResetWithCode} className="mt-8 space-y-4">
          <input
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            placeholder="Código de verificação"
            className="input-field w-full text-center text-lg tracking-widest"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value.replace(/\s/g, ""))}
          />
          <input
            required
            type="password"
            placeholder="Nova senha"
            className="input-field w-full"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <input
            required
            type="password"
            placeholder="Confirmar nova senha"
            className="input-field w-full"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
          />

          {info && <p className="text-sm text-nutrir-emerald">{info}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? "Salvando…" : "Redefinir senha"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleResendResetCode}
            className="btn-secondary w-full py-3"
          >
            Reenviar código
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthStep("form");
              setVerifyCode("");
              setNewPassword("");
              setConfirmNewPassword("");
              setError("");
              setInfo("");
            }}
            className="w-full text-sm text-nutrir-emerald/60 hover:text-nutrir-emerald"
          >
            ← Voltar ao login
          </button>
        </form>
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <>
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="flex flex-col items-center gap-2">
          <h1 className="section-title text-center">Meu perfil</h1>
          {isPatient && (
            <span className="inline-flex items-center rounded-full bg-nutrir-burgundy px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
              Paciente VIP
            </span>
          )}
        </div>
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
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={15}
              className="input-field"
              value={profile.phone}
              onChange={(e) => updateProfile({ phone: formatPhoneBR(e.target.value) })}
              placeholder="(47) 99999-9999"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">CPF</label>
            <input
              required
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              maxLength={14}
              className="input-field"
              value={profile.cpf}
              onChange={(e) => updateProfile({ cpf: formatCpf(e.target.value) })}
              placeholder="000.000.000-00"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">E-mail</label>
            <input
              required
              type="email"
              className="input-field bg-nutrir-nude-dark/20"
              value={profile.email}
              readOnly
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
          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" className="btn-primary w-full">
            Salvar dados
          </button>
          <button type="button" onClick={() => logout()} className="btn-secondary w-full">
            Sair da conta
          </button>
        </form>

        <section className="card mt-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-nutrir-emerald">Senha</h2>
            {!showChangePass && (
              <button
                type="button"
                onClick={() => {
                  setShowChangePass(true);
                  setError("");
                }}
                className="text-sm font-bold text-nutrir-burgundy"
              >
                Trocar senha
              </button>
            )}
          </div>

          {passSaved && (
            <p className="text-sm font-medium text-nutrir-emerald">Senha alterada com sucesso!</p>
          )}

          {showChangePass && (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <input
                required
                type="password"
                placeholder="Senha atual"
                className="input-field w-full"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <input
                required
                type="password"
                placeholder="Nova senha"
                className="input-field w-full"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <input
                required
                type="password"
                placeholder="Confirmar nova senha"
                className="input-field w-full"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? "Salvando…" : "Salvar nova senha"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePass(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmNewPassword("");
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </section>

        {isLoggedIn && (session?.user.email ?? profile.email) && (
          <section className="card mt-8">
            <h2 className="font-display text-lg font-bold text-nutrir-emerald">Últimos pedidos</h2>
            {recentOrders.length === 0 ? (
              <p className="mt-3 text-sm text-nutrir-emerald/60">
                Sem histórico. Você ainda não realizou nenhum pedido.
              </p>
            ) : (
              <>
              <ul className="mt-4 space-y-4">
                {(ordersExpanded ? recentOrders : recentOrders.slice(0, 1)).map((order) => {
                  const date = new Date(order.created_at);
                  const dateStr = date.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  });
                  return (
                    <li
                      key={order.id}
                      className="rounded-xl border border-nutrir-nude-dark/50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-nutrir-emerald/60">{dateStr}</p>
                          <p className="mt-1 font-semibold text-nutrir-emerald">
                            {formatPrice(order.total_cents)}
                          </p>
                          <p className="text-xs text-nutrir-emerald/60">
                            {PAYMENT_LABELS[order.payment_method]}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleReorder(order.id)}
                          className="btn-secondary shrink-0 px-3 py-2 text-xs font-bold"
                        >
                          Pedir novamente
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDetailOrder(order)}
                        className="mt-3 text-sm font-semibold text-nutrir-emerald underline underline-offset-4 decoration-nutrir-emerald/40 hover:decoration-nutrir-burgundy"
                      >
                        Ver mais detalhes
                      </button>
                    </li>
                  );
                })}
              </ul>
              {recentOrders.length > 1 && (
                <button
                  type="button"
                  onClick={() => setOrdersExpanded((v) => !v)}
                  className="mt-4 w-full text-sm font-bold text-nutrir-burgundy hover:underline"
                >
                  {ordersExpanded ? "Ver menos" : "Ver mais"}
                </button>
              )}
              </>
            )}
          </section>
        )}
      </div>
      {detailOrder && (
        <OrderDetailsModal order={detailOrder} onClose={() => setDetailOrder(null)} />
      )}
      </>
    );
  }

  if (authStep === "verify") {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-center font-display text-2xl font-bold text-nutrir-emerald">
          Confirme seu e-mail
        </h1>
        <p className="mt-3 text-center text-sm text-nutrir-emerald/70">
          Enviamos um link para <strong>{email}</strong>. Abra o e-mail e clique em{" "}
          <strong>Confirm email address</strong> para ativar sua conta.
        </p>
        <p className="mt-2 text-center text-xs text-nutrir-emerald/55">
          O link expira em poucos minutos. Depois de clicar, você será logado automaticamente.
        </p>

        <div className="mt-8 space-y-4">
          {info && <p className="text-sm text-nutrir-emerald">{info}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            disabled={loading}
            onClick={handleResendVerificationEmail}
            className="btn-primary w-full py-3"
          >
            {loading ? "Enviando…" : "Reenviar e-mail"}
          </button>

          <details className="rounded-lg border border-nutrir-nude-dark/50 p-4 text-sm">
            <summary className="cursor-pointer font-medium text-nutrir-emerald">
              Recebeu um código numérico? (opcional)
            </summary>
            <form onSubmit={handleVerify} className="mt-3 space-y-3">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                placeholder="Código de 6 dígitos"
                className="input-field w-full text-center tracking-widest"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\s/g, ""))}
              />
              <button type="submit" disabled={loading || !verifyCode.trim()} className="btn-secondary w-full py-2.5">
                Confirmar com código
              </button>
            </form>
          </details>

          <button
            type="button"
            onClick={() => {
              setAuthStep("form");
              setVerifyCode("");
              setError("");
              setInfo("");
            }}
            className="w-full text-sm text-nutrir-emerald/60 hover:text-nutrir-emerald"
          >
            ← Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-center font-display text-2xl font-bold uppercase tracking-tight text-nutrir-emerald md:text-3xl">
        {mode === "register" ? "Crie sua conta e vamos às compras" : "Entrar na sua conta"}
      </h1>

      {!authConfigured && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Autenticação não configurada. Adicione{" "}
          <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
          <code className="text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no{" "}
          <code className="text-xs">.env.local</code>.
        </p>
      )}

      <p className="mt-6 text-center text-sm text-nutrir-emerald/70">
        Entre ou cadastre-se com sua conta Google
      </p>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="mt-4 flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-nutrir-cream text-sm font-semibold text-gray-700 transition hover:bg-white disabled:opacity-50"
      >
        <FcGoogle className="text-xl" aria-hidden />
        Continuar com Google
      </button>

      <p className="mt-3 text-center text-xs leading-relaxed text-nutrir-emerald/60">
        Ao continuar com Google, você declara estar de acordo com os{" "}
        <Link href="/termos-de-uso" className="font-medium text-nutrir-burgundy hover:underline">
          Termos de Uso
        </Link>{" "}
        e a{" "}
        <Link href="/politica-de-privacidade" className="font-medium text-nutrir-burgundy hover:underline">
          Política de Privacidade
        </Link>
        .
      </p>

      {!authConfigured && (
        <p className="mt-2 text-center text-xs text-nutrir-emerald/50">
          Configure Supabase e o provedor Google para ativar este botão.
        </p>
      )}

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

        {mode === "login" && (
          <div className="text-right">
            <button
              type="button"
              onClick={() => {
                setAuthStep("forgot");
                setError("");
                setInfo("");
              }}
              className="text-sm font-medium text-nutrir-burgundy hover:underline"
            >
              Esqueci minha senha
            </button>
          </div>
        )}

        {info && <p className="text-sm text-nutrir-emerald">{info}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {mode === "register" && (
          <p className="text-xs leading-relaxed text-nutrir-emerald/60">
            Ao criar sua conta, você declara estar de acordo com os{" "}
            <Link href="/termos-de-uso" className="font-medium text-nutrir-burgundy hover:underline">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link href="/politica-de-privacidade" className="font-medium text-nutrir-burgundy hover:underline">
              Política de Privacidade
            </Link>
            .
          </p>
        )}

        <button type="submit" disabled={loading || !authConfigured} className="btn-primary w-full py-3">
          {loading ? "Aguarde…" : mode === "register" ? "Criar conta" : "Entrar"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "register" ? "login" : "register");
          setError("");
          setInfo("");
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
