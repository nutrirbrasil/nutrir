import type { AuthError } from "@supabase/supabase-js";

export function mapAuthError(error: AuthError | Error): string {
  const msg = error.message.toLowerCase();

  if (msg.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (msg.includes("email not confirmed")) {
    return "Confirme seu e-mail com o código enviado antes de entrar.";
  }
  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return "Este e-mail já está cadastrado. Faça login ou recupere a senha.";
  }
  if (
    msg.includes("invalid otp") ||
    msg.includes("token has expired") ||
    msg.includes("otp_expired")
  ) {
    return "Código inválido ou expirado. Solicite um novo.";
  }
  if (msg.includes("password") && msg.includes("6")) {
    return "A senha deve ter pelo menos 6 caracteres.";
  }
  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }
  if (msg.includes("signup is disabled")) {
    return "Cadastro temporariamente indisponível.";
  }
  if (msg.includes("for security purposes") || msg.includes("only request this after")) {
    return "Aguarde alguns segundos antes de solicitar novamente.";
  }

  return error.message || "Não foi possível concluir. Tente novamente.";
}
