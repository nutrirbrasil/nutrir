import { site } from "@/lib/site";

const services = [
  {
    title: "Consulta nutricional",
    description:
      "Avaliação completa, anamnese e plano alimentar individualizado conforme seus objetivos, rotina e preferências.",
  },
  {
    title: "Emagrecimento saudável",
    description:
      "Estratégias para perder gordura comendo bem — sem passar fome, com foco em hábitos sustentáveis e densidade calórica inteligente.",
  },
  {
    title: "Nutrição esportiva",
    description:
      "Alimentação alinhada ao treino para performance, composição corporal e recuperação — do iniciante ao atleta.",
  },
  {
    title: "Acompanhamento contínuo",
    description:
      "Retornos periódicos para ajustes no plano, monitoramento da evolução e suporte entre as consultas.",
  },
];

export function Services() {
  return (
    <section id="servicos" className="scroll-mt-20 bg-pauli-cream px-4 py-20 dark:bg-[#121816]">
      <div className="mx-auto max-w-5xl">
        <p className="dark-accent-label text-center text-xs font-semibold uppercase tracking-[0.3em]">
          Como posso ajudar
        </p>
        <h2 className="section-title mt-2 text-center">Serviços</h2>
        <p className="dark-accent-body mx-auto mt-3 max-w-xl text-center">
          Atendimento presencial em {site.attendance.inPerson} e online para{" "}
          {site.attendance.online.toLowerCase()}.
        </p>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2">
          {services.map((service) => (
            <li
              key={service.title}
              className="surface-card p-6 transition hover:border-pauli-emerald/25 hover:shadow-md dark:hover:border-pauli-sand/25"
            >
              <h3 className="font-display text-xl font-bold text-pauli-emerald dark:text-pauli-cream">
                {service.title}
              </h3>
              <p className="dark-accent-body mt-2 text-sm leading-relaxed">
                {service.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
