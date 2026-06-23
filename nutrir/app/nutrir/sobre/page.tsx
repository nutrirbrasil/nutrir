import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Sobre a Nutrir — Nutrir Piçarras",
  description:
    "Conheça a Nutrir: comida caseira, saudável e prática em Balneário Piçarras, criada por nutricionistas.",
};

export default function SobreNutrirPage() {
  return (
    <InfoPage
      title="Sobre a Nutrir"
      subtitle="A COMIDA CASEIRA SAUDÁVEL QUE FALTAVA EM PIÇARRAS"
    >
      <p>
        A Nutrir é a solução que faltava em Balneário Piçarras para facilitar sua rotina! Se você
        gosta de comida caseira, simples e saudável, então você vai amar nossa proposta.
      </p>

      <p>
        Na Nutrir, a saúde e a praticidade se encontram, já que os fundadores são nutricionistas que
        vivem essa realidade. Tudo começou a partir da busca por uma alimentação mais saudável,
        simples e prática na região, que não encontramos — então surgimos com uma proposta
        tecnológica, onde acreditamos que a distância entre você e a comida saudável deve ser tão
        curta quanto um clique.
      </p>

      <p>
        Nosso objetivo principal é sempre trabalhar com ingredientes selecionados, frescos, sem
        conservantes e aditivos artificiais. Nós escolhemos produtos para você ter as melhores
        opções, e nossos Nutricionistas Chefs estão sempre pensando em novas formas de agregar valor
        à sua saúde e rotina.
      </p>

      <InfoSection title="Nossas opções">
        <p>
          A Nutrir conta com opções desde carne vermelha até opções vegetarianas, mas sempre
          priorizando alimentos saudáveis.
        </p>
        <p>
          No caso da carne vermelha, optamos por trabalhar apenas com carne magra, principalmente o
          patinho, com o mínimo de gordura, para que seja possível encaixar em qualquer dieta.
        </p>
        <p>
          A carne do frango sempre será o peito, pelo fato de ser a parte mais magra e não possuir
          gordura.
        </p>
        <p>
          E não poderia faltar as opções vegetarianas/veganas, para você que não consome produtos de
          origem animal.
        </p>
      </InfoSection>

      <p>
        Temos um cardápio completo para agradar a todos os gostos e diversas necessidades
        alimentares, sem contar que estamos sempre pensando em novos pratos e adaptações para o
        futuro próximo.
      </p>

      <p>
        Os nossos produtos são feitos de forma 100% artesanal e caseira. Isso significa que você
        pode ter a certeza de que na Nutrir tudo é produzido pensando em você. Além disso, buscamos
        técnicas para preservar as propriedades nutricionais e sabor dos alimentos, seja ela
        consumida na hora ou após dias de armazenamento no congelador.
      </p>

      <p className="font-semibold text-nutrir-burgundy">
        Então faça parte da família Nutrir! Pois dieta e alimentação saudável não precisa ser chata
        e nem cara...
      </p>
    </InfoPage>
  );
}
