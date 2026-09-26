import { NextResponse } from "next/server";
import { cpfValidationMessage } from "@/lib/br-fields";
import { formatPartnerApplicationTelegramMessage, sendTelegramMessage } from "@/lib/telegram";

interface ApplyBody {
  name?: string;
  address?: string;
  cpf?: string;
  email?: string;
  instagram?: string;
}

export async function POST(request: Request) {
  let body: ApplyBody;
  try {
    body = (await request.json()) as ApplyBody;
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const address = body.address?.trim() ?? "";
  const cpf = body.cpf?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const instagram = body.instagram?.trim() ?? "";

  if (!name || name.length < 3) {
    return NextResponse.json({ error: "Informe seu nome completo." }, { status: 400 });
  }
  if (!address || address.length < 5) {
    return NextResponse.json({ error: "Informe seu endereço." }, { status: 400 });
  }
  const cpfErr = cpfValidationMessage(cpf);
  if (cpfErr) {
    return NextResponse.json({ error: cpfErr }, { status: 400 });
  }
  if (!email || !email.includes("@") || !email.includes(".")) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  if (!instagram) {
    return NextResponse.json({ error: "Informe o @ do seu Instagram." }, { status: 400 });
  }

  const message = formatPartnerApplicationTelegramMessage({ name, address, cpf, email, instagram });
  const notified = await sendTelegramMessage(message);

  return NextResponse.json({ ok: true, notified });
}
