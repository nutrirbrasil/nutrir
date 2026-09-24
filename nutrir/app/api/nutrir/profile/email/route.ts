import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/session-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

/**
 * Adiciona e-mail a uma conta que ainda não tem um (ex.: criada por telefone),
 * já confirmado (sem link/código) — usa a Admin API do Supabase, que aceita
 * marcar o e-mail como confirmado na hora. Só funciona enquanto a conta ainda
 * não tem e-mail: depois de adicionado, não dá pra trocar por aqui.
 */
export async function POST(request: Request) {
  const user = await verifyUser(request);
  if (!user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  if (user.email) {
    return NextResponse.json(
      { error: "Esta conta já tem um e-mail cadastrado." },
      { status: 400 }
    );
  }

  let body: { email?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Serviço indisponível no momento." }, { status: 503 });
  }

  const { error } = await db.auth.admin.updateUserById(user.id, {
    email,
    email_confirm: true,
  });

  if (error) {
    const msg = error.message.toLowerCase().includes("already been registered")
      ? "Este e-mail já está em uso por outra conta."
      : "Não foi possível adicionar o e-mail.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ email });
}
