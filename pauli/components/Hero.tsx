import { FiMapPin, FiMonitor } from "react-icons/fi";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { ScrollReveal } from "@/components/ScrollReveal";
import { site, whatsappLink } from "@/lib/site";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-pauli-charcoal px-4 py-12 text-white dark:bg-black md:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(168,135,92,0.28),transparent_55%)]" />
      <div className="absolute inset-0 opacity-[0.04] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')]" />

      <div className="relative mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-2 md:gap-12">
        <ScrollReveal animation="fade-up" eager delay={80} duration={800} className="order-2 md:order-1">
          <h1 className="font-display text-3xl font-bold leading-[1.15] md:text-4xl lg:text-[2.65rem]">
            {site.heroTitle}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-white/80 md:mt-5">{site.heroSubtitle}</p>
          <div className="mt-6 flex flex-wrap gap-3 md:mt-8">
            <a
              href={whatsappLink("Olá Paula! Vim do seu site e gostaria de agendar uma consulta.")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary bg-white text-pauli-charcoal hover:bg-pauli-sand"
            >
              Agendar consulta
            </a>
            <a
              href="#acompanhamento"
              className="btn-secondary border-white/35 text-white hover:border-white hover:bg-white/10 hover:text-white"
            >
              Saber mais
            </a>
          </div>
        </ScrollReveal>

        <ScrollReveal
          animation="fade-right"
          eager
          delay={220}
          duration={900}
          className="order-1 flex w-full flex-col items-center md:order-2"
        >
          <ProfilePhoto size="hero" variant="hero" priority />
          <div className="mt-3 flex w-full max-w-[16rem] flex-col items-center gap-1.5 sm:max-w-[20rem] md:mt-4 md:gap-2 md:max-w-[20rem]">
            <p className="flex w-full items-center justify-center gap-1.5 text-center text-xs font-medium uppercase tracking-[0.15em] text-white/55">
              <FiMapPin className="shrink-0 text-sm" aria-hidden />
              {site.city}
            </p>
            <p className="flex w-full items-center justify-center gap-1.5 text-center text-xs font-medium uppercase tracking-[0.15em] text-white/55">
              <FiMonitor className="shrink-0 text-sm" aria-hidden />
              {site.heroOnline}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
