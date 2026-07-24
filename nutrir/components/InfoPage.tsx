import Link from "next/link";
import type { ReactNode } from "react";
import { PageHero } from "./PageHero";
import { Reveal } from "./Reveal";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function InfoPage({ title, subtitle, children }: Props) {
  return (
    <div>
      <PageHero eyebrow="Nutrir Piçarras" title={title} subtitle={subtitle} />

      <Reveal>
        <article className="mx-auto max-w-3xl px-4 py-12 md:py-16">
          <div className="space-y-5 text-sm leading-relaxed text-nutrir-emerald/90 md:text-base">
            {children}
          </div>

          <p className="mt-10 text-center text-sm text-nutrir-emerald/60">
            <Link href="/" className="font-medium text-nutrir-burgundy hover:underline">
              Voltar ao cardápio
            </Link>
          </p>
        </article>
      </Reveal>
    </div>
  );
}

export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg font-bold text-nutrir-emerald md:text-xl">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function InfoList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
