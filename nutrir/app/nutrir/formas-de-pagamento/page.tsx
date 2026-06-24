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
        Para tornar sua experiência de compra ainda mais fácil, oferecemos pagamento com{" "}
        <strong>Pix</strong> e <strong>cartão online</strong> para todos os clientes.{" "}
        <strong>Pacientes em acompanhamento com a nutricionista Paula Pastorino</strong> também podem
        optar por <strong>dinheiro</strong> ou <strong>cartão físico na retirada</strong> — veja a
        seção ao final desta página.
      </p>

      <p>
        Além disso, se você tem renda em outra moeda ou prefere privacidade fora do sistema
        tradicional, trabalhamos com <strong>criptomoedas</strong>.
      </p>

      <InfoSection title="Pix online">
        <p>
          Pagamento pelo site com QR Code e Pix copia e cola, com{" "}
          <strong>aproximadamente 10% de desconto</strong> em relação ao cartão. A confirmação é
          feita após identificarmos o pagamento no banco; em seguida iniciamos a produção.
        </p>
      </InfoSection>

      <InfoSection title="Cartão online">
        <p>
          Pague com cartão de crédito no checkout seguro InfinitePay. A confirmação é automática e
          a produção começa assim que o pagamento é aprovado.
        </p>
      </InfoSection>

      <InfoSection title="Dinheiro na retirada">
        <p>
          Exclusivo para <strong>pacientes da nutricionista Paula Pastorino</strong>. Você faz o
          pedido pelo site, escolhe pagamento em dinheiro e, estando{" "}
          <strong>cadastrado com os dados corretos</strong>, identificamos seu perfil de paciente. A
          produção é <strong>prioritária</strong> e o pagamento em dinheiro é feito{" "}
          <strong>na retirada</strong> — sem necessidade de pagamento antecipado no Nutrir.
        </p>
        <p>
          Também oferece <strong>aproximadamente 10% de desconto</strong>, como no Pix.
        </p>
      </InfoSection>

      <InfoSection title="Cartão físico na retirada">
        <p>
          Também exclusivo para pacientes em acompanhamento. Aceitamos cartão de crédito e débito nas
          maquininhas do Nutrir <strong>no momento da retirada</strong>, após identificarmos seu
          cadastro como paciente. A produção entra em <strong>prioridade</strong> assim que o pedido
          é confirmado — o pagamento no cartão ocorre quando você busca as marmitas.
        </p>
      </InfoSection>

      <InfoSection title="Criptomoedas">
        <p>Aceitamos pagamento com criptomoedas, entre elas:</p>
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

      <InfoSection title="Pagamento na retirada — exclusivo para pacientes">
        <p>
          Pagamento em dinheiro ou cartão físico na retirada é exclusivo para{" "}
          <strong>pacientes da nutricionista Paula Pastorino</strong>, cadastrados no site com os
          dados corretos para identificação.
        </p>
        <p>
          Além disso, pacientes têm acesso a <strong>cupons de desconto especiais</strong>,{" "}
          <strong>marmitas individuais com quantidades personalizadas</strong>,{" "}
          <strong>produção prioritária</strong> e muito mais.
        </p>
        <p>
          Quer saber mais sobre os benefícios que apenas pacientes possuem no Nutrir?{" "}
          <Link href="/beneficios" className="font-semibold text-nutrir-burgundy hover:underline">
            Clique aqui
          </Link>
          .
        </p>
      </InfoSection>

      <p className="text-sm text-nutrir-emerald/75">
        No checkout do site você pode escolher Pix ou cartão online. Pacientes podem escolher
        dinheiro ou cartão físico ao{" "}
        <Link href="/agendar" className="font-medium text-nutrir-burgundy hover:underline">
          finalizar o pedido
        </Link>
        . Dúvidas? Fale conosco pelo WhatsApp.
      </p>
    </InfoPage>
  );
}
