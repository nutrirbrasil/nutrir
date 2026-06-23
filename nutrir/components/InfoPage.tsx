import Link from "next/link";
import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function InfoPage({ title, subtitle, children }: Props) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-nutrir-burgundy/80">
        Nutrir Piçarras
      </p>
      <h1 className="section-title mt-2">{title}</h1>
      {subtitle ? (
        <p className="mt-3 font-display text-lg font-semibold leading-snug text-nutrir-emerald md:text-xl">
          {subtitle}
        </p>
      ) : null}

      <div className="card mt-8 space-y-5 text-sm leading-relaxed text-nutrir-emerald/90 md:text-base">
        {children}
      </div>

      <p className="mt-8 text-center text-sm text-nutrir-emerald/60">
        <Link href="/" className="font-medium text-nutrir-burgundy hover:underline">
          Voltar ao cardápio
        </Link>
      </p>
    </article>
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
