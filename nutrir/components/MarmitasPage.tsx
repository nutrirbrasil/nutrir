import { FiTruck } from "react-icons/fi";
import { MenuSection } from "./MenuSection";
import { PageHero } from "./PageHero";
import { MarmitasQuickNav } from "./MarmitasQuickNav";
import { Reveal } from "./Reveal";
import { MENU_SECTIONS } from "@/lib/menu-data";

export function MarmitasPage() {
  return (
    <div>
      <PageHero
        eyebrow={
          <>
            <FiTruck aria-hidden />
            Entregas em Piçarras, Penha, Barra Velha e Navegantes
          </>
        }
        title="Marmitas individuais"
        tagline="Sabor para nutrir de verdade"
        subtitle={
          "Organize seu dia e ganhe mais praticidade no seu dia a dia."
        }
      />

      <MarmitasQuickNav />

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-8">
        {MENU_SECTIONS.map((section, index) => (
          <Reveal key={section.id} delay={index * 60}>
            <MenuSection section={section} />
          </Reveal>
        ))}
        <p className="text-center text-xs leading-relaxed text-nutrir-ink/55">
          *Escondidinhos usam leite zero lactose, se você é vegano ou tem alergia ao leite, é
          possível substituir por leite vegetal em Substituições, logo após Adicionar.
        </p>
        <p className="text-center text-xs leading-relaxed text-nutrir-ink/55">
          *Valor promocional válido apenas para pagamentos em dinheiro ou pix
        </p>
      </div>
    </div>
  );
}
