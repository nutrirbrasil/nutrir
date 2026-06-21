/** Incremente ao trocar logo/favicon para forçar atualização no navegador. */
export const LOGO_VERSION = "2";

export function logoUrl(): string {
  return `/logo.png?v=${LOGO_VERSION}`;
}
