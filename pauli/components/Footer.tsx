import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-pauli-gold/20 bg-pauli-charcoal py-10 text-pauli-sand dark:border-pauli-gold/15 dark:bg-black">
      <div className="mx-auto max-w-5xl px-4 text-center text-sm">
        <p className="font-display text-lg text-pauli-gold-light">{site.fullName}</p>
        <p className="mt-1 text-pauli-sand/80">{site.subtitle} · {site.city}</p>
        <a
          href={site.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="gold-text mt-3 inline-block hover:underline"
        >
          {site.instagram}
        </a>
        <p className="mt-4 text-pauli-gray-light/80">
          {site.crn} ·{" "}
          <a href={`mailto:${site.email}`} className="gold-text hover:underline">
            {site.email}
          </a>
        </p>
        <p className="mt-2 text-pauli-gray-muted">© {new Date().getFullYear()} — Todos os direitos reservados</p>
      </div>
    </footer>
  );
}
