import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { IconType } from "react-icons";
import { FaGoogle, FaHandshake, FaInstagram, FaUserDoctor, FaWhatsapp } from "react-icons/fa6";
import { SiIfood } from "react-icons/si";
import { FiShoppingBag } from "react-icons/fi";
import { whatsappContactUrl } from "@/lib/legal";
import { logoUrl } from "@/lib/brand-assets";

export const metadata: Metadata = {
  title: "Links | Nutrir Piçarras",
  description: "Cardápio, WhatsApp, Instagram, iFood e avaliação da Nutrir Piçarras.",
};

const INSTAGRAM_URL = "https://www.instagram.com/nutrirpicarras";
const GOOGLE_REVIEW_URL = "https://g.page/r/CXJ5WKkcHYgMEAI/review";
const PAULI_URL = "https://pauli.nutrirpicarras.com.br/";
const IFOOD_URL =
  "https://www.ifood.com.br/delivery/balneario-picarras-sc/nutrir-picarras---marmitas-saudaveis-centro/8bf60ae3-a177-49fb-aefc-8e033cf4ea82";

interface LinkButtonProps {
  href: string;
  external?: boolean;
  icon: IconType;
  iconColorClass: string;
  title: string;
  highlighted?: boolean;
}

function LinkButton({ href, external, icon: Icon, iconColorClass, title, highlighted }: LinkButtonProps) {
  const className = `flex items-center gap-4 rounded-full border px-4 py-3.5 transition hover:-translate-y-0.5 ${
    highlighted
      ? "border-nutrir-burgundy bg-nutrir-burgundy/20 hover:bg-nutrir-burgundy/30"
      : "border-white/10 bg-white/5 hover:bg-white/10"
  }`;
  const content = (
    <>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg ${iconColorClass}`}>
        <Icon />
      </span>
      <span className="flex-1 text-center font-display text-sm font-bold text-white">{title}</span>
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
    <div className="min-h-screen bg-black">
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-12">
        <Image
          src={logoUrl()}
          alt="Nutrir Piçarras"
          width={88}
          height={88}
          className="h-20 w-auto rounded-full border-2 border-white/20 object-contain"
          unoptimized
        />
        <h1 className="mt-4 font-display text-2xl font-bold text-white">Nutrir Piçarras</h1>
        <p className="mt-1 text-sm text-white/60">@nutrirpicarras</p>

        <div className="mt-8 w-full space-y-3">
          <LinkButton
            href="/parceiro"
            icon={FaHandshake}
            iconColorClass="text-nutrir-burgundy"
            title="Seja Parceiro"
            highlighted
          />
          <LinkButton
            href="/marmitas"
            icon={FiShoppingBag}
            iconColorClass="text-nutrir-ink"
            title="Faça seu pedido"
          />
          <LinkButton
            href={whatsappContactUrl()}
            external
            icon={FaWhatsapp}
            iconColorClass="text-[#25D366]"
            title="Nosso WhatsApp"
          />
          <LinkButton
            href={GOOGLE_REVIEW_URL}
            external
            icon={FaGoogle}
            iconColorClass="text-[#4285F4]"
            title="Avalie no Google"
          />
          <LinkButton
            href={INSTAGRAM_URL}
            external
            icon={FaInstagram}
            iconColorClass="text-[#E1306C]"
            title="Instagram"
          />
          <LinkButton
            href={IFOOD_URL}
            external
            icon={SiIfood}
            iconColorClass="text-[#EA1D2C]"
            title="Peça no iFood"
          />
          <LinkButton
            href={PAULI_URL}
            external
            icon={FaUserDoctor}
            iconColorClass="text-nutrir-ink"
            title="Conheça a Nutricionista"
          />
        </div>
      </div>
    </div>
  );
}
