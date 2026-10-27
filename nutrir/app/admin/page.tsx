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
  {
    href: "/admin/rotulos",
    label: "Rótulos nutricionais",
    description: "Gera o rótulo ANVISA de cada marmita (P/G) para imprimir e colar na embalagem.",
  },
  {
    href: "/admin/fichas-tecnicas",
    label: "Fichas técnicas",
    description: "Ingredientes e gramas de cada marmita, alimenta a tabela nutricional e o rótulo.",
  },
  {
    href: "/admin/cupons",
    label: "Cupons",
    description: "Lista de todos os cupons ativos, fixos e de parceiro, com suas regras e descontos.",
  },
  {
    href: "/admin/calculadora-producao",
    label: "Calculadora de produção",
    description: "Some as marmitas do dia e veja o total de cada ingrediente pra preparar, cru e pronto.",
  },
  {
    href: "/admin/calculadora-custo",
    label: "Custo de marmita personalizada",
    description: "Monte uma marmita com outras quantidades e veja o custo e quanto cobrar a mais ou a menos.",
  },
  {
    href: "/admin/calculadora-frete",
    label: "Calculadora de frete",
    description: "Digite a distância de ida (do Maps) e veja o custo de combustível da viagem de ida e volta.",
  },
];

export default function AdminPage() {
  const { ready } = useRequireAdmin();

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-nutrir-ink">Admin</h1>
      <p className="mt-1 text-sm text-nutrir-ink/60">Páginas de gerenciamento do Nutrir.</p>

      <div className="mt-6 space-y-3">
        {ADMIN_PAGES.map((page) => (
          <Link key={page.href} href={page.href} className="card card-lift block">
            <p className="font-display text-lg font-bold text-nutrir-ink">{page.label}</p>
            <p className="mt-1 text-sm text-nutrir-ink/70">{page.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
