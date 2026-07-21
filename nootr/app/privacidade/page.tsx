import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidade, Nootr",
};

export default function PrivacidadePage() {
  return (
    <article className="mx-auto max-w-2xl">
      <div className="divider-bordo mb-4" />
      <h1 className="font-display text-4xl text-nootr-cream">Política de privacidade</h1>
      <p className="mt-2 text-xs uppercase tracking-caps text-nootr-faint">
        Última atualização: julho de 2026
      </p>

      <div className="prose-legal mt-10">
        <h2>1. Quais dados coletamos</h2>
        <p>
          <strong>Dados de conta:</strong> e-mail e senha (armazenada de forma criptografada pelo
          nosso provedor de autenticação). <strong>Dados de perfil:</strong> se você optar pelo
          cálculo calórico, sexo, idade, peso, altura e nível de atividade física.{" "}
          <strong>Dados de uso:</strong> as dietas que você monta, os alimentos que registra e o
          histórico de substituições.
        </p>

        <h2>2. Para que usamos</h2>
        <p>
          Exclusivamente para operar o aplicativo: autenticar você, calcular suas calorias e
          macros, guardar suas dietas e ajustar o seu dia. <strong>Não vendemos nem
          compartilhamos seus dados com terceiros para fins de marketing.</strong>
        </p>

        <h2>3. Dados sensíveis de saúde</h2>
        <p>
          Peso, altura e hábitos alimentares são dados pessoais relacionados à saúde. Eles são
          fornecidos voluntariamente por você, usados apenas para os cálculos do aplicativo e
          protegidos por controle de acesso por usuário: cada conta só consegue ler e alterar os
          próprios registros (isolamento aplicado no banco de dados, via row-level security).
        </p>

        <h2>4. Onde os dados ficam</h2>
        <p>
          Os dados são armazenados no Supabase (infraestrutura em nuvem com servidores nos Estados
          Unidos), sob criptografia em trânsito (TLS) e em repouso. A autenticação usa tokens de
          curta duração; sua senha nunca é visível para nós.
        </p>

        <h2>5. Seus direitos (LGPD)</h2>
        <p>
          Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode solicitar a
          qualquer momento: acesso aos seus dados, correção, portabilidade ou exclusão definitiva
          da conta e de todos os registros associados. Basta escrever para{" "}
          <a href="mailto:contatonutrirbrasil@gmail.com" className="text-nootr-bordoSoft hover:underline">
            contatonutrirbrasil@gmail.com
          </a>
          . A exclusão da conta remove dietas, planos diários e histórico de substituições.
        </p>

        <h2>6. Cookies e rastreamento</h2>
        <p>
          O Nootr não usa cookies de publicidade nem rastreadores de terceiros. Utilizamos apenas
          o armazenamento local do navegador para manter a sua sessão autenticada.
        </p>

        <h2>7. Retenção</h2>
        <p>
          Mantemos seus dados enquanto sua conta existir. Contas excluídas têm os dados removidos
          do banco de produção; cópias de backup expiram conforme a rotina do provedor.
        </p>

        <h2>8. Alterações e contato</h2>
        <p>
          Se esta política mudar de forma relevante, avisaremos no aplicativo. Dúvidas:{" "}
          <a href="mailto:contatonutrirbrasil@gmail.com" className="text-nootr-bordoSoft hover:underline">
            contatonutrirbrasil@gmail.com
          </a>
          . Veja também os{" "}
          <Link href="/termos" className="text-nootr-bordoSoft hover:underline">
            Termos de uso
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
