import { MarmitaCard } from "./MarmitaCard";
import type { MenuSection as MenuSectionType } from "@/lib/menu-data";

interface Props {
  section: MenuSectionType;
}

export function MenuSection({ section }: Props) {
  return (
    <section id={section.id} className="scroll-mt-24">
      <div className="mb-6 border-l-4 border-nutrir-burgundy pl-4">
        <h2 className="section-title">{section.title}</h2>
        {section.subtitle && <p className="section-subtitle">{section.subtitle}</p>}
      </div>
      {section.comingSoon ? (
        <div className="card flex flex-col items-center justify-center border-dashed py-16 text-center">
          <span className="text-4xl opacity-60">✨</span>
          <p className="mt-4 font-display text-xl font-bold text-nutrir-emerald">Em breve</p>
          <p className="mt-2 max-w-sm text-sm text-nutrir-emerald/60">
            Novas opções premium chegando em breve. Fique de olho!
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {section.items.map((item) => (
            <MarmitaCard key={item.id} item={item} sectionId={section.id as "frango" | "carne" | "vegetariano"} />
          ))}
        </div>
      )}
    </section>
  );
}
