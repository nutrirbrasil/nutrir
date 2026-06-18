/** CPF e telefone brasileiros — formatação, normalização e validação */

export function stripCpfDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function stripPhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 11);
}

export function formatCpf(value: string): string {
  const d = stripCpfDigits(value);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatPhoneBR(value: string): string {
  const d = stripPhoneDigits(value);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Exibe valor vindo do banco (só dígitos ou com DDI 55). */
export function formatCpfDisplay(value: string): string {
  return value ? formatCpf(value) : "";
}

export function formatPhoneDisplay(value: string): string {
  return value ? formatPhoneBR(value) : "";
}

export function normalizePhoneStorage(phone: string): string {
  const digits = stripPhoneDigits(phone);
  if (digits.length < 10) return digits;
  return `55${digits}`;
}

export function isValidCpf(cpf: string): boolean {
  const d = stripCpfDigits(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest >= 10) rest = 0;
  if (rest !== Number(d[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(d[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest >= 10) rest = 0;
  return rest === Number(d[10]);
}

export function isValidPhoneBR(phone: string): boolean {
  const d = stripPhoneDigits(phone);
  if (d.length !== 10 && d.length !== 11) return false;

  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;

  if (d.length === 11 && d[2] !== "9") return false;

  return true;
}

export function cpfValidationMessage(cpf: string): string | null {
  const d = stripCpfDigits(cpf);
  if (d.length === 0) return "Informe o CPF.";
  if (d.length !== 11) return "CPF deve ter 11 dígitos.";
  if (!isValidCpf(cpf)) return "CPF inválido. Verifique os números.";
  return null;
}

export function phoneValidationMessage(phone: string): string | null {
  const d = stripPhoneDigits(phone);
  if (d.length === 0) return "Informe o celular.";
  if (d.length < 10) return "Telefone incompleto.";
  if (!isValidPhoneBR(phone)) {
    if (d.length === 11 && d[2] !== "9") {
      return "Celular deve começar com 9 após o DDD.";
    }
    return "Telefone inválido. Use DDD + número.";
  }
  return null;
}
