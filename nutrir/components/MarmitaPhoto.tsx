import Image from "next/image";

interface Props {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export function MarmitaPhoto({ src, alt, className = "", sizes, priority }: Props) {
  return (
    <div className={`relative ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain object-center"
        sizes={sizes ?? "96px"}
        priority={priority}
      />
    </div>
  );
}
