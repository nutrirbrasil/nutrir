"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { ScrollReveal } from "@/components/ScrollReveal";
import {
  ALL_TESTIMONIAL_IDS,
  TESTIMONIAL_DIMENSIONS,
  testimonialImageUrl,
  type TestimonialId,
} from "@/lib/testimonials-data";

const MAX_IMAGE_WIDTH = 280;

function useVisibleCount() {
  const [count, setCount] = useState(3);

  useEffect(() => {
    function update() {
      if (window.matchMedia("(min-width: 1024px)").matches) setCount(3);
      else if (window.matchMedia("(min-width: 640px)").matches) setCount(2);
      else setCount(1);
    }

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return count;
}

function TestimonialCard({ id }: { id: TestimonialId }) {
  const { width, height } = TESTIMONIAL_DIMENSIONS[id];
  const displayWidth = Math.min(width, MAX_IMAGE_WIDTH);
  const displayHeight = Math.round((height / width) * displayWidth);

  return (
    <figure className="surface-card inline-block rounded-xl p-2">
      <Image
        src={testimonialImageUrl(id)}
        alt={`Depoimento de paciente ${id}`}
        width={displayWidth}
        height={displayHeight}
        className="block rounded-lg"
        sizes={`${MAX_IMAGE_WIDTH}px`}
      />
    </figure>
  );
}

export function Testimonials() {
  const visibleCount = useVisibleCount();
  const ids = ALL_TESTIMONIAL_IDS;
  const maxIndex = Math.max(0, ids.length - visibleCount);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex((current) => Math.min(current, maxIndex));
  }, [maxIndex]);

  const goPrev = useCallback(() => {
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  const goNext = useCallback(() => {
    setIndex((current) => Math.min(maxIndex, current + 1));
  }, [maxIndex]);

  const slidePercent = 100 / visibleCount;

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

        <ScrollReveal animation="fade-up" delay={160} duration={800} className="relative mt-12">
          <button
            type="button"
            onClick={goPrev}
            disabled={index === 0}
            aria-label="Depoimento anterior"
            className="absolute -left-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-pauli-gold/20 bg-white/95 text-pauli-charcoal shadow-md transition hover:border-pauli-gold/40 disabled:pointer-events-none disabled:opacity-30 dark:border-pauli-sand/25 dark:bg-[#1a1816]/95 dark:text-pauli-cream sm:-left-4 md:h-11 md:w-11"
          >
            <FiChevronLeft className="text-xl" aria-hidden />
          </button>

          <button
            type="button"
            onClick={goNext}
            disabled={index >= maxIndex}
            aria-label="Próximo depoimento"
            className="absolute -right-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-pauli-gold/20 bg-white/95 text-pauli-charcoal shadow-md transition hover:border-pauli-gold/40 disabled:pointer-events-none disabled:opacity-30 dark:border-pauli-sand/25 dark:bg-[#1a1816]/95 dark:text-pauli-cream sm:-right-4 md:h-11 md:w-11"
          >
            <FiChevronRight className="text-xl" aria-hidden />
          </button>

          <div className="overflow-hidden px-10 sm:px-12">
            <ul
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${index * slidePercent}%)` }}
            >
              {ids.map((id) => (
                <li
                  key={id}
                  className="flex shrink-0 grow-0 items-start justify-center px-2 sm:px-3"
                  style={{ flexBasis: `${slidePercent}%` }}
                >
                  <TestimonialCard id={id} />
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6 text-center text-xs text-pauli-charcoal/50 dark:text-pauli-sand/50">
            {index + 1}–{Math.min(index + visibleCount, ids.length)} de {ids.length}
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
