import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/InfoPage";
import { whatsappContactUrl } from "@/lib/legal";

const PAULI_SITE_URL = "https://pauli.nutrirpicarras.com.br";
const PAULA_WHATSAPP_NUMBER = "5553981420874";

function paulaWhatsappUrl(message: string): string {
  return `https://wa.me/${PAULA_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const metadata: Metadata = {
  description:
    "Vantagens exclusivas no Nutrir para quem é paciente da nutricionista Paula Pastorino: pagamento na retirada, cupons, marmitas personalizadas e mais.",
};

export default function BeneficiosPage() {
  return (
    <InfoPage
      title="Benefícios para pacientes"
      subtitle="Vantagens exclusivas no Nutrir para quem é paciente da nutricionista Paula Pastorino"
    >
      <p>
        O Nutrir foi criado por um casal de nutricionistas e tem como prioridade a saúde e bem-estar
        dos seus clientes. Por isso criamos o benefício <strong>Paciente VIP</strong>, com foco não
        apenas em <strong>nutrir</strong> nossos clientes, mas buscando impactar e transformar suas
        vidas.
      </p>

      <InfoSection title="Paciente VIP: O que é?">
        <p>
          Para incentivar nossos clientes a terem uma vida mais saudável, todos os pacientes em
          acompanhamento com a nutricionista Paula Pastorino terão acesso a condições e recursos
          especiais.
        </p>
      </InfoSection>

      <InfoSection title="Pagamento na retirada">
        <p>
          Pacientes podem fazer o pedido normalmente pelo site e escolher pagamento na retirada, não
          é necessário pagar antecipadamente. Na hora de buscar as marmitas, você paga em dinheiro
          ou no cartão. Pagamento em dinheiro também conta com o desconto promocional, semelhante ao
          Pix online.
        </p>
      </InfoSection>

      <InfoSection title="Produção prioritária">
        <p>
          Ao identificarmos que você é paciente da Paula, o pedido entra na fila prioritária,
          evitando qualquer risco de atraso, ou melhor: avisaremos no WhatsApp quando estiver tudo
          pronto e você pode retirar com antecedência.
        </p>
      </InfoSection>

      <InfoSection title="Horários flexíveis">
        <p>
          Tá muito corrido e não vai conseguir retirar no nosso horário comercial? Sem problema, você
          é nossa prioridade! Pacientes podem entrar em contato e daremos um jeito para você
          conseguir buscar em outro horário.
        </p>
      </InfoSection>

      <InfoSection title="Cupons de desconto especiais">
        <p>
          Pacientes recebem acesso a cupons únicos via plataforma exclusiva da nutricionista, com
          condições pensadas para quem já está em acompanhamento nutricional. Os descontos são
          aplicados no checkout do site e são acumulativos, ou seja, podem ser combinados com outros
          descontos como Pix e dinheiro.
        </p>
      </InfoSection>

      <InfoSection title="Marmitas com quantidades personalizadas">
        <p>É isso mesmo que você leu!</p>
        <p>
          Além dos combos e do cardápio padrão, pacientes podem solicitar marmitas individuais ou
          combos com quantidades sob medida, alinhadas ao plano alimentar definido em consulta.
        </p>
      </InfoSection>

      <InfoSection title="Como ter acesso?">
        <p>
          Se você ainda não é paciente e quer conhecer o trabalho da Paula, presencial em Piçarras
          ou online:
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href={PAULI_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-nutrir-burgundy underline underline-offset-2"
          >
            Conhecer a Paula Pastorino
          </a>
          <a
            href={paulaWhatsappUrl(
              "Olá! Vi o benefício Paciente VIP no Nutrir e quero saber mais sobre como me tornar paciente da Paula."
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-nutrir-burgundy underline underline-offset-2"
          >
            Quero ser Paciente
          </a>
        </div>
      </InfoSection>

      <InfoSection title="Já sou paciente, como ter acesso?">
        <p>
          Se você está em acompanhamento ativo ou teve uma consulta dentro de 3 meses com a
          nutricionista Paula Pastorino, crie sua conta no Nutrir, complete seu cadastro informando
          seu CPF e automaticamente aparecerá um selo <strong>Paciente VIP</strong>. Caso não
          apareça,{" "}
          <a
            href={whatsappContactUrl(
              'Olá! Sou paciente da Paula Pastorino e não estou vendo o selo "Paciente VIP" no meu perfil.'
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-nutrir-burgundy underline underline-offset-2"
          >
            entre em contato conosco
          </a>
          .
        </p>
      </InfoSection>
    </InfoPage>
  );
}
