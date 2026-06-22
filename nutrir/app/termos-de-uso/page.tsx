import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "@/components/LegalPage";
import { legal, whatsappContactUrl } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Termos de Uso — Nutrir Piçarras",
  description: "Condições para uso do site e pedidos de marmitas no Nutrir Piçarras.",
};

export default function TermosUsoPage() {
  return (
    <LegalPage title="Termos de Uso">
      <p>
        Bem-vindo ao site do <strong>{legal.brand}</strong>. Ao navegar, criar conta ou fazer
        pedidos, você concorda com estes Termos de Uso. Leia com atenção antes de utilizar nossos
        serviços.
      </p>

      <LegalSection title="1. O serviço">
        <p>
          Oferecemos venda de marmitas individuais, combos (kits) e montagem personalizada de
          combos, com pedido online e <strong>retirada na loja</strong> em {legal.address},
          Balneário Piçarras/SC.
        </p>
        <p>
          As marmitas são elaboradas com orientação nutricional, mas o site e os produtos{" "}
          <strong>não substituem consulta, diagnóstico ou acompanhamento médico/nutricional
          individual</strong>.
        </p>
      </LegalSection>

      <LegalSection title="2. Cadastro e conta">
        <p>
          Para agendar retirada e concluir pedidos, pode ser necessário criar conta com e-mail e
          senha ou entrar com Google. Você é responsável por manter seus dados corretos e por
          guardar o acesso à sua conta.
        </p>
        <p>Não compartilhe sua senha. Avise-nos se suspeitar de uso indevido.</p>
      </LegalSection>

      <LegalSection title="3. Pedidos e retirada">
        <LegalList
          items={[
            "Os preços exibidos no site são referência; valores promocionais (dinheiro/Pix) seguem as regras indicadas em cada produto.",
            "Combos podem exigir antecedência mínima para produção — as datas disponíveis no agendamento devem ser respeitadas.",
            "É sua responsabilidade escolher corretamente itens, tamanhos (P/G), adicionais e data/horário de retirada.",
            "Pedidos não retirados no prazo combinado podem ser cancelados ou tratados conforme combinado com a loja, sem direito automático a reembolso por ausência.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Pagamento">
        <p>
          Aceitamos as formas de pagamento disponíveis no checkout (Pix, cartão online, dinheiro ou
          cartão na retirada, conforme opções ativas). Pagamentos online são processados por
          parceiros especializados; ao pagar, você também aceita os termos desses provedores.
        </p>
        <p>
          Em caso de divergência de valor ou cobrança, entre em contato pelo{" "}
          <a
            href={whatsappContactUrl("Olá! Preciso de ajuda com um pedido.")}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-nutrir-burgundy hover:underline"
          >
            WhatsApp
          </a>{" "}
          com o número do pedido.
        </p>
      </LegalSection>

      <LegalSection title="5. Produtos alimentícios">
        <LegalList
          items={[
            "Trabalhamos com ingredientes frescos; pequenas variações de apresentação ou disponibilidade podem ocorrer.",
            "Informe alergias, intolerâncias ou restrições alimentares nos observações do pedido ou diretamente conosco antes da produção.",
            "O consumo é de sua responsabilidade após a retirada — conserve e consuma conforme orientações de segurança alimentar.",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Cancelamentos e reembolsos">
        <p>
          Cancelamentos devem ser solicitados o quanto antes, pelo WhatsApp ou canais oficiais. Se o
          pedido já estiver em produção, podemos não aceitar cancelamento ou aplicar taxa conforme
          o estágio do preparo.
        </p>
        <p>
          Reembolsos de pagamentos online, quando devidos, serão feitos pelo mesmo meio ou
          alternativa acordada, nos prazos do processador de pagamento.
        </p>
      </LegalSection>

      <LegalSection title="7. Uso adequado do site">
        <p>Você concorda em não:</p>
        <LegalList
          items={[
            "Usar o site para fins ilegais ou fraudulentos.",
            "Tentar acessar áreas restritas, interferir no funcionamento ou copiar conteúdo sem autorização.",
            "Fornecer informações falsas em cadastro ou pedidos.",
          ]}
        />
      </LegalSection>

      <LegalSection title="8. Propriedade intelectual">
        <p>
          Marcas, textos, imagens, cardápio e layout do site pertencem ao {legal.brand} ou a
          licenciadores. É proibida reprodução comercial sem autorização prévia.
        </p>
      </LegalSection>

      <LegalSection title="9. Limitação de responsabilidade">
        <p>
          Empregamos esforços razoáveis para manter o site disponível e as informações corretas,
          mas não garantimos funcionamento ininterrupto. Na extensão permitida pela lei, não nos
          responsabilizamos por danos indiretos decorrentes do uso do site ou de indisponibilidade
          temporária.
        </p>
        <p>
          Nossa responsabilidade por problemas com pedidos alimentícios limita-se ao valor pago
          pelo pedido afetado, salvo disposição legal em contrário.
        </p>
      </LegalSection>

      <LegalSection title="10. Privacidade">
        <p>
          O tratamento de dados pessoais é regido pela nossa{" "}
          <Link href="/politica-de-privacidade" className="font-medium text-nutrir-burgundy hover:underline">
            Política de Privacidade
          </Link>
          , que faz parte destes termos.
        </p>
      </LegalSection>

      <LegalSection title="11. Alterações">
        <p>
          Podemos alterar estes termos a qualquer momento. A versão publicada no site com data de
          atualização prevalece. O uso continuado após mudanças constitui aceitação.
        </p>
      </LegalSection>

      <LegalSection title="12. Lei aplicável e foro">
        <p>
          Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o
          foro da comarca de Balneário Piçarras/SC para dirimir controvérsias, salvo direito do
          consumidor de optar pelo foro de seu domicílio.
        </p>
      </LegalSection>

      <LegalSection title="13. Contato">
        <p>
          {legal.brand} · {legal.address}
          <br />
          Instagram: {legal.instagram}
          <br />
          WhatsApp:{" "}
          <a
            href={whatsappContactUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-nutrir-burgundy hover:underline"
          >
            falar conosco
          </a>
          {" · "}
          E-mail:{" "}
          <a href={`mailto:${legal.privacyEmail}`} className="font-medium text-nutrir-burgundy hover:underline">
            {legal.privacyEmail}
          </a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
