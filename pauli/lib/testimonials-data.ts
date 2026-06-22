/** Depoimentos em `public/depoimentos/{id}.jpeg` */
export const ALL_TESTIMONIAL_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export const FEATURED_TESTIMONIAL_IDS = [2, 3, 6, 7, 10, 11] as const;

export type TestimonialId = (typeof ALL_TESTIMONIAL_IDS)[number];

export function testimonialImageUrl(id: TestimonialId): string {
  return `/depoimentos/${id}.jpeg`;
}

export function getExtraTestimonialIds(): TestimonialId[] {
  const featured = new Set<number>(FEATURED_TESTIMONIAL_IDS);
  return ALL_TESTIMONIAL_IDS.filter((id) => !featured.has(id));
}
