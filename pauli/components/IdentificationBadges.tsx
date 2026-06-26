import { FiCheck } from "react-icons/fi";
import { ScrollReveal } from "@/components/ScrollReveal";
import { site } from "@/lib/site";

export function IdentificationBadges() {
  return (
    <section className="border-y border-pauli-gold/10 bg-white px-4 py-10 dark:border-pauli-sand/10 dark:bg-black">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal animation="fade-down" duration={600}>
          <p className="dark-accent-label text-center text-xs font-semibold uppercase tracking-[0.3em]">
            Especialidades
          </p>
        </ScrollReveal>
        <ul className="mt-6 flex flex-wrap justify-center gap-3 sm:gap-4">
          {site.identificationBadges.map((label, index) => (
            <ScrollReveal key={label} animation="scale-up" delay={index * 70} duration={550} as="li">
              <span className="inline-flex items-center gap-2 rounded-full border border-pauli-gold/15 bg-pauli-cream/80 px-4 py-2 text-sm font-medium text-pauli-charcoal dark:border-pauli-sand/20 dark:bg-black dark:text-pauli-sand">
                <FiCheck className="detail-text shrink-0" aria-hidden />
                {label}
              </span>
            </ScrollReveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
