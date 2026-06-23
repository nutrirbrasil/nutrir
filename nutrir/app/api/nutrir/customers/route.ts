import { NextResponse } from "next/server";
import { getCustomerByEmail, getCustomerByPhone, normalizePhone, upsertCustomer } from "@/lib/supabase-db";
import { cpfValidationMessage, phoneValidationMessage } from "@/lib/br-fields";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");
  const email = searchParams.get("email");

  if (email?.trim()) {
    const customer = await getCustomerByEmail(email);
    return NextResponse.json({ customer });
  }

  if (phone?.trim()) {
    const customer = await getCustomerByPhone(phone);
    return NextResponse.json({ customer });
  }

  return NextResponse.json({ error: "Informe o telefone ou o e-mail." }, { status: 400 });
}

export async function PUT(request: Request) {
  let body: {
    phone?: string;
    whatsapp?: string;
    name?: string;
    email?: string;
    cpf?: string;
    address?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  if (!body.phone?.trim()) {
    return NextResponse.json({ error: "Informe o telefone." }, { status: 400 });
  }

  const phoneErr = phoneValidationMessage(body.phone);
  if (phoneErr) {
    return NextResponse.json({ error: phoneErr }, { status: 400 });
  }

  if (body.cpf?.trim()) {
    const cpfErr = cpfValidationMessage(body.cpf);
    if (cpfErr) {
      return NextResponse.json({ error: cpfErr }, { status: 400 });
    }
  }

  const customer = await upsertCustomer({
    phone: body.phone,
    whatsapp: body.whatsapp ?? body.phone,
    name: body.name,
    email: body.email,
    cpf: body.cpf,
    address: body.address,
  });

  if (!customer) {
    return NextResponse.json(
      { error: "Não foi possível salvar os dados. Verifique Supabase." },
      { status: 503 }
    );
  }

  return NextResponse.json({ customer });
}

export async function POST(request: Request) {
  return PUT(request);
}
