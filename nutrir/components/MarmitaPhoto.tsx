import Image from "next/image";

interface Props {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fit?: "contain" | "cover";
}

export function MarmitaPhoto({ src, alt, className = "", sizes, priority, fit = "contain" }: Props) {
  return (
    <div className={`relative ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className={fit === "cover" ? "object-cover object-center" : "object-contain object-center"}
        sizes={sizes ?? "96px"}
        priority={priority}
      />
    </div>
  );
}
