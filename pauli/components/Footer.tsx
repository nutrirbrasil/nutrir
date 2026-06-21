import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-pauli-emerald/10 bg-pauli-emerald py-10 text-pauli-sage dark:border-pauli-emerald/30 dark:bg-pauli-emerald-dark">
      <div className="mx-auto max-w-5xl px-4 text-center text-sm">
        <p className="font-display text-lg text-white">{site.fullName}</p>
        <p className="mt-1 opacity-80">{site.subtitle} · {site.city}</p>
        <a
          href={site.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block opacity-80 hover:opacity-100 hover:underline"
        >
          {site.instagram}
        </a>
        <p className="mt-4 opacity-70">
          {site.crn} ·{" "}
          <a href={`mailto:${site.email}`} className="hover:underline">
            {site.email}
          </a>
        </p>
        <p className="mt-2 opacity-60">© {new Date().getFullYear()} — Todos os direitos reservados</p>
      </div>
    </footer>
  );
}
