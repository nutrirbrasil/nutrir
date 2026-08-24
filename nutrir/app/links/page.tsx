import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { IconType } from "react-icons";
import { FaGoogle, FaInstagram, FaUserDoctor, FaWhatsapp } from "react-icons/fa6";
import { FiShoppingBag } from "react-icons/fi";
import { whatsappContactUrl } from "@/lib/legal";
import { logoUrl } from "@/lib/brand-assets";

export const metadata: Metadata = {
  title: "Links | Nutrir Piçarras",
  description: "Instagram, cardápio, WhatsApp e avaliação da Nutrir Piçarras.",
};

const INSTAGRAM_URL = "https://www.instagram.com/nutrirpicarras";
const GOOGLE_REVIEW_URL = "https://g.page/r/CXJ5WKkcHYgMEAI/review";
const PAULI_URL = "https://pauli.nutrirpicarras.com.br/";

interface LinkButtonProps {
  href: string;
  external?: boolean;
  icon: IconType;
  title: string;
  subtitle: string;
}

function LinkButton({ href, external, icon: Icon, title, subtitle }: LinkButtonProps) {
  const className =
    "card flex items-center gap-4 !p-4 transition hover:-translate-y-0.5 hover:shadow-md";
  const content = (
    <>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-nutrir-emerald text-xl text-nutrir-nude">
        <Icon />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-base font-bold text-nutrir-emerald">
          {title}
        </span>
        <span className="mt-0.5 block text-sm leading-snug text-nutrir-emerald/70">
          {subtitle}
        </span>
      </span>
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

export default function LinksPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-12">
      <Image
        src={logoUrl()}
        alt="Nutrir Piçarras"
        width={88}
        height={88}
        className="h-20 w-auto object-contain"
        unoptimized
      />
      <h1 className="mt-4 font-display text-2xl font-bold text-nutrir-emerald">Nutrir Piçarras</h1>
      <p className="mt-1 text-sm text-nutrir-emerald/60">Marmitas saudáveis em Piçarras</p>

      <div className="mt-8 w-full space-y-4">
        <LinkButton
          href={INSTAGRAM_URL}
          external
          icon={FaInstagram}
          title="Instagram"
          subtitle="Nos siga e concorra a prêmios mensais."
        />
        <LinkButton
          href="/marmitas"
          icon={FiShoppingBag}
          title="Site"
          subtitle="Ver Cardápio | Faça seu Pedido."
        />
        <LinkButton
          href={whatsappContactUrl()}
          external
          icon={FaWhatsapp}
          title="WhatsApp"
          subtitle="Tire suas dúvidas | Envie feedbacks."
        />
        <LinkButton
          href={GOOGLE_REVIEW_URL}
          external
          icon={FaGoogle}
          title="Avalie e ganhe"
          subtitle="Nos avalie no Google com 5 estrelas e ganhe um suco grátis no seu próximo pedido!"
        />
        <LinkButton
          href={PAULI_URL}
          external
          icon={FaUserDoctor}
          title="Conheça a Nutricionista"
          subtitle="Conheça o trabalho da nutricionista fundadora do Nutrir."
        />
      </div>
    </div>
  );
}
