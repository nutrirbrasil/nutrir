"use client";

import Link from "next/link";
import { useRequireAdmin } from "@/lib/use-require-admin";

/** Índice das páginas de admin, só pra não esquecer o caminho. */
const ADMIN_PAGES = [
  {
    href: "/admin/pedidos",
    label: "Pedidos",
    description: "Fila de pedidos, status de pagamento e entrega/retirada.",
  },
];

export default function AdminPage() {
  const { ready } = useRequireAdmin();

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-nutrir-emerald">Admin</h1>
      <p className="mt-1 text-sm text-nutrir-emerald/60">Páginas de gerenciamento do Nutrir.</p>

      <div className="mt-6 space-y-3">
        {ADMIN_PAGES.map((page) => (
          <Link key={page.href} href={page.href} className="card card-lift block">
            <p className="font-display text-lg font-bold text-nutrir-emerald">{page.label}</p>
            <p className="mt-1 text-sm text-nutrir-emerald/70">{page.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
