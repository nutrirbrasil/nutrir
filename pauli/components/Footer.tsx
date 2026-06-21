import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-pauli-emerald/10 bg-pauli-emerald py-10 text-pauli-sage">
      <div className="mx-auto max-w-5xl px-4 text-center text-sm">
        <p className="font-display text-lg text-white">{site.fullName}</p>
        <p className="mt-1 opacity-80">{site.city}</p>
        <p className="mt-4 opacity-70">{site.crn} · {site.email}</p>
        <p className="mt-2 opacity-60">© {new Date().getFullYear()} — Todos os direitos reservados</p>
      </div>
    </footer>
  );
}
