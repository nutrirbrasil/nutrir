import { MenuSection } from "./MenuSection";
import { MENU_SECTIONS } from "@/lib/menu-data";

export function MarmitasPage() {
  return (
    <div>
      <section className="card-dark relative overflow-hidden px-6 py-14 text-center md:py-20">
        <p className="font-display text-sm italic text-nutrir-nude/70">@nutrirpicarras</p>
        <h1 className="mt-2 font-display text-5xl font-bold tracking-tight text-nutrir-nude md:text-6xl">
          MARMITAS
        </h1>
        <p className="hero-tagline-stroke mt-3 font-sans text-lg font-bold uppercase tracking-[0.4em] md:text-xl">
          individuais
        </p>
        <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-nutrir-nude/85">
          Marmitas pensadas, desenvolvidas e montadas por nutricionistas.
          <br />
          Tudo para facilitar sua dieta e sua rotina.
        </p>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12">
        {MENU_SECTIONS.map((section) => (
          <MenuSection key={section.id} section={section} />
        ))}
        <p className="text-center text-xs leading-relaxed text-nutrir-emerald/55">
          *Valor promocional válido apenas para pagamentos em dinheiro ou pix
        </p>
      </div>
    </div>
  );
}
