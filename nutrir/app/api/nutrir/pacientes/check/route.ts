import { NextResponse } from "next/server";
import { cpfValidationMessage } from "@/lib/br-fields";
import { findPacienteByCpf } from "@/lib/supabase-db";

export async function GET(request: Request) {
  const cpf = new URL(request.url).searchParams.get("cpf");
  if (!cpf?.trim()) {
    return NextResponse.json({ error: "Informe o CPF." }, { status: 400 });
  }

  const cpfErr = cpfValidationMessage(cpf);
  if (cpfErr) {
    return NextResponse.json({ isPatient: false });
  }

  const paciente = await findPacienteByCpf(cpf);
  return NextResponse.json({
    isPatient: !!paciente,
    nome: paciente?.nome ?? undefined,
  });
}
