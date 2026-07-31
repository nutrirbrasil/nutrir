import { NextResponse } from "next/server";
import { verifyUserEmail } from "@/lib/session-auth";
import { getCustomerByEmail } from "@/lib/supabase-db";
import { deleteCustomerAddress, updateCustomerAddress } from "@/lib/customer-addresses";
import { isBairroDeliverable } from "@/lib/delivery-fees";
import type { CustomerAddressInput } from "@/lib/types";

const MAX_LABEL_LENGTH = 30;

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const email = await verifyUserEmail(request);
  if (!email) {
    return NextResponse.json({ error: "Faça login para editar este endereço." }, { status: 401 });
  }

  let body: Partial<CustomerAddressInput>;
  try {
    body = (await request.json()) as Partial<CustomerAddressInput>;
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  if (body.label !== undefined && (!body.label.trim() || body.label.trim().length > MAX_LABEL_LENGTH)) {
    return NextResponse.json(
      { error: `Informe um título para o endereço (até ${MAX_LABEL_LENGTH} caracteres).` },
      { status: 400 }
    );
  }

  if (body.bairro_id !== undefined && !isBairroDeliverable(body.bairro_id)) {
    return NextResponse.json(
      { error: "Selecione um bairro dentro da área de entrega." },
      { status: 400 }
    );
  }

  if (body.street !== undefined && !body.street.trim()) {
    return NextResponse.json({ error: "Informe a rua." }, { status: 400 });
  }

  if (body.number !== undefined && !body.number.trim()) {
    return NextResponse.json({ error: "Informe o número." }, { status: 400 });
  }

  const customer = await getCustomerByEmail(email);
  if (!customer) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  const { address, error } = await updateCustomerAddress(params.id, customer.id, body);
  if (!address) {
    const status = error === "Endereço não encontrado." ? 404 : 400;
    return NextResponse.json({ error: error ?? "Não foi possível atualizar o endereço." }, { status });
  }

  return NextResponse.json({ address });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const email = await verifyUserEmail(request);
  if (!email) {
    return NextResponse.json({ error: "Faça login para remover este endereço." }, { status: 401 });
  }

  const customer = await getCustomerByEmail(email);
  if (!customer) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  const ok = await deleteCustomerAddress(params.id, customer.id);
  if (!ok) {
    return NextResponse.json({ error: "Endereço não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
