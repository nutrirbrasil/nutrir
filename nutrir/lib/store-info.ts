export const NUTRIR_STORE_ADDRESS =
  "Rua Nossa Senhora da Paz, 209, Casa 2 - Centro, Balneário Piçarras";

/** Retirada é sempre na loja. */
export function resolvePickupAddress(): string {
  return NUTRIR_STORE_ADDRESS;
}
