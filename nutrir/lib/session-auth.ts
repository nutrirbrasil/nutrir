import { getSupabaseAdmin } from "./supabase-server";

const ADMIN_EMAIL = (process.env.NUTRIR_ADMIN_EMAIL ?? "contatonutrirbrasil@gmail.com")
  .trim()
  .toLowerCase();

/**
 * Valida o token de sessão enviado pelo cliente (Authorization: Bearer <token>)
 * e retorna o id + e-mail (se houver) do usuário autenticado, ou null se o
 * token for ausente/inválido. Ao contrário de verifyUserEmail, funciona
 * mesmo pra contas criadas por telefone (sem e-mail ainda).
 */
export async function verifyUser(
  request: Request
): Promise<{ id: string; email: string | null; phone: string | null } | null> {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) return null;

  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email?.trim().toLowerCase() ?? null,
    phone: data.user.phone?.trim() || null,
  };
}

/**
 * Valida o token de sessão enviado pelo cliente (Authorization: Bearer <token>)
 * e retorna o e-mail verificado, ou null se o token for ausente/inválido.
 * Nunca confiar num e-mail/CPF enviado solto no corpo da requisição para
 * decisões sensíveis (admin, saldo de pontos) — sempre passar por aqui.
 */
export async function verifyUserEmail(request: Request): Promise<string | null> {
  const user = await verifyUser(request);
  return user?.email ?? null;
}

export async function verifyAdminRequest(request: Request): Promise<boolean> {
  const email = await verifyUserEmail(request);
  return email === ADMIN_EMAIL;
}
