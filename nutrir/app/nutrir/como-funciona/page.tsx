import type { Metadata } from "next";
import Image from "next/image";
import { InfoPage, InfoSection } from "@/components/InfoPage";
import { whatsappContactUrl } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Como Funciona — Nutrir Piçarras",
  description:
    "Prazos de pedido, dias e horários de retirada e entrega de marmitas e combos na Nutrir Piçarras.",
};

export default function ComoFuncionaPage() {
  return (
    <InfoPage title="Como Funciona?">
      <p>
        Queremos estar presente em todos os momentos da sua rotina, sempre com sabores que
        proporcionam uma vida mais saudável e simples. E é por isso que nosso site é completo, com
        diversas formas de variar o pedido — e a retirada ou entrega é simples de agendar, sem
        intermediários.
      </p>

      <div className="overflow-hidden rounded-2xl">
        <Image
          src="/4%20passos.jpg"
          alt="4 passos para pedir na Nutrir: escolha seus produtos, agende a retirada ou entrega, pague como preferir e agora é só se nutrir"
          width={2000}
          height={1414}
          className="h-auto w-full"
          sizes="(max-width: 768px) 100vw, 720px"
        />
      </div>

      <InfoSection title="Antecedência dos pedidos">
        <p>
          Pedidos para manhã devem ser feito até <strong>11:30</strong>.<br />
          Pedidos para tarde devem ser feitos até <strong>19:00</strong>.
        </p>
        <p>
          <strong>Marmitas Individuais:</strong> os pedidos devem ser feitos com no mínimo{" "}
          <strong>24 horas de antecedência</strong>.
        </p>
        <p>
          <strong>Combos:</strong> os pedidos devem ser feitos com no mínimo{" "}
          <strong>48 horas de antecedência</strong>.
        </p>
      </InfoSection>

      <InfoSection title="Entrega">
        <p>
          Todos os <strong>domingos, das 15h às 19h</strong>. O pedido deve ser feito até{" "}
          <strong>sexta-feira, 19:00</strong>! Disponível para marmitas individuais e combos, com
          taxa que varia conforme cidade e bairro.
        </p>
      </InfoSection>

      <InfoSection title="Retirada">
        <p>De segunda a sexta, das 9:00 às 11:30 ou das 15:00 às 19:00.</p>
      </InfoSection>

      <p className="text-center font-display text-base italic text-nutrir-emerald md:text-lg">
        Apenas se organize para pedir que nós organizamos sua semana!
      </p>

      <p className="text-center">
        Dúvidas? Nos chame no{" "}
        <a
          href={whatsappContactUrl("Olá! Tenho uma dúvida sobre como funciona a Nutrir.")}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-nutrir-burgundy hover:underline"
        >
          WhatsApp
        </a>
        !
      </p>
    </InfoPage>
  );
}
