import Image from "next/image";

interface Props {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Amplia e recorta bordas transparentes do PNG para preencher melhor o espaço. */
  cropped?: boolean;
}

export function MarmitaPhoto({
  src,
  alt,
  className = "",
  sizes,
  priority,
  cropped = false,
}: Props) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className={
          cropped
            ? "object-cover object-center scale-[1.55]"
            : "object-contain object-center"
        }
        sizes={sizes ?? "96px"}
        priority={priority}
      />
    </div>
  );
}
