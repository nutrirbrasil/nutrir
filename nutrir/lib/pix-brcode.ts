/** Gera payload Pix copia e cola (EMV BR Code) com valor fixo. */

export function getPixKey(): string {
  return normalizePixKey(process.env.PIX_KEY?.trim() ?? "");
}

export function getPixReceiverName(): string {
  return formatPixText(process.env.PIX_RECEIVER_NAME?.trim() ?? "Nutrir Picarras", 25);
}

export function getPixCity(): string {
  return formatPixText(process.env.PIX_CITY?.trim() ?? "Balneario Picarras", 15);
}

export function isPixConfigured(): boolean {
  return Boolean(process.env.PIX_KEY?.trim());
}

/** Remove acentos e caracteres inválidos para campos 59/60 do BR Code. */
export function formatPixText(value: string, maxLength: number): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s*.-]/g, "")
    .trim()
    .slice(0, maxLength);
}

function isValidCpf(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === Number(digits[10]);
}

/**
 * Formata a chave conforme o Manual BR Code / DICT.
 * Telefone: +55DDD9XXXXXXXX (ex.: +5553999659022)
 * CPF/CNPJ: só dígitos
 */
export function normalizePixKey(raw: string): string {
  const key = raw.trim();
  if (!key) return key;

  if (key.includes("@")) return key.toLowerCase();

  const uuidLike =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
  if (uuidLike) return key.toLowerCase();

  if (key.startsWith("+")) {
    const digits = key.replace(/\D/g, "");
    return digits ? `+${digits}` : key;
  }

  const digits = key.replace(/\D/g, "");

  if (digits.length === 14) return digits;

  if (digits.length === 11) {
    if (isValidCpf(digits)) return digits;
    return `+55${digits}`;
  }

  if (digits.length === 10) return `+55${digits}`;

  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;

  return key;
}

function crc16Ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function emvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function sanitizeTxid(orderId: string): string {
  const raw = orderId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 25);
  return raw || "***";
}

export function buildPixCopiaECola(input: {
  pixKey: string;
  receiverName: string;
  city: string;
  amountCents: number;
  orderId: string;
}): string {
  const pixKey = normalizePixKey(input.pixKey);
  const amount = (input.amountCents / 100).toFixed(2);
  const merchantAccount =
    emvField("00", "BR.GOV.BCB.PIX") + emvField("01", pixKey);

  const additionalData = emvField("05", sanitizeTxid(input.orderId));

  const payloadWithoutCrc = [
    emvField("00", "01"),
    emvField("26", merchantAccount),
    emvField("52", "0000"),
    emvField("53", "986"),
    emvField("54", amount),
    emvField("58", "BR"),
    emvField("59", formatPixText(input.receiverName, 25)),
    emvField("60", formatPixText(input.city, 15)),
    emvField("62", additionalData),
  ].join("");

  const withCrcPrefix = `${payloadWithoutCrc}6304`;
  return withCrcPrefix + crc16Ccitt(withCrcPrefix);
}
