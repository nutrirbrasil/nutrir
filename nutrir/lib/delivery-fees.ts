/**
 * Taxas de entrega por bairro. Fonte da verdade única do valor cobrado — o
 * servidor recalcula a taxa a partir do bairro_id, nunca aceita o valor vindo
 * do cliente (mesma regra de "preço no servidor" usada pro cardápio).
 *
 * Valores calculados por km rodado (ida e volta) a partir da loja: 7,7 km/l,
 * R$6/L de gasolina, + R$1 de margem, arredondado pra cima até o .99.
 */

export type MunicipioId = "balnearioPicarras" | "penha" | "barraVelha" | "navegantes";

export const MUNICIPIO_LABELS: Record<MunicipioId, string> = {
  balnearioPicarras: "Balneário Piçarras",
  penha: "Penha",
  barraVelha: "Barra Velha",
  navegantes: "Navegantes",
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
    { bairro: "Centro", valor: 2.99 },
    { bairro: "Itacolomi", valor: 9.99 },
    { bairro: "Santo Antônio", valor: 7.99 },
    { bairro: "Nossa Senhora da Paz", valor: 5.99 },
    { bairro: "Nossa Senhora da Conceição", valor: 7.99 },
  ],
  penha: [
    { bairro: "Centro", valor: 5.99 },
    { bairro: "Nossa Senhora de Fátima", valor: 8.99 },
    { bairro: "Santa Lídia", valor: 13.99 },
    { bairro: "São Cristóvão", valor: 26.99 },
    { bairro: "Armação", valor: 13.99 },
    { bairro: "Praia de Armação", valor: 12.99 },
    { bairro: "Praia Grande", valor: 15.99 },
    { bairro: "Gravatá", valor: 18.99 },
  ],
  barraVelha: [
    { bairro: "Itajubá", valor: 15.99 },
    { bairro: "Praia do Grant", valor: 20.99 },
    { bairro: "Centro", valor: 28.99 },
    { bairro: "São Cristóvão", valor: 28.99 },
    { bairro: "Tabuleiro", valor: 28.99 },
    { bairro: "Quinta dos Açorianos", valor: 35.99 },
    { bairro: "Vila Nova", valor: 35.99 },
  ],
  navegantes: [
    { bairro: "Gravatá", valor: 20.99 },
    { bairro: "Volta Grande", valor: 20.99 },
    { bairro: "Pedreiras", valor: 22.99 },
    { bairro: "Porto Escalvado", valor: 22.99 },
    { bairro: "Escalvados", valor: 22.99 },
    { bairro: "Machados", valor: 24.99 },
    { bairro: "Meia Praia", valor: 25.99 },
    { bairro: "Nossa Senhora das Graças", valor: 28.99 },
    { bairro: "Hugo de Almeida (Carvão)", valor: 29.99 },
    { bairro: "São Domingos", valor: 30.99 },
    { bairro: "São Paulo", valor: 32.99 },
    { bairro: "Centro", valor: 33.99 },
    { bairro: "Escalvadinhos", valor: 34.99 },
    { bairro: "São Pedro (Pontal)", valor: 36.99 },
  ],
};

const FORA_DO_ESCOPO: { bairro: string; municipio: MunicipioId }[] = [
  { bairro: "Bela Vista", municipio: "balnearioPicarras" },
  { bairro: "Lagoa", municipio: "balnearioPicarras" },
  { bairro: "Morro Alto", municipio: "balnearioPicarras" },
  { bairro: "Medeirinhos", municipio: "balnearioPicarras" },
  { bairro: "São Braz", municipio: "balnearioPicarras" },
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

/**
 * Agrupamento de município por regra de agendamento de entrega (ver
 * lib/delivery-schedule.ts): Piçarras/Penha entregam todo dia menos sábado,
 * Barra Velha só sábado, Navegantes só domingo.
 */
export type DeliveryScheduleGroup = "picarrasPenha" | "barraVelha" | "navegantes";

export function getDeliveryScheduleGroup(municipio: MunicipioId): DeliveryScheduleGroup {
  if (municipio === "barraVelha") return "barraVelha";
  if (municipio === "navegantes") return "navegantes";
  return "picarrasPenha";
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
