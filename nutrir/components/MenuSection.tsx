import Link from "next/link";
import { MarmitaCard } from "./MarmitaCard";
import { isPremiumMarmita, type MenuSection as MenuSectionType } from "@/lib/menu-data";

const INSTAGRAM_URL = "https://www.instagram.com/nutrirpicarras";

interface Props {
  section: MenuSectionType;
}

function PremiumInstagramCard() {
  return (
    <article className="card flex flex-col items-center justify-center border-dashed py-10 text-center sm:py-16">
      <span className="text-4xl opacity-60">✨</span>
      <p className="mt-4 font-display text-lg font-bold text-nutrir-emerald sm:text-xl">
        Em breve
      </p>
      <p className="mt-2 max-w-sm px-4 text-xs leading-snug text-nutrir-emerald/60 sm:text-sm">
        Novas opções premium chegando em breve.
      </p>
      <p className="mt-1 max-w-sm px-4 text-xs leading-snug sm:text-sm">
        <Link
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-nutrir-burgundy underline underline-offset-2 hover:text-nutrir-emerald"
        >
          Nos siga no Instagram.
        </Link>
      </p>
    </article>
  );
}

export function MenuSection({ section }: Props) {
  const isPremium = section.id === "premium";

  return (
    <section id={section.id} className="scroll-mt-24">
      <div className="mb-6 border-l-4 border-nutrir-burgundy pl-4">
        <h2 className="section-title">{section.title}</h2>
        {section.subtitle && <p className="section-subtitle">{section.subtitle}</p>}
      </div>
      {section.comingSoon ? (
        <PremiumInstagramCard />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {section.items.map((item) => (
            <MarmitaCard key={`${section.id}-${item.id}`} item={item} premiumBadge={isPremiumMarmita(item.id)} />
          ))}
          {isPremium && <PremiumInstagramCard />}
        </div>
      )}
    </section>
  );
}
