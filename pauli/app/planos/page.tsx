import type { Metadata } from "next";
import Link from "next/link";
import { PricingCard, type PricingCardData } from "@/components/PricingCard";
import { site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: `Planos e Valores | ${site.fullName}`,
  description: `Tabela de valores de consultas e acompanhamento nutricional com ${site.fullName}, ${site.subtitle}.`,
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: `Planos e Valores | ${site.fullName}`,
    description: "Consulta inicial, acompanhamento trimestral e semestral.",
    images: [{ url: site.iconImage }],
  },
};

const priceCards: PricingCardData[] = [
  {
    title: "Consulta Inicial",
    tagline: "Acompanhamento pontual com suporte por 30 dias.",
    card: { price: "R$ 299" },
    pix: { price: "R$ 285" },
    whatsappMessage: "Olá Paula! Analisei os planos e gostaria de agendar a Consulta Inicial.",
  },
  {
    title: "Plano Trimestral",
    tagline: "Acompanhamento contínuo por 3 meses",
    card: { price: "R$ 799", from: "R$ 900", installments: "ou parcelado em até 3x (sujeito a taxas)" },
    pix: { price: "R$ 749", note: "R$ 249 por consulta" },
    featured: true,
    whatsappMessage: "Olá Paula! Analisei os planos e tenho interesse no Plano Trimestral.",
  },
  {
    title: "Plano Semestral",
    tagline: "Acompanhamento contínuo por 6 meses",
    card: { price: "R$ 1.399", from: "R$ 1.800", installments: "ou parcelado em até 6x (sujeito a taxas)" },
    pix: { price: "R$ 1.319", note: "R$ 219 por consulta" },
    badge: "Melhor custo por consulta",
    whatsappMessage: "Olá Paula! Analisei os planos e tenho interesse no Plano Semestral.",
  },
];

export default function PlanosPage() {
  return (
    <section className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        <p className="dark-accent-label text-center">Proposta de acompanhamento</p>
        <h1 className="section-title mt-2 text-center">Planos e Valores</h1>
        <p className="dark-accent-body mx-auto mt-4 max-w-2xl text-center text-sm">
          {site.fullName} · {site.subtitle} · {site.crn}
        </p>

        <ul className="mt-12 grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {priceCards.map((card) => (
            <li key={card.title}>
              <PricingCard card={card} />
            </li>
          ))}
        </ul>

        <div className="surface-card mx-auto mt-10 flex max-w-2xl flex-col items-center gap-3 p-6 text-center md:flex-row md:justify-between md:text-left">
          <p className="dark-accent-heading font-display text-lg font-bold">
            Deseja um acompanhamento conjunto?
          </p>
          <Link href="/planos-casal" className="btn-secondary shrink-0">
            Ver Planos Casal
          </Link>
        </div>

        <p className="dark-accent-body mx-auto mt-12 max-w-2xl text-center">
          Fico à disposição para esclarecer qualquer dúvida.
        </p>
        <div className="mt-6 flex justify-center">
          <a
            href={whatsappLink("Olá Paula! Analisei os planos e tenho uma dúvida.")}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex"
          >
            Tirar dúvidas
          </a>
        </div>
      </div>
    </section>
  );
}
