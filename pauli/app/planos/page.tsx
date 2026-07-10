import type { Metadata } from "next";
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

type PriceCard = {
  title: string;
  tagline?: string;
  card: { price: string; from?: string; note?: string };
  pix: { price: string; note?: string };
  featured?: boolean;
  badge?: string;
  whatsappMessage: string;
};

const priceCards: PriceCard[] = [
  {
    title: "Consulta Inicial",
    tagline: "Acompanhamento pontual com suporte por 30 dias.",
    card: { price: "R$ 299", note: "à vista no cartão" },
    pix: { price: "R$ 285" },
    whatsappMessage: "Olá Paula! Analisei os planos e gostaria de agendar a Consulta Inicial.",
  },
  {
    title: "Plano Trimestral",
    tagline: "Acompanhamento contínuo por 3 meses",
    card: { price: "R$ 799", from: "R$ 900", note: "à vista, ou parcelado em até 3x (sujeito a taxas)" },
    pix: { price: "R$ 749", note: "R$ 249 por consulta" },
    featured: true,
    whatsappMessage: "Olá Paula! Analisei os planos e tenho interesse no Plano Trimestral.",
  },
  {
    title: "Plano Semestral",
    tagline: "Acompanhamento contínuo por 6 meses",
    card: { price: "R$ 1.399", from: "R$ 1.800", note: "à vista, ou parcelado em até 6x (sujeito a taxas)" },
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
        <p className="dark-accent-body mx-auto mt-4 max-w-2xl text-center text-lg">
          {site.fullName} · {site.subtitle} · {site.crn}
        </p>

        <ul className="mt-12 grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {priceCards.map((card) => (
            <li key={card.title}>
              <div
                className={`surface-card flex h-full flex-col p-6 md:p-8 ${
                  card.featured
                    ? "border-[3px] border-pauli-gold shadow-lg dark:border-pauli-gold-light/60"
                    : ""
                }`}
              >
                {card.featured ? (
                  <span className="gold-badge mb-3 inline-block w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                    Mais escolhido
                  </span>
                ) : card.badge ? (
                  <span className="gold-badge mb-3 inline-block w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                    {card.badge}
                  </span>
                ) : null}
                <h2 className="gold-text font-display text-xl font-bold">{card.title}</h2>
                {card.tagline ? (
                  <p className="detail-text mt-2 text-sm font-medium leading-snug">{card.tagline}</p>
                ) : null}

                <div className="mt-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="detail-text text-sm font-semibold uppercase tracking-wide">Cartão</span>
                    <span className="dark-accent-heading font-display text-xl font-bold">
                      {card.card.from ? (
                        <s className="mr-2 text-xl font-bold text-pauli-gray-muted">{card.card.from}</s>
                      ) : null}
                      {card.card.price}
                    </span>
                  </div>
                  {card.card.note ? (
                    <p className="detail-text mt-1 flex-1 text-xs leading-relaxed">{card.card.note}</p>
                  ) : null}
                </div>

                <div className="mt-4 border-t border-pauli-gold/15 pt-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex items-baseline gap-2">
                      <span className="detail-text text-sm font-semibold uppercase tracking-wide">Pix</span>
                      <span className="text-xs font-bold text-green-600 dark:text-green-400">5% de desconto</span>
                    </span>
                    <span className="dark-accent-heading font-display text-2xl font-bold">{card.pix.price}</span>
                  </div>
                  {card.pix.note ? (
                    <p className="detail-text mt-1 text-xs">({card.pix.note})</p>
                  ) : null}
                </div>

                <div className="flex-1" />
                <a
                  href={whatsappLink(card.whatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-6 block text-center text-sm font-bold uppercase tracking-wide transition ${
                    card.featured ? "btn-primary" : "btn-secondary"
                  }`}
                >
                  Agendar
                </a>
              </div>
            </li>
          ))}
        </ul>

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
