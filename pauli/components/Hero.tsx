import { site, whatsappLink } from "@/lib/site";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-pauli-emerald px-4 py-20 text-white md:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)]" />
      <div className="relative mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/70">
            {site.city}
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">
            Nutrição com acolhimento e resultados reais
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-white/85">
            Consultoria personalizada para você construir hábitos sustentáveis — sem dietas
            restritivas impossíveis de manter.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#contato" className="btn-primary bg-white text-pauli-emerald hover:bg-pauli-sage">
              Agendar consulta
            </a>
            <a
              href={whatsappLink("Olá! Gostaria de saber mais sobre a consulta.")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary border-white/40 text-white hover:border-white hover:bg-white/10 hover:text-white"
            >
              WhatsApp
            </a>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <div className="flex h-64 w-64 items-center justify-center rounded-full border-4 border-white/20 bg-white/10 font-display text-6xl font-bold text-white/90 md:h-72 md:w-72">
            P
          </div>
        </div>
      </div>
    </section>
  );
}
