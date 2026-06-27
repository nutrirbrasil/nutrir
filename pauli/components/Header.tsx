import Image from "next/image";
import Link from "next/link";
import { logoImageUrl } from "@/lib/brand-assets";
import { site, whatsappLink } from "@/lib/site";

const nav = [
  { href: "/#sobre", label: "Sobre" },
  { href: "/#abordagem", label: "Abordagem" },
  { href: "/#acompanhamento", label: "Acompanhamento" },
  { href: "/#depoimentos", label: "Depoimentos" },
  { href: "/#contato", label: "Contato" },
  { href: "/#faq", label: "FAQ" },
  { href: "/blog", label: "Blog", highlight: true },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-pauli-sand/15 bg-black/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex min-w-0 items-center">
          <Image
            src={logoImageUrl()}
            alt={`${site.fullName} — ${site.subtitle}`}
            width={320}
            height={160}
            priority
            className="h-10 w-auto object-contain md:h-12"
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition hover:opacity-80 ${
                "highlight" in item && item.highlight ? "gold-text" : "detail-text"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/blog"
            className="gold-text text-sm font-medium transition hover:opacity-80 md:hidden"
          >
            Blog
          </Link>
          <a
            href={whatsappLink("Olá Paula! Quero agendar uma consulta.")}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary px-4 py-2 text-xs"
          >
            Agendar
          </a>
        </div>
      </div>
    </header>
  );
}
