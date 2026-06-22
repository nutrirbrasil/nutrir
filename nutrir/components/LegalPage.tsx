import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";

interface Props {
  title: string;
  children: ReactNode;
}

export function LegalPage({ title, children }: Props) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-nutrir-emerald/55">
        Documento legal
      </p>
      <h1 className="section-title mt-2">{title}</h1>
      <p className="mt-2 text-sm text-nutrir-emerald/60">Última atualização: {LEGAL_LAST_UPDATED}</p>

      <div className="card mt-8 space-y-6 text-sm leading-relaxed text-nutrir-emerald/85">{children}</div>

      <p className="mt-8 text-center text-sm text-nutrir-emerald/60">
        <Link href="/politica-de-privacidade" className="font-medium hover:text-nutrir-burgundy hover:underline">
          Política de Privacidade
        </Link>
        {" · "}
        <Link href="/termos-de-uso" className="font-medium hover:text-nutrir-burgundy hover:underline">
          Termos de Uso
        </Link>
        {" · "}
        <Link href="/" className="font-medium hover:text-nutrir-burgundy hover:underline">
          Voltar ao site
        </Link>
      </p>
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg font-bold text-nutrir-emerald">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
