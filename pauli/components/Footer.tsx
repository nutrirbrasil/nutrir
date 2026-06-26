import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-pauli-burgundy/20 bg-pauli-charcoal py-10 text-pauli-sand dark:border-pauli-burgundy/15 dark:bg-black">
      <div className="mx-auto max-w-5xl px-4 text-center text-sm">
        <p className="font-display text-lg text-pauli-burgundy-light">{site.fullName}</p>
        <p className="mt-1 text-pauli-sand/80">{site.subtitle} · {site.city}</p>
        <p className="mt-4 text-pauli-gray-muted">© {new Date().getFullYear()} — Todos os direitos reservados</p>
      </div>
    </footer>
  );
}
