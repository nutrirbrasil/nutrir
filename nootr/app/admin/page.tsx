"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";

/**
 * Índice das páginas de admin, só pra não esquecer o caminho. O acesso de
 * verdade é checado em cada página/rota (ver routes/nootr/admin.py), esta
 * tela em si não expõe dado nenhum.
 */
const ADMIN_PAGES = [
  {
    href: "/aprovar",
    label: "Fila de aprovação",
    description: "Receitas, alimentos customizados e dietas geradas por IA pendentes de revisão.",
  },
];

function AdminContent() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="divider-bordo mb-4" />
      <h1 className="font-display text-4xl text-nootr-cream">Admin</h1>
      <p className="mt-2 text-sm text-nootr-muted">Páginas de gerenciamento do Nootr.</p>

      <div className="mt-8 space-y-3">
        {ADMIN_PAGES.map((page) => (
          <Link key={page.href} href={page.href} className="card card-hover block">
            <p className="font-display text-xl text-nootr-cream">{page.label}</p>
            <p className="mt-1 text-sm text-nootr-muted">{page.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return <RequireAuth>{() => <AdminContent />}</RequireAuth>;
}
