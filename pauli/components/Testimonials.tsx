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
          <h2 className="section-title mt-2 text-center">Depoimentos</h2>
          <p className="dark-accent-body mx-auto mt-3 max-w-xl text-center">
            Relatos reais de pessoas que transformaram a relação com a alimentação no acompanhamento
            nutricional.
          </p>
        </ScrollReveal>

        <ScrollReveal animation="fade-up" delay={160} duration={800} className="mt-12">
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {TESTIMONIALS.map((item, index) => (
              <figure key={item.id} className="surface-card rounded-xl p-2">
                <Image
                  src={testimonialImageUrl(item.file)}
                  alt={`Depoimentos de pacientes — parte ${item.id}`}
                  width={item.width}
                  height={item.height}
                  quality={90}
                  className="h-auto w-full rounded-lg"
                  sizes="(max-width: 640px) 50vw, 400px"
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
