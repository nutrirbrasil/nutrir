import Image from "next/image";
import { site } from "@/lib/site";

export function About() {
  return (
    <section id="sobre" className="scroll-mt-20 bg-pauli-sand/60 px-4 py-20">
      <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
        <div className="order-2 md:order-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-pauli-emerald/60">
            Sobre mim
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-pauli-charcoal md:text-4xl">
            {site.fullName}
          </h2>
          <p className="mt-1 font-display text-lg italic text-pauli-emerald/80">
            {site.subtitle} · {site.city}
          </p>

          <div className="mt-6 space-y-4 leading-relaxed text-pauli-charcoal/80">
            {site.bio.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>

          <p className="mt-6 text-sm text-pauli-emerald/60">{site.crn}</p>

          <a
            href={site.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm font-semibold text-pauli-burgundy hover:underline"
          >
            {site.instagram} no Instagram →
          </a>
        </div>

        <div className="order-1 md:order-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-xl">
            <Image
              src={site.profileImage}
              alt={site.fullName}
              fill
              className="object-cover object-top grayscale"
              sizes="(max-width: 768px) 100vw, 420px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-pauli-charcoal/50 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <p className="font-display text-2xl font-bold">{site.displayTitle}</p>
              <p className="text-sm text-white/80">{site.subtitle}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
