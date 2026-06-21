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
    <section id="servicos" className="scroll-mt-20 px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-pauli-emerald/60">
          Como posso ajudar
        </p>
        <h2 className="section-title mt-2 text-center">Serviços</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-pauli-charcoal/70">
          Atendimento presencial em {site.attendance.inPerson} e online para {site.attendance.online.toLowerCase()}.
        </p>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2">
          {services.map((service) => (
            <li
              key={service.title}
              className="rounded-2xl border border-pauli-emerald/10 bg-white p-6 shadow-sm transition hover:border-pauli-emerald/25 hover:shadow-md"
            >
              <h3 className="font-display text-xl font-bold text-pauli-emerald">{service.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-pauli-charcoal/75">
                {service.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
