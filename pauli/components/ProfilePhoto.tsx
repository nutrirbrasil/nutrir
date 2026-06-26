import Image from "next/image";
import { heroImageUrl, iconImageUrl, profileImageUrl } from "@/lib/brand-assets";
import { site } from "@/lib/site";

type Props = {
  size?: Size;
  variant?: "hero" | "profile" | "icon";
  className?: string;
  priority?: boolean;
};

const sizeConfig = {
  sm: { box: "h-10 w-10", sizes: "40px" },
  md: { box: "h-28 w-28", sizes: "112px" },
  contact: { box: "h-44 w-44 md:h-52 md:w-52", sizes: "(max-width: 768px) 176px, 208px" },
  lg: { box: "h-72 w-72 md:h-80 md:w-80", sizes: "(max-width: 768px) 288px, 320px" },
  hero: { box: "h-48 w-48 md:h-80 md:w-80", sizes: "(max-width: 768px) 192px, 320px" },
} as const;

type Size = keyof typeof sizeConfig;

function imageSrc(variant: Props["variant"]) {
  if (variant === "hero") return heroImageUrl();
  if (variant === "icon") return iconImageUrl();
  return profileImageUrl();
}

export function ProfilePhoto({
  size = "lg",
  variant = "profile",
  className = "",
  priority = false,
}: Props) {
  const { box, sizes } = sizeConfig[size];
  const isIcon = variant === "icon";

  return (
    <div
      className={`relative shrink-0 overflow-hidden shadow-2xl ${isIcon ? "rounded-full bg-black" : "rounded-full ring-4 ring-white/25"} ${box} ${className}`}
    >
      <Image
        src={imageSrc(variant)}
        alt={isIcon ? site.name : `${site.fullName} — ${site.subtitle}`}
        fill
        quality={90}
        priority={priority}
        sizes={sizes}
        className={`${isIcon ? "object-contain p-1" : "object-cover object-center"}`}
      />
    </div>
  );
}
