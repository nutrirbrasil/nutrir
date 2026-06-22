import { FiCheck } from "react-icons/fi";
import { site } from "@/lib/site";

export function IdentificationBadges() {
  return (
    <section className="border-y border-pauli-emerald/10 bg-white px-4 py-10 dark:border-pauli-sand/10 dark:bg-[#151c19]">
      <div className="mx-auto max-w-5xl">
        <p className="dark-accent-label text-center text-xs font-semibold uppercase tracking-[0.3em]">
          Selos de identificação
        </p>
        <ul className="mt-6 flex flex-wrap justify-center gap-3 sm:gap-4">
          {site.identificationBadges.map((label) => (
            <li
              key={label}
              className="inline-flex items-center gap-2 rounded-full border border-pauli-emerald/15 bg-pauli-cream/80 px-4 py-2 text-sm font-medium text-pauli-charcoal dark:border-pauli-sand/20 dark:bg-[#1a1816] dark:text-pauli-sand"
            >
              <FiCheck className="shrink-0 text-pauli-emerald dark:text-pauli-sand" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
