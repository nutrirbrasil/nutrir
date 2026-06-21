/** Incremente ao trocar imagens para forçar atualização no navegador. */
export const IMAGE_VERSION = "2";
/** Só o logo do hero — incremente quando trocar logo.png */
export const LOGO_VERSION = "3";

const FILES = {
  hero: "1.png",
  about: "3 com fundo.png",
  profile: "foto perfil.png",
  icon: "p.png",
  logo: "logo.png",
} as const;

function assetUrl(file: string, version: string = IMAGE_VERSION): string {
  const encoded = file
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `/${encoded}?v=${version}`;
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

export function iconImageUrl(): string {
  return assetUrl(FILES.icon);
}

export function logoImageUrl(): string {
  return assetUrl(FILES.logo, LOGO_VERSION);
}
