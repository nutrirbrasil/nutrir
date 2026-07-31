import { NextResponse } from "next/server";
import { verifyUserEmail } from "@/lib/session-auth";
import { getCustomerByEmail } from "@/lib/supabase-db";
import { createCustomerAddress, listCustomerAddresses } from "@/lib/customer-addresses";
import { isBairroDeliverable } from "@/lib/delivery-fees";
import type { CustomerAddressInput } from "@/lib/types";

const MAX_LABEL_LENGTH = 30;

export async function GET(request: Request) {
  const email = await verifyUserEmail(request);
  if (!email) {
    return NextResponse.json({ error: "Faça login para ver seus endereços." }, { status: 401 });
  }

  const customer = await getCustomerByEmail(email);
  if (!customer) {
    return NextResponse.json({ addresses: [] });
  }

  const addresses = await listCustomerAddresses(customer.id);
  return NextResponse.json({ addresses });
}

export async function POST(request: Request) {
  const email = await verifyUserEmail(request);
  if (!email) {
    return NextResponse.json({ error: "Faça login para salvar um endereço." }, { status: 401 });
  }

  let body: CustomerAddressInput;
  try {
    body = (await request.json()) as CustomerAddressInput;
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  if (!body.label?.trim() || body.label.trim().length > MAX_LABEL_LENGTH) {
    return NextResponse.json(
      { error: `Informe um título para o endereço (até ${MAX_LABEL_LENGTH} caracteres).` },
      { status: 400 }
    );
  }

  if (!body.bairro_id || !isBairroDeliverable(body.bairro_id)) {
    return NextResponse.json(
      { error: "Selecione um bairro dentro da área de entrega." },
      { status: 400 }
    );
  }

  if (!body.street?.trim() || !body.number?.trim()) {
    return NextResponse.json({ error: "Informe rua e número." }, { status: 400 });
  }

  const customer = await getCustomerByEmail(email);
  if (!customer) {
    return NextResponse.json(
      { error: "Complete seus dados no perfil antes de salvar um endereço." },
      { status: 404 }
    );
  }

  const { address, error } = await createCustomerAddress(customer.id, body);
  if (!address) {
    return NextResponse.json({ error: error ?? "Não foi possível salvar o endereço." }, { status: 400 });
  }

  return NextResponse.json({ address });
}
