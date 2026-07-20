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
        Para tornar sua experiência ainda mais fácil, oferecemos pagamento com{" "}
        <strong>Pix e cartão online</strong> para todos os clientes.
      </p>

      <p>
        <strong>Dinheiro e cartão físico</strong> são aceitos em combos retirados na loja, porém
        como trabalhamos de forma artesanal e com foco em sustentabilidade, no momento só
        aceitamos pagamento antecipado, como sinal para iniciar a produção, com fim de{" "}
        <strong>evitar desperdício</strong>. Em pedidos com <strong>entrega</strong>, o pagamento
        antecipado (Pix ou cartão online) é obrigatório para todos, exceto pacientes.
      </p>

      <p>
        Porém <strong>pacientes em acompanhamento com a nutricionista Paula Pastorino</strong> podem
        optar por <strong>dinheiro ou cartão físico na retirada ou na entrega</strong>.
      </p>

      <p>
        Além disso, se você tem renda em outra moeda que não seja o real ou prefere{" "}
        <strong>privacidade</strong> fora do sistema tradicional, nós trabalhamos também com{" "}
        <strong>criptomoedas</strong>!
      </p>

      <InfoSection title="Descontos">
        <p>
          Os descontos não são fixos e podem variar em termos percentuais. A maioria dos descontos,
          principalmente para Pix e dinheiro, se aproximam de 10%, mas podem ser mais ou menos,
          variando de 5% a 15% dependendo do produto e das condições de mercado.
        </p>
      </InfoSection>

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

      <InfoSection title="Dinheiro na retirada ou entrega">
        <p>
          Exclusivo para <strong>pacientes da nutricionista Paula Pastorino</strong>. Você faz o
          pedido pelo site, escolhe pagamento em dinheiro e, estando{" "}
          <strong>cadastrado com os dados corretos</strong>, identificamos seu perfil de paciente. A
          produção é <strong>prioritária</strong> e o pagamento em dinheiro é feito{" "}
          <strong>na retirada ou na entrega</strong> — sem necessidade de pagamento antecipado no
          Nutrir.
        </p>
        <p>
          Também oferece <strong>aproximadamente 10% de desconto</strong>, como no Pix.
        </p>
      </InfoSection>

      <InfoSection title="Cartão físico na retirada ou entrega">
        <p>
          Também exclusivo para pacientes em acompanhamento. Aceitamos cartão de crédito e débito
          nas maquininhas do Nutrir <strong>no momento da retirada</strong>, ou com o entregador{" "}
          <strong>no momento da entrega</strong>, após identificarmos seu cadastro como paciente. A
          produção entra em <strong>prioridade</strong> assim que o pedido é confirmado — o
          pagamento no cartão ocorre quando você recebe as marmitas.
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
          Para valores, cotação e instruções de pagamento com criptomoedas, entre em contato antes de
          fazer o pedido, pelo WhatsApp.{" "}
          <a
            href={whatsappContactUrl("Olá! Gostaria de saber mais sobre pagamento com criptomoedas.")}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-nutrir-burgundy underline underline-offset-2"
          >
            Clique aqui para saber mais
          </a>
        </p>
      </InfoSection>

      <InfoSection title="Pagamento na retirada ou entrega — exclusivo para pacientes">
        <p>
          Pagamento em dinheiro ou cartão físico na retirada ou na entrega é exclusivo para{" "}
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
    </InfoPage>
  );
}
