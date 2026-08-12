import { JuiceCard } from "./JuiceCard";
import type { JuiceCategory } from "@/lib/juice-data";

interface Props {
  category: JuiceCategory;
}

function ComingSoonCard() {
  return (
    <article className="card flex flex-col items-center justify-center border-dashed py-10 text-center sm:py-16">
      <span className="text-4xl opacity-60">✨</span>
      <p className="mt-4 font-display text-lg font-bold text-nutrir-emerald sm:text-xl">
        Em breve
      </p>
    </article>
  );
}

export function JuiceSection({ category }: Props) {
  return (
    <section id={category.id} className="scroll-mt-24">
      <div className="mb-6 border-l-4 border-nutrir-burgundy pl-4">
        <h2 className="section-title">{category.title}</h2>
        {category.subtitle && <p className="section-subtitle">{category.subtitle}</p>}
      </div>
      {category.comingSoon ? (
        <ComingSoonCard />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {category.items.map((item) => (
              <JuiceCard key={item.id} item={item} />
            ))}
          </div>
          {category.note && (
            <p className="mt-4 text-center text-xs italic text-nutrir-emerald/55">
              {category.note}
            </p>
          )}
        </>
      )}
    </section>
  );
}
