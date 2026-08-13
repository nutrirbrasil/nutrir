import Image from "next/image";

function DietaryIcon({ src, label }: { src: string; label: string }) {
  return (
    <span className="relative inline-block h-5 w-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)] sm:h-6 sm:w-6">
      <Image src={src} alt={label} fill className="object-contain" sizes="24px" />
    </span>
  );
}

export function GlutenFreeBadge() {
  return <DietaryIcon src="/icons/sem-gluten.png" label="Sem glúten" />;
}

export function LactoseFreeBadge() {
  return <DietaryIcon src="/icons/sem-lactose.png" label="Sem lactose" />;
}
