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
          Atendimento presencial em {site.city} e online para todo o Brasil.
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

        <div className="mt-12 rounded-2xl border border-pauli-burgundy/20 bg-pauli-cream p-6 text-center">
          <p className="text-sm text-pauli-charcoal/70">Também conheça as marmitas fit da família</p>
          <a
            href={site.marmitasUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block font-display text-xl font-bold text-pauli-burgundy hover:underline"
          >
            Nutrir Piçarras →
          </a>
        </div>
      </div>
    </section>
  );
}
