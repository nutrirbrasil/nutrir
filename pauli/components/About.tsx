import { site } from "@/lib/site";

export function About() {
  return (
    <section id="sobre" className="scroll-mt-20 bg-pauli-sage/50 px-4 py-20">
      <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
        <div className="order-2 md:order-1">
          <h2 className="section-title">Sobre mim</h2>
          <p className="mt-4 leading-relaxed text-pauli-emerald/80">
            Sou nutricionista em {site.city}, com foco em reeducação alimentar e relação saudável com
            a comida. Acredito que nutrição vai além da balança: é sobre energia, bem-estar e
            escolhas que cabem na sua vida.
          </p>
          <p className="mt-4 leading-relaxed text-pauli-emerald/80">
            Também faço parte da equipe por trás das marmitas fit{" "}
            <a
              href={site.marmitasUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-pauli-burgundy hover:underline"
            >
              Nutrir Piçarras
            </a>
            — refeições pensadas por nutricionistas para quem busca praticidade sem abrir mão da
            qualidade.
          </p>
          <p className="mt-4 text-sm text-pauli-emerald/60">{site.crn}</p>
        </div>

        <div className="order-1 flex justify-center md:order-2">
          <div className="aspect-[4/5] w-full max-w-sm rounded-2xl bg-pauli-emerald/10 flex items-center justify-center text-pauli-emerald/40 text-sm">
            Foto profissional
          </div>
        </div>
      </div>
    </section>
  );
}
