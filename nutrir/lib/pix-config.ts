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
