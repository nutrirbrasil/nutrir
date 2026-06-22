import { ScrollReveal } from "@/components/ScrollReveal";
import { site, whatsappLink } from "@/lib/site";

const planWhatsAppMessage: Record<string, string> = {
  inicial: "Olá Pauli! Vim do seu site e gostaria de agendar uma Consulta Inicial.",
  trimestral: "Olá Pauli! Vim do seu site e tenho interesse no Acompanhamento Trimestral.",
  semestral: "Olá Pauli! Vim do seu site e tenho interesse no Acompanhamento Semestral.",
};

export function Plans() {
  return (
    <section id="acompanhamento" className="scroll-mt-20 bg-pauli-sand/60 px-4 py-20 dark:bg-[#1a1816]">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal animation="fade-up" duration={700}>
          <p className="dark-accent-label text-center text-xs font-semibold uppercase tracking-[0.3em]">
            Formas de atendimento
          </p>
          <h2 className="section-title mt-2 text-center">Conheça meu acompanhamento</h2>
          <p className="dark-accent-body mx-auto mt-4 max-w-2xl text-center leading-relaxed">
            {site.plansIntro}
          </p>
          <p className="dark-accent-body mx-auto mt-3 max-w-xl text-center text-sm">
            Atendimento presencial em {site.attendance.inPerson} e online para{" "}
            {site.attendance.online.toLowerCase()}.
          </p>
        </ScrollReveal>

        <ul className="mt-12 grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {site.plans.map((plan, index) => (
            <ScrollReveal
              key={plan.id}
              animation="scale-up"
              delay={index * 120}
              duration={700}
              as="li"
            >
              <div
                className={`surface-card flex h-full flex-col p-6 transition hover:shadow-md ${
                  plan.featured
                    ? "border-[3px] border-pauli-gold shadow-lg dark:border-pauli-gold-light/60"
                    : "hover:border-pauli-gold/25 dark:hover:border-pauli-sand/25"
                }`}
              >
                {plan.featured && (
                  <span className="mb-3 inline-block w-fit rounded-full bg-pauli-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-pauli-charcoal">
                    Mais escolhido
                  </span>
                )}
                <h3 className="gold-text font-display text-xl font-bold dark:text-pauli-cream">
                  {plan.title}
                </h3>
                {plan.tagline ? (
                  <p className="gold-text mt-2 text-sm font-medium leading-snug dark:text-pauli-sand">
                    {plan.tagline}
                  </p>
                ) : null}
                <p
                  className={`dark-accent-body flex-1 text-sm leading-relaxed ${plan.tagline ? "mt-3" : "mt-2"}`}
                >
                  {plan.description}
                </p>
                <a
                  href={whatsappLink(planWhatsAppMessage[plan.id])}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-6 block text-center text-sm font-bold uppercase tracking-wide transition ${
                    plan.featured ? "btn-primary" : "btn-secondary"
                  }`}
                >
                  Agendar
                </a>
              </div>
            </ScrollReveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
