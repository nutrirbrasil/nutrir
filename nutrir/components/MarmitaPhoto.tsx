import Image from "next/image";

export type MarmitaPhotoVariant = "side" | "top" | "combo";

interface Props {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  variant?: MarmitaPhotoVariant;
}

const VARIANT_CLASS: Record<MarmitaPhotoVariant, string> = {
  /** Vista lateral com recorte e blend para sumir fundo preto do JPG. */
  side: "scale-[1.55] object-cover object-center mix-blend-lighten",
  /** Miniatura de cima no modal de adicionais. */
  top: "scale-[1.25] object-cover object-center mix-blend-lighten",
  /** Combos — recorte moderado. */
  combo: "scale-[1.35] object-cover object-center mix-blend-lighten",
};

export function MarmitaPhoto({
  src,
  alt,
  className = "",
  sizes,
  priority,
  variant = "side",
}: Props) {
  return (
    <div className={`relative overflow-hidden bg-nutrir-nude ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className={VARIANT_CLASS[variant]}
        sizes={sizes ?? "96px"}
        priority={priority}
      />
    </div>
  );
}
