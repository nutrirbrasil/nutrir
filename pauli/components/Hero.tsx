import { ProfilePhoto } from "@/components/ProfilePhoto";
import { site, whatsappLink } from "@/lib/site";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-pauli-charcoal px-4 py-20 text-white md:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(15,77,58,0.35),transparent_55%)]" />
      <div className="absolute inset-0 opacity-[0.04] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')]" />

      <div className="relative mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
        <div className="order-2 md:order-1">
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-white/55">
            {site.city}
          </p>
          <p className="mt-3 font-display text-sm italic tracking-wide text-pauli-sand/80">
            {site.displayTitle} · {site.subtitle}
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-[1.1] md:text-5xl">
            Nutrição com estratégia, leveza e resultado real
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-white/80">{site.tagline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#contato"
              className="btn-primary bg-white text-pauli-charcoal hover:bg-pauli-sand"
            >
              Agendar consulta
            </a>
            <a
              href={whatsappLink("Olá Pauli! Gostaria de saber mais sobre a consulta.")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary border-white/35 text-white hover:border-white hover:bg-white/10 hover:text-white"
            >
              WhatsApp
            </a>
            <a
              href={site.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary border-white/20 text-white/90 hover:border-white/50 hover:bg-white/5"
            >
              Instagram
            </a>
          </div>
        </div>

        <div className="order-1 flex justify-center md:order-2 md:justify-end">
          <ProfilePhoto size="hero" priority />
        </div>
      </div>
    </section>
  );
}
