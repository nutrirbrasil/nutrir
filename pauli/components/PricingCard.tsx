import { whatsappLink } from "@/lib/site";

export type PricingCardData = {
  title: string;
  tagline?: string;
  card: { price: string; from?: string; installments?: string; note?: string };
  pix: { price: string; note?: string };
  featured?: boolean;
  featuredLabel?: string;
  badge?: string;
  whatsappMessage: string;
};

type Props = {
  card: PricingCardData;
};

export function PricingCard({ card }: Props) {
  return (
    <div
      className={`surface-card flex h-full flex-col p-6 md:p-8 ${
        card.featured
          ? "border-[3px] border-pauli-gold shadow-lg dark:border-pauli-gold-light/60"
          : ""
      }`}
    >
      {card.featured ? (
        <span className="gold-badge mb-3 inline-block w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
          {card.featuredLabel ?? "Mais escolhido"}
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
          <span className="dark-accent-heading whitespace-nowrap font-display text-xl font-bold">
            {card.card.from ? (
              <s className="mr-1 text-sm font-normal text-pauli-gray-muted">{card.card.from}</s>
            ) : null}
            {card.card.price}
            <span className="ml-1 inline-block translate-y-[3px] text-xs font-normal text-pauli-gray-muted">
              à vista
            </span>
          </span>
        </div>
        {card.card.installments ? (
          <p className="detail-text mt-1 flex-1 text-xs leading-relaxed">{card.card.installments}</p>
        ) : null}
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
          <span className="dark-accent-heading whitespace-nowrap font-display text-2xl font-bold">
            {card.pix.price}
            <span className="ml-1 inline-block translate-y-[3px] text-xs font-normal text-pauli-gray-muted">
              à vista
            </span>
          </span>
        </div>
        {card.pix.note ? (
          <p className="mt-1 text-[11px] text-pauli-gray-muted">
            *Valor total referente a {card.pix.note}
          </p>
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
  );
}
