const services = [
  {
    title: "Consulta nutricional",
    description:
      "Avaliação completa, histórico alimentar e plano individualizado conforme seus objetivos e rotina.",
  },
  {
    title: "Acompanhamento",
    description:
      "Retornos periódicos para ajustes, monitoramento de evolução e suporte contínuo entre consultas.",
  },
  {
    title: "Plano alimentar",
    description:
      "Orientações práticas para o dia a dia — refeições, substituições e estratégias para manter a consistência.",
  },
  {
    title: "Nutrição esportiva",
    description:
      "Estratégia alimentar para performance, composição corporal e recuperação, alinhada ao seu treino.",
  },
];

export function Services() {
  return (
    <section id="servicos" className="scroll-mt-20 px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="section-title text-center">Serviços</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-pauli-emerald/70">
          Atendimento presencial e online, com foco em educação alimentar e mudança de hábitos.
        </p>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2">
          {services.map((service) => (
            <li
              key={service.title}
              className="rounded-2xl border border-pauli-emerald/10 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <h3 className="font-display text-xl font-bold text-pauli-emerald">{service.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-pauli-emerald/75">
                {service.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
