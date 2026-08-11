import { GiWheat, GiMilkCarton } from "react-icons/gi";
import type { IconType } from "react-icons";

function CrossedIcon({ icon: Icon, label }: { icon: IconType; label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="relative inline-flex h-4 w-4 items-center justify-center text-nutrir-nude drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)] sm:h-5 sm:w-5"
    >
      <Icon className="h-full w-full" />
      <span className="absolute left-[-15%] top-1/2 h-[1.5px] w-[130%] -translate-y-1/2 -rotate-45 bg-current" />
    </span>
  );
}

export function GlutenFreeBadge() {
  return <CrossedIcon icon={GiWheat} label="Sem glúten" />;
}

export function LactoseFreeBadge() {
  return <CrossedIcon icon={GiMilkCarton} label="Sem lactose" />;
}
