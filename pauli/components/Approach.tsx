import type { IconType } from "react-icons";
import { FiActivity, FiHeart, FiTrendingUp } from "react-icons/fi";
import { LuBrain, LuUtensilsCrossed } from "react-icons/lu";
import { ScrollReveal } from "@/components/ScrollReveal";
import { site } from "@/lib/site";

const pillarIcons: Record<(typeof site.approach.pillars)[number]["icon"], IconType> = {
  science: LuBrain,
  food: LuUtensilsCrossed,
  performance: FiActivity,
  habits: FiTrendingUp,
  care: FiHeart,
};

export function Approach() {
  return (
    <section id="abordagem" className="scroll-mt-20 bg-pauli-cream px-4 py-20 dark:bg-black">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal animation="fade-up" duration={700}>
          <h2 className="section-title text-center">Minha abordagem</h2>
          <p className="dark-accent-body mx-auto mt-4 max-w-2xl text-center leading-relaxed">
            {site.approach.intro}
          </p>
        </ScrollReveal>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-6">
          {site.approach.pillars.map((pillar, index) => {
            const Icon = pillarIcons[pillar.icon];

            return (
              <ScrollReveal
                key={pillar.title}
                animation="fade-up"
                delay={index * 90}
                duration={650}
                as="li"
                className={`lg:col-span-2${index === 3 ? " lg:col-start-2" : ""}`}
              >
                <div className="surface-card h-full p-6 transition hover:border-pauli-gold/25 hover:shadow-md dark:hover:border-pauli-sand/25">
                  <h3 className="gold-text flex items-start gap-2.5 font-display text-lg font-bold leading-snug">
                    <Icon className="gold-icon mt-0.5 shrink-0 text-xl" aria-hidden />
                    <span>{pillar.title}</span>
                  </h3>
                  <p className="dark-accent-body mt-2 text-sm leading-relaxed">{pillar.description}</p>
                </div>
              </ScrollReveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
