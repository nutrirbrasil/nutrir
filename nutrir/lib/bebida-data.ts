/** Águas: só aparecem no passo "Deseja alguma bebida?" ao montar o pedido, sem seção própria no cardápio. */
export interface BebidaOption {
  id: string;
  name: string;
  imageSrc: string;
  price_cents: number;
}

function imagePath(name: string): string {
  return encodeURI(`/bebidas/${name}.png`);
}

export const BEBIDAS: BebidaOption[] = [
  { id: "agua-sem-gas", name: "Água sem Gás", imageSrc: imagePath("Agua sem Gas"), price_cents: 499 },
  { id: "agua-com-gas", name: "Água com Gás", imageSrc: imagePath("Agua com Gas"), price_cents: 499 },
];

export function getBebidaById(id: string | undefined): BebidaOption | undefined {
  return BEBIDAS.find((b) => b.id === id);
}

/** Chave de bebida escolhida no fluxo de adicionais: "id|tamanho" (água usa "UN"). */
export function drinkKey(id: string, size: string): string {
  return `${id}|${size}`;
}
