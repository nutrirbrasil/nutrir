import { GiWheat, GiMilkCarton } from "react-icons/gi";
import type { IconType } from "react-icons";

function CrossedIcon({ icon: Icon, label }: { icon: IconType; label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="relative inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border-2 border-nutrir-nude text-nutrir-nude drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)] sm:h-6 sm:w-6"
    >
      <Icon className="h-[45%] w-[45%]" />
      <span className="absolute left-[-8%] top-1/2 h-[2px] w-[116%] -translate-y-1/2 rotate-45 bg-nutrir-nude" />
    </span>
  );
}

export function GlutenFreeBadge() {
  return <CrossedIcon icon={GiWheat} label="Sem glúten" />;
}

export function LactoseFreeBadge() {
  return <CrossedIcon icon={GiMilkCarton} label="Sem lactose" />;
}
