import type { Metadata } from "next";
import Image from "next/image";
import { InfoList, InfoPage, InfoSection } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Como Funciona — Nutrir Piçarras",
  description: "Prazos de pedido, dias e horários de retirada de marmitas e combos na Nutrir Piçarras.",
};

export default function ComoFuncionaPage() {
  return (
    <InfoPage title="Como Funciona?">
      <p>
        Queremos estar presente em todos os momentos da sua rotina, sempre com sabores que
        proporcionam uma vida mais saudável e simples. E é por isso que nosso site é completo, com
        diversas formas de variar o pedido — e a retirada é simples de agendar, sem intermediários.
      </p>

      <div className="overflow-hidden rounded-2xl">
        <Image
          src="/4%20passos.png"
          alt="4 passos para pedir na Nutrir: escolha, agende, pague e retire"
          width={1200}
          height={800}
          className="h-auto w-full"
          sizes="(max-width: 768px) 100vw, 720px"
        />
      </div>

      <InfoSection title="Antecedência dos pedidos">
        <p>
          Os pedidos devem ser feitos com no mínimo <strong>24 horas de antecedência</strong> para
          marmitas individuais, ou <strong>48 horas de antecedência</strong> nos pedidos de combos.
        </p>
      </InfoSection>

      <InfoSection title="Dias de retirada">
        <p className="font-semibold text-nutrir-emerald">Marmitas</p>
        <p>De segunda a sexta, das 9:00 às 11:30 ou das 15:00 às 19:00.</p>

        <p className="font-semibold text-nutrir-emerald">Combos</p>
        <p>Apenas segunda e sexta, das 9:00 às 11:30 ou das 15:00 às 19:00.</p>
      </InfoSection>

      <InfoSection title="Se programe para pedir">
        <p>
          Por se tratar de uma comida artesanal, feita sob encomenda, com produtos frescos:
        </p>
        <InfoList
          items={[
            "Pedidos para segunda-feira devem ser realizados até sábado.",
            "Pedidos para sexta-feira devem ser realizados até quarta-feira.",
          ]}
        />
      </InfoSection>
    </InfoPage>
  );
}
