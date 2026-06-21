import Link from "next/link";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { site } from "@/lib/site";

const nav = [
  { href: "#sobre", label: "Sobre" },
  { href: "#servicos", label: "Serviços" },
  { href: "#contato", label: "Contato" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-pauli-emerald/10 bg-pauli-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <ProfilePhoto size="sm" className="ring-2 ring-pauli-emerald/20" />
          <div className="leading-tight">
            <span className="block font-display text-lg font-bold text-pauli-charcoal">
              {site.name}
            </span>
            <span className="block text-xs italic text-pauli-emerald/70">{site.subtitle}</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-pauli-charcoal/75 transition hover:text-pauli-emerald"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <a href="#contato" className="btn-primary shrink-0 px-4 py-2 text-xs">
          Agendar
        </a>
      </div>
    </header>
  );
}
