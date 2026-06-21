import Image from "next/image";
import { FiMapPin } from "react-icons/fi";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { logoImageUrl } from "@/lib/brand-assets";
import { site, whatsappLink } from "@/lib/site";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-pauli-charcoal px-4 py-20 text-white dark:bg-black md:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(15,77,58,0.35),transparent_55%)]" />
      <div className="absolute inset-0 opacity-[0.04] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')]" />

      <div className="relative mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
        <div className="order-2 md:order-1">
          <Image
            src={logoImageUrl()}
            alt={`${site.fullName} — ${site.subtitle}`}
            width={320}
            height={160}
            priority
            className="h-auto w-44 object-contain md:w-52"
          />
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.1] md:text-5xl">
            Nutrição com estratégia, leveza e resultado real
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-white/80">{site.tagline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={whatsappLink("Olá Pauli! Vim do seu site e gostaria de agendar uma consulta.")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary bg-white text-pauli-charcoal hover:bg-pauli-sand"
            >
              Agendar consulta
            </a>
            <a
              href="#sobre"
              className="btn-secondary border-white/35 text-white hover:border-white hover:bg-white/10 hover:text-white"
            >
              Saber mais
            </a>
          </div>
        </div>

        <div className="order-1 flex flex-col items-center md:order-2 md:items-end">
          <ProfilePhoto size="hero" variant="hero" priority />
          <p className="mt-4 flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.2em] text-white/55 md:tracking-[0.35em]">
            <FiMapPin className="shrink-0 text-sm" aria-hidden />
            {site.city}
          </p>
        </div>
      </div>
    </section>
  );
}
