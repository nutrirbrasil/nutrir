import Image from "next/image";
import Link from "next/link";
import { logoImageUrl } from "@/lib/brand-assets";
import { site, whatsappLink } from "@/lib/site";

const nav = [
  { href: "#sobre", label: "Sobre", external: false },
  { href: "#abordagem", label: "Abordagem", external: false },
  { href: "#acompanhamento", label: "Acompanhamento", external: false },
  { href: "#depoimentos", label: "Depoimentos", external: false },
  { href: "/blog", label: "Blog", external: true },
  { href: "#contato", label: "Contato", external: false },
  { href: "#faq", label: "FAQ", external: false },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-pauli-sand/15 bg-[#0f1412]/95 backdrop-blur">
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
          {nav.map((item) =>
            item.external ? (
              <Link
                key={item.href}
                href={item.href}
                className="detail-text text-sm font-medium transition hover:opacity-80"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.href}
                href={item.href}
                className="detail-text text-sm font-medium transition hover:opacity-80"
              >
                {item.label}
              </a>
            ),
          )}
        </nav>

        <div className="flex shrink-0 items-center">
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
