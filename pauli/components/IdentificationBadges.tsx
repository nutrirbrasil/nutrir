import { FiCheck } from "react-icons/fi";
import { ScrollReveal } from "@/components/ScrollReveal";
import { site } from "@/lib/site";

const WIDE_BADGE = "Corredores e atletas amadores";

export function IdentificationBadges() {
  return (
    <section className="border-y border-pauli-gold/10 bg-white px-4 py-10 dark:border-pauli-sand/10 dark:bg-black">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal animation="fade-down" duration={600}>
          <p className="dark-accent-label text-center text-xs font-semibold uppercase tracking-[0.3em]">
            Especialidades
          </p>
        </ScrollReveal>
        <ul className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center sm:gap-4">
          {site.identificationBadges.map((label, index) => {
            const isWide = label === WIDE_BADGE;

            return (
              <ScrollReveal
                key={label}
                animation="scale-up"
                delay={index * 70}
                duration={550}
                as="li"
                className={isWide ? "col-span-2 sm:col-span-1" : undefined}
              >
                <span className="flex w-full items-center justify-center gap-1.5 rounded-full border border-pauli-gold/15 bg-pauli-cream/80 px-2.5 py-1.5 text-[11px] font-medium leading-tight text-pauli-charcoal dark:border-pauli-sand/20 dark:bg-black dark:text-pauli-sand sm:inline-flex sm:w-auto sm:gap-2 sm:px-4 sm:py-2 sm:text-sm sm:leading-normal">
                  <FiCheck className="gold-icon shrink-0 text-xs sm:text-base" aria-hidden />
                  {label}
                </span>
              </ScrollReveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
