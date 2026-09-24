import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/session-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { normalizePhoneStorage, phoneValidationMessage } from "@/lib/br-fields";

/**
 * Adiciona telefone a uma conta que ainda não tem um pra login (ex.: criada
 * por e-mail), já confirmado (sem SMS) — usa a Admin API do Supabase, que
 * aceita marcar o telefone como confirmado na hora. Só funciona enquanto a
 * conta ainda não tem telefone de login: depois de adicionado, não dá pra
 * trocar por aqui.
 */
export async function POST(request: Request) {
  const user = await verifyUser(request);
  if (!user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  if (user.phone) {
    return NextResponse.json(
      { error: "Esta conta já tem um telefone cadastrado para login." },
      { status: 400 }
    );
  }

  let body: { phone?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const phoneErr = phoneValidationMessage(body.phone ?? "");
  if (phoneErr) {
    return NextResponse.json({ error: phoneErr }, { status: 400 });
  }

  const phone = `+${normalizePhoneStorage(body.phone!)}`;

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Serviço indisponível no momento." }, { status: 503 });
  }

  const { error } = await db.auth.admin.updateUserById(user.id, {
    phone,
    phone_confirm: true,
  });

  if (error) {
    const msg = error.message.toLowerCase().includes("already been registered")
      ? "Este telefone já está em uso por outra conta."
      : "Não foi possível adicionar o telefone.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ phone });
}
