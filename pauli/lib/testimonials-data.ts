/** Incremente ao trocar imagens em `public/depoimentos/`. */
export const TESTIMONIAL_VERSION = "1";

export const TESTIMONIALS = [
  { id: 1, file: "1.png", width: 1080, height: 1350 },
  { id: 2, file: "2.png", width: 1080, height: 1350 },
] as const;

export function testimonialImageUrl(file: string): string {
  return `/depoimentos/${encodeURIComponent(file)}?v=${TESTIMONIAL_VERSION}`;
}
