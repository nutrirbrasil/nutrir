import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiBox, FiDroplet, FiLayers, FiTruck } from "react-icons/fi";
import type { IconType } from "react-icons";
import { logoUrl } from "@/lib/brand-assets";

interface HomeButtonProps {
  href: string;
  icon: IconType;
  title: string;
  subtitle: string;
}

function HomeButton({ href, icon: Icon, title, subtitle }: HomeButtonProps) {
  return (
    <Link
      href={href}
      className="card group flex items-center gap-4 !p-5 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-nutrir-emerald text-2xl text-nutrir-nude">
        <Icon aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-bold text-nutrir-emerald">{title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-nutrir-emerald/70">{subtitle}</span>
      </span>
      <FiArrowRight
        aria-hidden
        className="shrink-0 text-xl text-nutrir-burgundy transition group-hover:translate-x-1"
      />
    </Link>
  );
}

export function HomePage() {
  return (
    <div>
      <section className="card-dark relative isolate overflow-hidden rounded-none px-6 py-10 text-center md:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[300px] w-[640px] max-w-[150%] -translate-x-1/2 animate-glow-drift"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 42%, rgb(243 232 220 / 0.16), transparent 70%)",
          }}
        />

        <Image
          src={logoUrl()}
          alt="Nutrir Piçarras"
          width={72}
          height={72}
          className="mx-auto h-16 w-auto object-contain"
          priority
          unoptimized
        />

        <p
          className="eyebrow animate-fade-up mt-4 inline-flex items-center gap-1.5 text-[10px] text-nutrir-nude/60"
          style={{ animationDelay: "40ms" }}
        >
          <FiTruck aria-hidden />
          Entregas em Piçarras e Penha
        </p>

        <h1
          className="hero-heading animate-fade-up mx-auto mt-2.5 max-w-2xl text-[2.1rem] leading-[1.05] md:text-6xl"
          style={{ animationDelay: "120ms" }}
        >
          Nutrir Piçarras
        </h1>

        <div
          className="animate-fade-up mx-auto mt-3 flex items-center justify-center gap-3"
          style={{ animationDelay: "200ms" }}
          aria-hidden
        >
          <span className="h-px w-10 bg-nutrir-nude/25" />
          <span className="h-1.5 w-1.5 rotate-45 bg-nutrir-nude/45" />
          <span className="h-px w-10 bg-nutrir-nude/25" />
        </div>

        <p
          className="animate-fade-up mx-auto mt-3 max-w-xl text-[0.9rem] leading-relaxed text-nutrir-nude/85"
          style={{ animationDelay: "260ms" }}
        >
          Comida de verdade, feita por quem entende.
          <br />
          Escolha o que combina com sua rotina.
        </p>
      </section>

      <div className="mx-auto max-w-lg space-y-4 px-4 py-12">
        <HomeButton
          href="/combos"
          icon={FiLayers}
          title="Combos"
          subtitle="Kits semanais e mensais prontos, ou monte o seu do seu jeito."
        />
        <HomeButton
          href="/marmitas"
          icon={FiBox}
          title="Marmitas"
          subtitle="Marmitas avulsas, do jeito clássico, pra pedir na hora."
        />
        <HomeButton
          href="/sucos"
          icon={FiDroplet}
          title="Sucos"
          subtitle="Sucos naturais feitos na hora pra completar seu pedido."
        />
      </div>
    </div>
  );
}
