import Image from "next/image";
import { ScrollReveal } from "@/components/ScrollReveal";
import { TESTIMONIALS, testimonialImageUrl } from "@/lib/testimonials-data";

export function Testimonials() {
  return (
    <section id="depoimentos" className="scroll-mt-20 bg-pauli-sand/60 px-4 py-20 dark:bg-[#1a1816]">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal animation="fade-up" duration={700}>
          <p className="dark-accent-label text-center text-xs font-semibold uppercase tracking-[0.3em]">
            Quem já passou por aqui
          </p>
          <h2 className="gold-text mt-2 text-center font-display text-3xl font-bold md:text-4xl">
            Depoimentos
          </h2>
          <p className="dark-accent-body mx-auto mt-3 max-w-xl text-center">
            Relatos reais de pessoas que transformaram a relação com a alimentação no acompanhamento
            nutricional.
          </p>
        </ScrollReveal>

        <ScrollReveal animation="fade-up" delay={160} duration={800} className="mt-12">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {TESTIMONIALS.map((item, index) => (
              <figure key={item.id} className="mx-auto w-full max-w-lg md:max-w-none">
                <Image
                  src={testimonialImageUrl(item.file)}
                  alt={`Depoimentos de pacientes — parte ${item.id}`}
                  width={item.width}
                  height={item.height}
                  quality={90}
                  className="h-auto w-full rounded-xl"
                  sizes="(max-width: 768px) 92vw, 480px"
                  priority={index === 0}
                />
              </figure>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
