/** Gera payload Pix copia e cola (EMV BR Code) com valor fixo. */

export function getPixKey(): string {
  return process.env.PIX_KEY?.trim() ?? "";
}

export function getPixReceiverName(): string {
  return process.env.PIX_RECEIVER_NAME?.trim() ?? "Nutrir Picarras";
}

export function getPixCity(): string {
  return process.env.PIX_CITY?.trim() ?? "Balneario Picarras";
}

export function isPixConfigured(): boolean {
  return Boolean(getPixKey());
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
  const amount = (input.amountCents / 100).toFixed(2);
  const merchantAccount =
    emvField("00", "BR.GOV.BCB.PIX") + emvField("01", input.pixKey.trim());

  const additionalData = emvField("05", sanitizeTxid(input.orderId));

  const payloadWithoutCrc = [
    emvField("00", "01"),
    emvField("26", merchantAccount),
    emvField("52", "0000"),
    emvField("53", "986"),
    emvField("54", amount),
    emvField("58", "BR"),
    emvField("59", input.receiverName.trim().slice(0, 25)),
    emvField("60", input.city.trim().slice(0, 15)),
    emvField("62", additionalData),
  ].join("");

  const withCrcPrefix = `${payloadWithoutCrc}6304`;
  return withCrcPrefix + crc16Ccitt(withCrcPrefix);
}
