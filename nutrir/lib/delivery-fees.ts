/**
 * Taxas de entrega por bairro. Fonte da verdade única do valor cobrado — o
 * servidor recalcula a taxa a partir do bairro_id, nunca aceita o valor vindo
 * do cliente (mesma regra de "preço no servidor" usada pro cardápio).
 */

export type MunicipioId = "balnearioPicarras" | "penha";

export const MUNICIPIO_LABELS: Record<MunicipioId, string> = {
  balnearioPicarras: "Balneário Piçarras",
  penha: "Penha",
};

export interface DeliveryBairroOption {
  bairroId: string;
  bairro: string;
  municipio: MunicipioId;
  valorCents: number | null;
  available: boolean;
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function bairroId(municipio: MunicipioId, bairro: string): string {
  return `${municipio}-${slugify(bairro)}`;
}

const TAXAS_ENTREGA: Record<MunicipioId, { bairro: string; valor: number }[]> = {
  balnearioPicarras: [
    { bairro: "Centro", valor: 5.99 },
    { bairro: "Itacolomi", valor: 9.99 },
    { bairro: "Santo Antônio", valor: 7.99 },
    { bairro: "Nossa Senhora da Paz", valor: 7.99 },
    { bairro: "Nossa Senhora da Conceição", valor: 7.99 },
  ],
  penha: [
    { bairro: "Centro", valor: 9.99 },
    { bairro: "Nossa Senhora de Fátima", valor: 9.99 },
    { bairro: "Santa Lídia", valor: 11.99 },
    { bairro: "São Cristóvão", valor: 11.99 },
    { bairro: "Armação", valor: 14.99 },
    { bairro: "Praia de Armação", valor: 14.99 },
    { bairro: "Praia Grande", valor: 14.99 },
  ],
};

const FORA_DO_ESCOPO: { bairro: string; municipio: MunicipioId }[] = [
  { bairro: "Bela Vista", municipio: "balnearioPicarras" },
  { bairro: "Lagoa", municipio: "balnearioPicarras" },
  { bairro: "Morro Alto", municipio: "balnearioPicarras" },
  { bairro: "Medeirinhos", municipio: "balnearioPicarras" },
  { bairro: "São Braz", municipio: "balnearioPicarras" },
  { bairro: "Gravatá", municipio: "penha" },
  { bairro: "Prainha de São Miguel", municipio: "penha" },
];

const ALL_OPTIONS: DeliveryBairroOption[] = [
  ...Object.entries(TAXAS_ENTREGA).flatMap(([municipio, bairros]) =>
    bairros.map(({ bairro, valor }) => ({
      bairroId: bairroId(municipio as MunicipioId, bairro),
      bairro,
      municipio: municipio as MunicipioId,
      valorCents: Math.round(valor * 100),
      available: true,
    }))
  ),
  ...FORA_DO_ESCOPO.map(({ bairro, municipio }) => ({
    bairroId: bairroId(municipio, bairro),
    bairro,
    municipio,
    valorCents: null,
    available: false,
  })),
];

const OPTIONS_BY_ID = new Map(ALL_OPTIONS.map((o) => [o.bairroId, o]));

/** Única fonte de verdade da taxa — sempre recalculada a partir do bairroId, nunca do cliente. */
export function getDeliveryFeeCents(bairroId: string): number | null {
  const option = OPTIONS_BY_ID.get(bairroId);
  return option?.available ? option.valorCents : null;
}

export function isBairroDeliverable(bairroId: string): boolean {
  return OPTIONS_BY_ID.get(bairroId)?.available ?? false;
}

export function getDeliveryBairroOption(bairroId: string): DeliveryBairroOption | undefined {
  return OPTIONS_BY_ID.get(bairroId);
}

export interface DeliveryMunicipioGroup {
  municipio: MunicipioId;
  label: string;
  bairros: DeliveryBairroOption[];
}

/**
 * Preview client-side do endereço composto (usado só pro rascunho/exibição —
 * o servidor recompõe sua própria versão a partir dos campos validados).
 */
export function composeDeliveryAddressPreview(
  bairroId: string,
  street: string,
  number: string,
  complement?: string,
  reference?: string
): string {
  const option = getDeliveryBairroOption(bairroId);
  const bairro = option?.bairro ?? "";
  const municipio = option ? MUNICIPIO_LABELS[option.municipio] : "";
  const complementPart = complement?.trim() ? ` - ${complement.trim()}` : "";
  const referencePart = reference?.trim() ? ` (Ref.: ${reference.trim()})` : "";
  return `${street}, ${number}${complementPart} - ${bairro}, ${municipio}${referencePart}`;
}

/** Pra popular os selects de município/bairro, incluindo os indisponíveis (desabilitados na UI). */
export function listDeliveryOptionsByMunicipio(): DeliveryMunicipioGroup[] {
  return (Object.keys(MUNICIPIO_LABELS) as MunicipioId[]).map((municipio) => ({
    municipio,
    label: MUNICIPIO_LABELS[municipio],
    bairros: ALL_OPTIONS.filter((o) => o.municipio === municipio).sort((a, b) =>
      a.bairro.localeCompare(b.bairro, "pt-BR")
    ),
  }));
}
