/** Depoimentos em `public/depoimentos/{id}.jpeg` */
export const ALL_TESTIMONIAL_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export const FEATURED_TESTIMONIAL_IDS = [2, 3, 6, 7, 10, 11] as const;

export type TestimonialId = (typeof ALL_TESTIMONIAL_IDS)[number];

/** Dimensões reais dos JPEGs em `public/depoimentos/`. */
export const TESTIMONIAL_DIMENSIONS: Record<
  TestimonialId,
  { width: number; height: number }
> = {
  1: { width: 739, height: 373 },
  2: { width: 739, height: 1452 },
  3: { width: 739, height: 1261 },
  4: { width: 1170, height: 525 },
  5: { width: 1170, height: 889 },
  6: { width: 739, height: 494 },
  7: { width: 739, height: 641 },
  8: { width: 923, height: 996 },
  9: { width: 1170, height: 665 },
  10: { width: 739, height: 1141 },
  11: { width: 1170, height: 1188 },
};

export function testimonialImageUrl(id: TestimonialId): string {
  return `/depoimentos/${id}.jpeg`;
}

export function getExtraTestimonialIds(): TestimonialId[] {
  const featured = new Set<number>(FEATURED_TESTIMONIAL_IDS);
  return ALL_TESTIMONIAL_IDS.filter((id) => !featured.has(id));
}
