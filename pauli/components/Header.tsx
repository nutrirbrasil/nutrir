import Link from "next/link";
import { site } from "@/lib/site";

const nav = [
  { href: "#sobre", label: "Sobre" },
  { href: "#servicos", label: "Serviços" },
  { href: "#contato", label: "Contato" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-pauli-emerald/10 bg-pauli-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="font-display text-xl font-bold text-pauli-emerald">
          {site.name}
          <span className="ml-1 text-sm font-normal italic text-pauli-emerald/70">nutrição</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-pauli-emerald/80 transition hover:text-pauli-emerald"
            >
              {item.label}
            </a>
          ))}
          <a
            href={site.marmitasUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-pauli-burgundy hover:underline"
          >
            Marmitas Nutrir
          </a>
        </nav>

        <a href="#contato" className="btn-primary shrink-0 px-4 py-2 text-xs">
          Agendar
        </a>
      </div>
    </header>
  );
}
