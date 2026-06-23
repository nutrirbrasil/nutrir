import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "@/components/InfoPage";
import { whatsappContactUrl } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Formas de Pagamento — Nutrir Piçarras",
  description:
    "Pix, cartão online, dinheiro, cartão físico e criptomoedas. Conheça as formas de pagamento da Nutrir Piçarras.",
};

const cryptoAssets = ["Bitcoin (BTC)", "Dólar digital (USDC e USDT)", "Ethereum (ETH)", "Solana (SOL)"];

export default function FormasDePagamentoPage() {
  return (
    <InfoPage title="Formas de Pagamento">
      <p>
        Para tornar sua experiência de compra ainda mais fácil, oferecemos a opção de pagamento com{" "}
        <strong>Pix</strong>, garantindo rapidez e segurança nas suas transações. E para facilitar
        ainda mais o acesso dos nossos clientes à alimentação saudável, aceitamos pagamentos em{" "}
        <strong>cartão online</strong>, <strong>cartão físico</strong> e <strong>dinheiro</strong>.
      </p>

      <p>
        Além disso, se você é daqueles que tem renda em outra moeda e não tem dinheiro em real, ou
        gosta de manter a privacidade fora do sistema tradicional, não se preocupe — também
        trabalhamos com <strong>criptomoedas</strong>.
      </p>

      <InfoSection title="Pix online">
        <p>
          Pagamento imediato pelo site, com confirmação rápida e <strong>aproximadamente 10% de
          desconto</strong> em relação ao valor de referência no cartão. Ideal para quem quer
          agilidade na produção do pedido.
        </p>
      </InfoSection>

      <InfoSection title="Cartão online">
        <p>
          Pague com cartão de crédito ou débito direto no checkout do site. A confirmação é
          automática e a produção começa assim que o pagamento é aprovado.
        </p>
      </InfoSection>

      <InfoSection title="Dinheiro no local">
        <p>
          Disponível para pedidos com retirada na loja. O pagamento é feito no momento da retirada,
          dentro do horário de funcionamento e em até <strong>24 horas</strong> após a confirmação do
          pedido. Também oferece <strong>aproximadamente 10% de desconto</strong>, como no Pix.
        </p>
        <p className="text-sm text-nutrir-emerald/75">
          Produção mediante confirmação do pagamento no local.
        </p>
      </InfoSection>

      <InfoSection title="Cartão físico no local">
        <p>
          Aceitamos cartão de crédito e débito na retirada, nas maquininhas disponíveis na loja.
          Funciona como o pagamento em dinheiro: o pedido segue para produção após o pagamento no
          local, dentro do prazo de 24 horas.
        </p>
      </InfoSection>

      <InfoSection title="Criptomoedas">
        <p>
          Aceitamos pagamento com criptomoedas, entre elas:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          {cryptoAssets.map((asset) => (
            <li key={asset}>{asset}</li>
          ))}
        </ul>
        <p>
          Para valores, cotação e instruções de pagamento em cripto, fale conosco pelo WhatsApp. Nossa
          equipe envia os dados da carteira e confirma o pedido após a compensação.
        </p>
        <a
          href={whatsappContactUrl("Olá! Gostaria de pagar meu pedido com criptomoeda. Pode me passar as instruções?")}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-2 inline-flex"
        >
          Pagar com cripto via WhatsApp
        </a>
      </InfoSection>

      <p className="text-sm text-nutrir-emerald/75">
        No checkout do site você pode escolher Pix ou cartão online. Para dinheiro, cartão físico ou
        cripto,{" "}
        <Link href="/agendar" className="font-medium text-nutrir-burgundy hover:underline">
          finalize seu pedido
        </Link>{" "}
        e selecione a forma de pagamento disponível — ou fale conosco pelo WhatsApp.
      </p>
    </InfoPage>
  );
}
