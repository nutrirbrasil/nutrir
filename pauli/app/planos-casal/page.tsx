import type { Metadata } from "next";
import Link from "next/link";
import { PricingCard, type PricingCardData } from "@/components/PricingCard";
import { site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: `Planos Casal | ${site.fullName}`,
  description: `Acompanhamento nutricional em dupla com ${site.fullName}, ${site.subtitle}.`,
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: `Planos Casal | ${site.fullName}`,
    description: "Consulta inicial, acompanhamento trimestral e semestral para duas pessoas.",
    images: [{ url: site.iconImage }],
  },
};

const priceCards: PricingCardData[] = [
  {
    title: "Consulta Inicial Casal",
    tagline: "Duas consultas iniciais, com suporte por 30 dias para cada um.",
    card: { price: "R$ 549", from: "R$ 600" },
    pix: { price: "R$ 519", note: "R$ 260 por pessoa" },
    whatsappMessage: "Olá Paula! Analisei os planos e temos interesse no Plano Casal, Consulta Inicial.",
  },
  {
    title: "Plano Trimestral Casal",
    tagline: "Acompanhamento contínuo por 3 meses, para ambos (6 consultas no total)",
    card: { price: "R$ 1.449", from: "R$ 1.600", installments: "ou parcelado em até 3x (sujeito a taxas)" },
    pix: { price: "R$ 1.369", note: "R$ 228 por consulta" },
    featured: true,
    featuredLabel: "Mais escolhido pelos casais",
    whatsappMessage: "Olá Paula! Analisei os planos e temos interesse no Plano Casal Trimestral.",
  },
  {
    title: "Plano Semestral Casal",
    tagline: "Acompanhamento contínuo por 6 meses, para ambos (12 consultas no total)",
    card: { price: "R$ 2.529", from: "R$ 2.800", installments: "ou parcelado em até 6x (sujeito a taxas)" },
    pix: { price: "R$ 2.399", note: "R$ 199 por consulta" },
    badge: "Melhor custo por consulta",
    whatsappMessage: "Olá Paula! Analisei os planos e temos interesse no Plano Casal Semestral.",
  },
];

export default function PlanosCasalPage() {
  return (
    <section className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        <p className="dark-accent-label text-center">Proposta de acompanhamento em dupla</p>
        <h1 className="section-title mt-2 text-center">Planos Casal</h1>
        <p className="dark-accent-body mx-auto mt-4 max-w-2xl text-center text-lg">
          Acompanhamento conjunto, com abordagens individuais, mas que se complementam no dia a dia,
          perfeito para evoluírem juntos.
        </p>
        <p className="dark-accent-body mx-auto mt-2 max-w-2xl text-center text-sm">
          {site.fullName} · {site.subtitle} · {site.crn}
        </p>

        <ul className="mt-12 grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {priceCards.map((card) => (
            <li key={card.title}>
              <PricingCard card={card} />
            </li>
          ))}
        </ul>

        <p className="dark-accent-body mx-auto mt-12 max-w-2xl text-center">
          Fico à disposição para esclarecer qualquer dúvida.
        </p>
        <div className="mt-6 flex justify-center">
          <a
            href={whatsappLink("Olá Paula! Analisei o Plano Casal e tenho uma dúvida.")}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex"
          >
            Tirar dúvidas
          </a>
        </div>

        <div className="mt-6 flex justify-center">
          <Link href="/planos" className="btn-secondary inline-flex">
            ← Voltar para planos individuais
          </Link>
        </div>
      </div>
    </section>
  );
}
