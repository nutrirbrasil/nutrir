/** Incremente ao trocar imagens para forçar atualização no navegador. */
export const IMAGE_VERSION = "1";

const FILES = {
  hero: "1.png",
  about: "3 com fundo.png",
  profile: "foto perfil.png",
} as const;

function assetUrl(file: string): string {
  const encoded = file
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `/${encoded}?v=${IMAGE_VERSION}`;
}

export function heroImageUrl(): string {
  return assetUrl(FILES.hero);
}

export function aboutImageUrl(): string {
  return assetUrl(FILES.about);
}

export function profileImageUrl(): string {
  return assetUrl(FILES.profile);
}
