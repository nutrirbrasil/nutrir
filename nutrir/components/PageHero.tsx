import type { ReactNode } from "react";

interface Props {
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Segunda linha de destaque, menor que o título, também em caixa alta. */
  tagline?: ReactNode;
  subtitle?: ReactNode;
}

/**
 * Cabeçalho editorial padrão das páginas internas: verde imersivo, título em
 * caixa alta com peso de marca (Fraunces black), bloom de luz e entrada
 * escalonada. Só CSS, sem estado no cliente.
 */
export function PageHero({ eyebrow, title, tagline, subtitle }: Props) {
  return (
    <section className="card-dark relative isolate overflow-hidden rounded-none px-6 py-7 text-center md:py-9">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[220px] w-[520px] max-w-[150%] -translate-x-1/2 animate-glow-drift"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 42%, rgb(243 232 220 / 0.15), transparent 70%)",
        }}
      />

      {eyebrow && (
        <p
          className="eyebrow animate-fade-up inline-flex items-center gap-1.5 text-[10px] text-nutrir-nude/60"
          style={{ animationDelay: "40ms" }}
        >
          {eyebrow}
        </p>
      )}

      <h1
        className="hero-heading animate-fade-up mx-auto mt-2.5 max-w-2xl text-[1.8rem] leading-[1.1] md:text-4xl"
        style={{ animationDelay: "120ms" }}
      >
        {title}
      </h1>

      <div
        className="animate-fade-up mx-auto mt-3 flex items-center justify-center gap-3"
        style={{ animationDelay: "200ms" }}
        aria-hidden
      >
        <span className="h-px w-10 bg-nutrir-nude/25" />
        <span className="h-1.5 w-1.5 rotate-45 bg-nutrir-nude/45" />
        <span className="h-px w-10 bg-nutrir-nude/25" />
      </div>

      {tagline && (
        <p
          className="animate-fade-up mx-auto mt-3 max-w-xl font-display text-sm font-bold uppercase tracking-wide text-nutrir-nude/85 sm:text-base md:text-lg"
          style={{ animationDelay: "260ms" }}
        >
          {tagline}
        </p>
      )}

      {subtitle && (
        <p
          className="animate-fade-up mx-auto mt-2.5 max-w-xl text-[0.85rem] leading-relaxed text-nutrir-nude/85"
          style={{ animationDelay: "320ms" }}
        >
          {subtitle}
        </p>
      )}
    </section>
  );
}
