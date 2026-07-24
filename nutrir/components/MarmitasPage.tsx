import { FiTruck } from "react-icons/fi";
import { MenuSection } from "./MenuSection";
import { PageHero } from "./PageHero";
import { Reveal } from "./Reveal";
import { MENU_SECTIONS } from "@/lib/menu-data";

export function MarmitasPage() {
  return (
    <div>
      <PageHero
        eyebrow={
          <>
            <FiTruck aria-hidden />
            Entregas em Piçarras e Penha
          </>
        }
        title="Marmitas individuais"
        tagline="Sabor para nutrir de verdade"
        subtitle={
          <>
            Marmitas completas desenvolvidas por nutricionistas,
            <br />
            pra diminuir todo o estresse de um dia corrido.
          </>
        }
      />

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12">
        {MENU_SECTIONS.map((section, index) => (
          <Reveal key={section.id} delay={index * 60}>
            <MenuSection section={section} />
          </Reveal>
        ))}
        <p className="text-center text-xs leading-relaxed text-nutrir-emerald/55">
          *Valor promocional válido apenas para pagamentos em dinheiro ou pix
        </p>
      </div>
    </div>
  );
}
