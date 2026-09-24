import { normalizePhoneStorage, phoneValidationMessage } from "./br-fields";

export type AuthCredential = { type: "email"; email: string } | { type: "phone"; phone: string };

export interface ResolvedAuthIdentifier {
  credential: AuthCredential | null;
  error: string | null;
}

/** Aceita e-mail ou telefone no mesmo campo de login/cadastro (Supabase Auth suporta os dois nativamente). */
export function resolveAuthIdentifier(raw: string): ResolvedAuthIdentifier {
  const trimmed = raw.trim();

  if (trimmed.includes("@")) {
    return { credential: { type: "email", email: trimmed.toLowerCase() }, error: null };
  }

  if (phoneValidationMessage(trimmed)) {
    return { credential: null, error: "Informe um e-mail válido ou um telefone com DDD." };
  }

  // normalizePhoneStorage devolve "55DDDNNNNNNNNN", Supabase exige E.164 com "+".
  return { credential: { type: "phone", phone: `+${normalizePhoneStorage(trimmed)}` }, error: null };
}
