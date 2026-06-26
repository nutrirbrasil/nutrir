import Image from "next/image";
import { ScrollReveal } from "@/components/ScrollReveal";
import { aboutImageUrl } from "@/lib/brand-assets";
import { site } from "@/lib/site";

export function About() {
  return (
    <section id="sobre" className="scroll-mt-20 bg-pauli-sand/60 px-4 py-20 dark:bg-[#1a1816]">
      <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
        <ScrollReveal animation="fade-left" duration={800} className="order-2 md:order-1">
          <p className="dark-accent-label text-xs font-semibold uppercase tracking-[0.3em]">
            {site.aboutTitle}
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-pauli-charcoal dark:text-pauli-cream md:text-4xl">
            {site.formalName}
          </h2>

          <p className="mt-6 leading-relaxed text-pauli-charcoal/80 dark:text-pauli-sand/85">
            {site.aboutIntro}
          </p>
        </ScrollReveal>

        <ScrollReveal
          animation="fade-right"
          delay={120}
          duration={900}
          className="order-1 md:order-2"
        >
          <div className="relative aspect-[3/5] overflow-hidden rounded-2xl shadow-xl">
            <Image
              src={aboutImageUrl()}
              alt={site.fullName}
              fill
              quality={90}
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 420px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-pauli-charcoal/50 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <p className="font-display text-2xl font-bold">{site.displayTitle}</p>
              <p className="text-sm text-white/80">{site.subtitle}</p>
              <p className="mt-1 text-xs text-white/65">{site.crn}</p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
