import Image from "next/image";
import { ScrollReveal } from "@/components/ScrollReveal";
import { aboutImageUrl } from "@/lib/brand-assets";
import { site } from "@/lib/site";

function AboutParagraphs({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-4 leading-relaxed text-pauli-charcoal/80 dark:text-pauli-sand/85 ${className}`}>
      {site.aboutParagraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

export function About() {
  return (
    <section id="sobre" className="scroll-mt-20 bg-pauli-sand/60 px-4 py-20 dark:bg-[#1a1816]">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 md:items-center md:gap-10">
        <ScrollReveal animation="fade-left" duration={800} className="order-1">
          <p className="dark-accent-label text-xs font-semibold uppercase tracking-[0.3em]">
            {site.aboutTitle}
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-pauli-charcoal dark:text-pauli-cream md:text-4xl">
            {site.formalName}
          </h2>
          <AboutParagraphs className="mt-5 hidden md:mt-6 md:block" />
        </ScrollReveal>

        <ScrollReveal animation="fade-right" delay={120} duration={900} className="order-2">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl shadow-xl md:max-w-none">
            <Image
              src={aboutImageUrl()}
              alt={site.fullName}
              fill
              quality={90}
              className="object-cover object-center"
              sizes="(max-width: 768px) 384px, 480px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-pauli-charcoal/50 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white md:p-6">
              <p className="text-sm text-white/80">{site.subtitle}</p>
              <p className="mt-1 text-xs text-white/65">{site.crn}</p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal animation="fade-left" delay={80} duration={800} className="order-3 md:hidden">
          <AboutParagraphs />
        </ScrollReveal>
      </div>
    </section>
  );
}
