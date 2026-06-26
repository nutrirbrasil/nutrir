import { FiChevronDown } from "react-icons/fi";
import { ScrollReveal } from "@/components/ScrollReveal";
import { FAQ_ITEMS } from "@/lib/faq-data";
import { whatsappLink } from "@/lib/site";

const AGENDAR_MESSAGE = "Olá Paula! Quero agendar uma consulta.";

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 bg-transparent px-4 py-20 dark:bg-black">
      <div className="mx-auto max-w-3xl">
        <ScrollReveal animation="fade-up" duration={700}>
          <p className="dark-accent-label text-center text-xs font-semibold uppercase tracking-[0.3em]">
            Tire suas dúvidas
          </p>
          <h2 className="gold-text mt-2 text-center font-display text-3xl font-bold md:text-4xl">
            Perguntas frequentes
          </h2>
        </ScrollReveal>

        <ul className="mt-10 space-y-3">
          {FAQ_ITEMS.map((item, index) => (
            <ScrollReveal
              key={item.id}
              animation="fade-up"
              delay={index * 60}
              duration={600}
              as="li"
            >
              <details className="surface-card group overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
                  <span className="text-left font-display text-base font-bold leading-snug text-pauli-charcoal/80 dark:text-pauli-sand/70 md:text-lg">
                    {item.question}
                  </span>
                  <FiChevronDown
                    className="shrink-0 text-lg text-pauli-charcoal/50 transition-transform duration-200 group-open:rotate-180 dark:text-pauli-sand/50"
                    aria-hidden
                  />
                </summary>
                <div className="dark-accent-body space-y-3 border-t border-pauli-charcoal/10 px-5 pb-5 pt-4 text-sm leading-relaxed dark:border-pauli-sand/10">
                  {item.blocks.map((block, blockIndex) => {
                    if (block.type === "p") {
                      return <p key={blockIndex}>{block.text}</p>;
                    }

                    if (block.type === "ul") {
                      return (
                        <ul key={blockIndex} className="list-disc space-y-1.5 pl-5">
                          {block.items.map((entry) => (
                            <li key={entry}>{entry}</li>
                          ))}
                        </ul>
                      );
                    }

                    return (
                      <p key={blockIndex}>
                        {block.before}
                        <a
                          href={whatsappLink(block.message)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-pauli-charcoal/80 underline-offset-2 hover:underline dark:text-pauli-sand/80"
                        >
                          {block.label}
                        </a>
                        {block.after}
                      </p>
                    );
                  })}
                </div>
              </details>
            </ScrollReveal>
          ))}
        </ul>

        <ScrollReveal animation="fade-up" delay={200} duration={700} className="mt-10 flex justify-center">
          <a
            href={whatsappLink(AGENDAR_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary px-8 py-3"
          >
            Agendar
          </a>
        </ScrollReveal>
      </div>
    </section>
  );
}
