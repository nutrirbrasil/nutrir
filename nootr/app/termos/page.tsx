import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de uso — Nootr",
};

export default function TermosPage() {
  return (
    <article className="mx-auto max-w-2xl">
      <div className="divider-bordo mb-4" />
      <h1 className="font-display text-4xl text-nootr-cream">Termos de uso</h1>
      <p className="mt-2 text-xs uppercase tracking-caps text-nootr-faint">
        Última atualização: julho de 2026
      </p>

      <div className="prose-legal mt-10">
        <h2>1. O que é o Nootr</h2>
        <p>
          O Nootr é um aplicativo de organização alimentar: você monta sua dieta, registra o que
          comeu fora do plano e recebe sugestões de ajuste para o restante do dia, com base na
          Tabela Brasileira de Composição de Alimentos (TACO — NEPA/UNICAMP).
        </p>

        <h2>2. O Nootr não substitui um profissional de saúde</h2>
        <p>
          As informações e cálculos exibidos pelo Nootr (incluindo estimativas de calorias por
          Harris-Benedict e Mifflin-St Jeor e valores nutricionais da TACO) têm caráter
          exclusivamente informativo e educacional. Eles <strong>não constituem orientação
          nutricional, prescrição dietética nem aconselhamento médico</strong>. Consulte sempre
          um(a) nutricionista ou médico(a) antes de iniciar, alterar ou interromper qualquer plano
          alimentar — especialmente em caso de gestação, condições clínicas, transtornos
          alimentares ou uso de medicamentos.
        </p>

        <h2>3. Conta e responsabilidades</h2>
        <p>
          Para usar o Nootr você precisa criar uma conta com e-mail e senha. Você é responsável
          por manter a confidencialidade das suas credenciais e pela veracidade dos dados que
          informa (peso, altura, idade e alimentos registrados). Reservamo-nos o direito de
          suspender contas que violem estes termos ou façam uso abusivo do serviço.
        </p>

        <h2>4. Planos</h2>
        <p>
          O plano <strong>Basic</strong> permite manter 1 dieta base. O plano <strong>Pro</strong>{" "}
          permite manter até 7 dietas, uma para cada dia da semana. Condições comerciais dos
          planos (preços, cobrança e cancelamento) serão publicadas quando a cobrança for ativada;
          até lá, os recursos podem ser disponibilizados gratuitamente em caráter de teste.
        </p>

        <h2>5. Precisão dos dados nutricionais</h2>
        <p>
          Os valores nutricionais vêm da tabela TACO e de estimativas de porções caseiras
          (aproximações). Valores reais variam conforme marca, preparo e porção. O Nootr não
          garante exatidão absoluta dos números exibidos.
        </p>

        <h2>6. Propriedade intelectual</h2>
        <p>
          O software, a marca e o design do Nootr são de propriedade dos seus desenvolvedores. Os
          dados da tabela TACO pertencem ao NEPA/UNICAMP e são utilizados conforme sua
          disponibilização pública.
        </p>

        <h2>7. Limitação de responsabilidade</h2>
        <p>
          O Nootr é fornecido &quot;como está&quot;. Na máxima extensão permitida pela lei, não nos
          responsabilizamos por danos decorrentes de decisões alimentares ou de saúde tomadas com
          base nas informações do aplicativo, nem por indisponibilidades temporárias do serviço.
        </p>

        <h2>8. Alterações</h2>
        <p>
          Estes termos podem ser atualizados. Mudanças relevantes serão comunicadas no próprio
          aplicativo. O uso continuado após a atualização significa concordância com a nova versão.
        </p>

        <h2>9. Contato</h2>
        <p>
          Dúvidas sobre estes termos:{" "}
          <a href="mailto:contatonutrirbrasil@gmail.com" className="text-nootr-bordoSoft hover:underline">
            contatonutrirbrasil@gmail.com
          </a>
          . Veja também a nossa{" "}
          <Link href="/privacidade" className="text-nootr-bordoSoft hover:underline">
            Política de privacidade
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
