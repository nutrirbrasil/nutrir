"use client";

import Image from "next/image";
import { useState } from "react";
import {
  FEATURED_TESTIMONIAL_IDS,
  getExtraTestimonialIds,
  testimonialImageUrl,
  type TestimonialId,
} from "@/lib/testimonials-data";

function TestimonialCard({ id }: { id: TestimonialId }) {
  return (
    <li className="surface-card overflow-hidden p-2 transition hover:border-pauli-emerald/25 hover:shadow-md dark:hover:border-pauli-sand/25">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-pauli-sand/40 dark:bg-[#252220]">
        <Image
          src={testimonialImageUrl(id)}
          alt={`Depoimento de paciente ${id}`}
          fill
          className="object-cover object-top"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
        />
      </div>
    </li>
  );
}

export function Testimonials() {
  const [showAll, setShowAll] = useState(false);
  const extraIds = getExtraTestimonialIds();
  const hasMore = extraIds.length > 0;

  return (
    <section id="depoimentos" className="scroll-mt-20 bg-pauli-sand/60 px-4 py-20 dark:bg-[#1a1816]">
      <div className="mx-auto max-w-5xl">
        <p className="dark-accent-label text-center text-xs font-semibold uppercase tracking-[0.3em]">
          Quem já passou por aqui
        </p>
        <h2 className="section-title mt-2 text-center">Depoimentos</h2>
        <p className="dark-accent-body mx-auto mt-3 max-w-xl text-center">
          Relatos reais de pessoas que transformaram a relação com a alimentação no acompanhamento
          nutricional.
        </p>

        <ul className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          {FEATURED_TESTIMONIAL_IDS.map((id) => (
            <TestimonialCard key={id} id={id} />
          ))}
          {showAll &&
            extraIds.map((id) => (
              <TestimonialCard key={id} id={id} />
            ))}
        </ul>

        {hasMore && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => setShowAll((open) => !open)}
              className="btn-secondary"
            >
              {showAll ? "Ver menos" : "Ver mais depoimentos"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
