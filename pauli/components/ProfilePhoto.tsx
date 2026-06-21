import Image from "next/image";
import { heroImageUrl, profileImageUrl } from "@/lib/brand-assets";
import { site } from "@/lib/site";

type Props = {
  size?: "sm" | "md" | "lg" | "hero";
  variant?: "hero" | "profile";
  className?: string;
  priority?: boolean;
};

const sizes = {
  sm: { box: "h-10 w-10", px: 40 },
  md: { box: "h-28 w-28", px: 112 },
  lg: { box: "h-72 w-72 md:h-80 md:w-80", px: 320 },
  hero: { box: "h-64 w-64 md:h-80 md:w-80", px: 320 },
};

export function ProfilePhoto({
  size = "lg",
  variant = "profile",
  className = "",
  priority = false,
}: Props) {
  const { box, px } = sizes[size];
  const src = variant === "hero" ? heroImageUrl() : profileImageUrl();

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full ring-4 ring-white/25 shadow-2xl ${box} ${className}`}
    >
      <Image
        src={src}
        alt={`${site.fullName} — ${site.subtitle}`}
        width={px}
        height={px}
        priority={priority}
        className="h-full w-full object-cover object-center"
      />
    </div>
  );
}
