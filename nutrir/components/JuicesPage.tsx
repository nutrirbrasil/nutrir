import { FiTruck } from "react-icons/fi";
import { JuiceSection } from "./JuiceSection";
import { PageHero } from "./PageHero";
import { Reveal } from "./Reveal";
import { JUICE_CATEGORIES } from "@/lib/juice-data";

export function JuicesPage() {
  return (
    <div>
      <PageHero
        eyebrow={
          <>
            <FiTruck aria-hidden />
            Entregas em Piçarras e Penha
          </>
        }
        title="Sucos naturais"
        tagline="Direto da fruta pra você"
        subtitle={
          <>
            Sucos feitos na hora, sem conservantes,
            <br />
            pra acompanhar sua marmita ou pedir à parte.
          </>
        }
      />

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12">
        {JUICE_CATEGORIES.map((category, index) => (
          <Reveal key={category.id} delay={index * 60}>
            <JuiceSection category={category} />
          </Reveal>
        ))}
        <p className="text-center text-xs leading-relaxed text-nutrir-emerald/55">
          *Valor promocional válido apenas para pagamentos em dinheiro ou pix
        </p>
      </div>
    </div>
  );
}
