import Link from "next/link";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { ThemeToggle } from "@/components/ThemeToggle";
import { site } from "@/lib/site";

const nav = [
  { href: "#sobre", label: "Sobre" },
  { href: "#servicos", label: "Serviços" },
  { href: "#contato", label: "Contato" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-pauli-emerald/10 bg-pauli-cream/95 backdrop-blur dark:border-pauli-sand/15 dark:bg-[#0f1412]/95">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <ProfilePhoto size="sm" className="ring-2 ring-pauli-emerald/20 dark:ring-pauli-sand/25" />
          <div className="leading-tight">
            <span className="block font-display text-lg font-bold text-pauli-charcoal dark:text-pauli-cream">
              {site.name}
            </span>
            <span className="block text-xs italic text-pauli-emerald/70 dark:text-pauli-sand/75">
              {site.subtitle}
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-pauli-charcoal/75 transition hover:text-pauli-emerald dark:text-pauli-sand/80 dark:hover:text-pauli-cream"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <a href="#contato" className="btn-primary px-4 py-2 text-xs">
            Agendar
          </a>
        </div>
      </div>
    </header>
  );
}
