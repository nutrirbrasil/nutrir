import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "@/components/LegalPage";
import { legal, whatsappContactUrl } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de Privacidade — Nutrir Piçarras",
  description: "Como o Nutrir Piçarras coleta, usa e protege seus dados pessoais.",
};

export default function PoliticaPrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade">
      <p>
        A sua privacidade é importante para nós. Esta política explica como o{" "}
        <strong>{legal.brand}</strong> trata informações pessoais quando você usa nosso site{" "}
        <Link href="/" className="font-medium text-nutrir-burgundy hover:underline">
          {legal.siteUrl.replace(/^https?:\/\//, "")}
        </Link>
        , faz pedidos de marmitas e combos, cria conta ou entra em contato conosco.
      </p>

      <LegalSection title="1. Quem somos">
        <p>
          O <strong>{legal.brand}</strong> é uma marmitaria em Balneário Piçarras/SC, com pedidos
          online e retirada na loja. Endereço de retirada: {legal.address}.
        </p>
        <p>
          Para assuntos de privacidade e proteção de dados, fale conosco pelo e-mail{" "}
          <a href={`mailto:${legal.privacyEmail}`} className="font-medium text-nutrir-burgundy hover:underline">
            {legal.privacyEmail}
          </a>{" "}
          ou pelo{" "}
          <a
            href={whatsappContactUrl("Olá! Tenho uma dúvida sobre privacidade de dados.")}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-nutrir-burgundy hover:underline"
          >
            WhatsApp
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Quais dados coletamos">
        <p>Solicitamos informações pessoais apenas quando precisamos delas para atender você. Podemos coletar:</p>
        <LegalList
          items={[
            "Nome, e-mail, telefone, CPF e endereço — para cadastro, pedidos e emissão de documentos fiscais quando aplicável.",
            "Dados do pedido — itens escolhidos (marmitas, combos, adicionais), tamanho, data e horário de retirada, forma de pagamento e observações.",
            "Dados de pagamento — processados por parceiros (ex.: InfinitePay). Não armazenamos número completo de cartão em nossos servidores.",
            "Dados de login — se você usar e-mail/senha ou entrar com Google, recebemos identificação básica da conta (nome e e-mail) conforme autorizado por você.",
            "Dados técnicos — endereço IP, tipo de navegador, páginas visitadas e cookies necessários ao funcionamento do site e da sacola.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Para que usamos seus dados">
        <p>Utilizamos seus dados de forma justa e transparente, principalmente para:</p>
        <LegalList
          items={[
            "Processar e confirmar seus pedidos de marmitas e combos.",
            "Organizar a retirada na loja e enviar avisos sobre status do pedido.",
            "Manter sua conta e histórico de compras, quando você estiver logado.",
            "Cumprir obrigações legais e fiscais.",
            "Prevenir fraudes e melhorar a experiência no site.",
            "Responder dúvidas e solicitações de suporte.",
          ]}
        />
        <p>
          Bases legais (LGPD): execução de contrato (pedido), cumprimento de obrigação legal,
          legítimo interesse (segurança e melhoria do serviço) e consentimento, quando exigido
          (ex.: comunicações de marketing, se oferecidas no futuro).
        </p>
      </LegalSection>

      <LegalSection title="4. Compartilhamento com terceiros">
        <p>
          Não vendemos seus dados. Podemos compartilhar informações apenas com prestadores
          essenciais ao serviço, como:
        </p>
        <LegalList
          items={[
            "Processadores de pagamento (Pix e cartão online).",
            "Hospedagem e banco de dados (Supabase) para conta e pedidos.",
            "Google — quando você opta por login com conta Google.",
            "Autoridades públicas, quando exigido por lei.",
          ]}
        />
        <p>
          Esses parceiros tratam os dados conforme suas próprias políticas e apenas na medida
          necessária para a função contratada.
        </p>
      </LegalSection>

      <LegalSection title="5. Retenção e segurança">
        <p>
          Mantemos os dados pelo tempo necessário para cumprir as finalidades acima, incluindo
          prazos legais e fiscais. Depois disso, eliminamos ou anonimizamos quando possível.
        </p>
        <p>
          Protegemos as informações com medidas técnicas e organizacionais razoáveis (acesso
          restrito, conexões seguras, senhas). Nenhum sistema é 100% seguro; em caso de incidente
          relevante, comunicaremos conforme a lei.
        </p>
      </LegalSection>

      <LegalSection title="6. Seus direitos (LGPD)">
        <p>Você pode, a qualquer momento:</p>
        <LegalList
          items={[
            "Confirmar se tratamos seus dados e solicitar acesso.",
            "Corrigir dados incompletos ou desatualizados.",
            "Pedir anonimização, bloqueio ou eliminação de dados desnecessários.",
            "Revogar consentimento, quando o tratamento depender dele.",
            "Solicitar portabilidade, quando aplicável.",
          ]}
        />
        <p>
          Para exercer esses direitos, envie mensagem para{" "}
          <a href={`mailto:${legal.privacyEmail}`} className="font-medium text-nutrir-burgundy hover:underline">
            {legal.privacyEmail}
          </a>
          . Responderemos em prazo razoável.
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies">
        <p>
          Usamos cookies e armazenamento local para manter sua sacola, sessão de login e
          preferências básicas. Você pode desativar cookies no navegador, mas algumas funções do
          site podem deixar de funcionar corretamente.
        </p>
      </LegalSection>

      <LegalSection title="8. Links externos">
        <p>
          Nosso site pode conter links para redes sociais (como Instagram) ou mapas. Não
          controlamos as práticas de privacidade desses sites e recomendamos ler as políticas de
          cada um.
        </p>
      </LegalSection>

      <LegalSection title="9. Alterações">
        <p>
          Podemos atualizar esta política para refletir mudanças no site ou na legislação. A data
          no topo da página indica a versão vigente. O uso continuado do site após alterações
          significa que você tomou conhecimento do texto atualizado.
        </p>
      </LegalSection>

      <LegalSection title="10. Contato">
        <p>
          Dúvidas sobre esta política:{" "}
          <a href={`mailto:${legal.privacyEmail}`} className="font-medium text-nutrir-burgundy hover:underline">
            {legal.privacyEmail}
          </a>
          . Consulte também nossos{" "}
          <Link href="/termos-de-uso" className="font-medium text-nutrir-burgundy hover:underline">
            Termos de Uso
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
