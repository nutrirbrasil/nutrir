import type { Metadata } from "next";
import { InfoPage, InfoList, InfoSection } from "@/components/InfoPage";
import { PartnerApplicationForm } from "@/components/PartnerApplicationForm";

export const metadata: Metadata = {
  description:
    "Torne-se parceiro Nutrir: ganhe seu cupom de desconto exclusivo e pontos a cada indicação.",
};

export default function ParceiroPage() {
  return (
    <InfoPage
      title="Seja parceiro Nutrir"
      subtitle="Quem realmente ama o que a gente faz, ganha benefícios exclusivos por espalhar a palavra"
    >
      <p>
        Se você já experimentou nossas marmitas e acredita naquela comida caseira de verdade que a
        gente faz, esse programa é para você. Estamos buscando parceiros de verdade, gente que ama
        a Nutrir, não influenciadores em busca só de desconto.
      </p>

      <InfoSection title="Como funciona">
        <p>
          Ao ser aprovado, você recebe um cupom exclusivo com 5% de desconto para compartilhar com
          quem quiser. A cada pedido feito com o seu cupom, você acumula pontos que podem ser
          trocados por desconto nos seus próprios pedidos.
        </p>
      </InfoSection>

      <InfoSection title="Requisitos">
        <InfoList
          items={[
            "Morar em Balneário Piçarras, Penha, Barra Velha ou Navegantes.",
            "Ter perfil ativo com nicho relacionado a rotina, saúde, alimentação ou lifestyle.",
            "Ter pelo menos 2.500 seguidores, ou ser paciente da nutricionista Paula Pastorino.",
            "Já ser cliente Nutrir, com no mínimo 1 pedido feito.",
          ]}
        />
      </InfoSection>

      <InfoSection title="Quero ser parceiro">
        <p>Preencha seus dados abaixo e vamos analisar seu perfil:</p>
        <PartnerApplicationForm />
      </InfoSection>
    </InfoPage>
  );
}
