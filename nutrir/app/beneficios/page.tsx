import type { Metadata } from "next";
import Link from "next/link";
import { InfoList, InfoPage, InfoSection } from "@/components/InfoPage";
import { whatsappContactUrl } from "@/lib/legal";

const PAULI_SITE_URL = "https://pauli.nutrirpicarras.com.br";

export const metadata: Metadata = {
  title: "Benefícios para pacientes — Nutrir Piçarras",
  description:
    "Vantagens exclusivas no Nutrir para quem é paciente da nutricionista Paula Pastorino: pagamento na retirada, cupons, marmitas personalizadas e mais.",
};

export default function BeneficiosPage() {
  return (
    <InfoPage
      title="Benefícios para pacientes"
      subtitle="Vantagens exclusivas no Nutrir para quem acompanha com a Paula Pastorino"
    >
      <p>
        O Nutrir foi criado por nutricionistas e trabalha em parceria com a{" "}
        <strong>Paula Pastorino</strong> (CRN 18489D), nutricionista clínica e esportiva em
        Balneário Piçarras. Quem é <strong>paciente em acompanhamento</strong> com ela tem acesso a
        condições e recursos que não estão disponíveis no fluxo padrão do site.
      </p>

      <InfoSection title="Pagamento na retirada">
        <p>
          Pacientes podem fazer o pedido normalmente pelo site e escolher{" "}
          <strong>pagamento no local</strong> — em <strong>dinheiro</strong> ou{" "}
          <strong>cartão físico</strong> (crédito ou débito). Se você estiver{" "}
          <strong>cadastrado no site com os dados corretos</strong>, identificamos que é paciente da
          Paula e o pedido entra em <strong>produção prioritária</strong>.
        </p>
        <p>
          O pagamento pode ser feito <strong>na retirada do pedido</strong> — não é necessário pagar
          antecipadamente no Nutrir. Na hora de buscar as marmitas, você paga em dinheiro ou no
          cartão. Pagamento em dinheiro também conta com o desconto promocional, semelhante ao Pix
          online.
        </p>
      </InfoSection>

      <InfoSection title="Cupons de desconto especiais">
        <p>
          Pacientes recebem acesso a <strong>cupons exclusivos</strong>, com condições pensadas para
          quem já está em acompanhamento nutricional. Os descontos são aplicados no checkout do site,
          junto com as demais formas de pagamento online (Pix e cartão).
        </p>
      </InfoSection>

      <InfoSection title="Marmitas e quantidades personalizadas">
        <p>
          Além dos combos e do cardápio padrão, pacientes podem solicitar{" "}
          <strong>marmitas individuais</strong> e <strong>quantidades sob medida</strong>, alinhadas
          ao plano alimentar definido em consulta — com mais flexibilidade do que o fluxo automático
          do site oferece para o público geral.
        </p>
      </InfoSection>

      <InfoSection title="Mais vantagens">
        <InfoList
          items={[
            "Produção prioritária para pedidos de pacientes identificados no sistema.",
            "Alinhamento entre o que você come no dia a dia e o que pede no Nutrir.",
            "Atendimento próximo da equipe, com conhecimento do seu histórico como paciente.",
            "Prioridade no suporte para dúvidas sobre pedidos, retirada e pagamento.",
            "Integração entre consulta nutricional e praticidade das marmitas prontas.",
          ]}
        />
      </InfoSection>

      <InfoSection title="Como ter acesso">
        <p>
          Os benefícios são para quem está em <strong>acompanhamento ativo</strong> com a Paula
          Pastorino. Mantenha seu <strong>cadastro no Nutrir atualizado</strong> (nome, telefone e
          e-mail iguais aos usados na consulta) para que possamos identificar você nos pedidos com
          pagamento no local.
        </p>
        <p>
          Se você ainda não é paciente e quer conhecer o trabalho dela — presencial em Piçarras ou
          online — acesse o site do consultório:
        </p>
        <a
          href={PAULI_SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-2 inline-flex"
        >
          Conhecer a Paula Pastorino
        </a>
        <p className="mt-4">
          Já é paciente e quer tirar dúvidas sobre cupons, pedidos personalizados ou pagamento na
          retirada? Fale com a gente pelo WhatsApp.
        </p>
        <a
          href={whatsappContactUrl(
            "Olá! Sou paciente da Paula Pastorino e gostaria de saber mais sobre os benefícios no Nutrir."
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block font-semibold text-nutrir-burgundy hover:underline"
        >
          Falar no WhatsApp
        </a>
      </InfoSection>

      <p className="text-sm text-nutrir-emerald/75">
        Para pedir pelo site com Pix ou cartão online,{" "}
        <Link href="/" className="font-medium text-nutrir-burgundy hover:underline">
          acesse o cardápio
        </Link>
        . Formas de pagamento disponíveis para todos os clientes estão em{" "}
        <Link href="/nutrir/formas-de-pagamento" className="font-medium text-nutrir-burgundy hover:underline">
          Formas de Pagamento
        </Link>
        .
      </p>
    </InfoPage>
  );
}
