import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { IconType } from "react-icons";
import { FaHandshake, FaInstagram, FaWhatsapp } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import { SiIfood } from "react-icons/si";
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

/** Gradiente aproximado do ícone oficial do Instagram. */
const INSTAGRAM_GRADIENT =
  "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)";

interface LinkButtonProps {
  href: string;
  external?: boolean;
  icon?: IconType;
  iconClassName?: string;
  imageSrc?: string;
  imageZoom?: boolean;
  imagePositionClassName?: string;
  iconBgClassName?: string;
  iconBgStyle?: React.CSSProperties;
  title: string;
  subtitle: string;
  highlighted?: boolean;
}

function LinkButton({
  href,
  external,
  icon: Icon,
  iconClassName,
  imageSrc,
  imageZoom,
  imagePositionClassName = "object-center",
  iconBgClassName = "bg-white",
  iconBgStyle,
  title,
  subtitle,
  highlighted,
}: LinkButtonProps) {
  const className = `flex items-center gap-4 rounded-2xl border px-4 py-3 transition hover:-translate-y-0.5 ${
    highlighted
      ? "border-nutrir-burgundy bg-nutrir-burgundy/30 hover:bg-nutrir-burgundy/40"
      : "border-white/10 bg-white/[0.08] hover:bg-white/[0.14]"
  }`;
  const content = (
    <>
      <span
        className={`relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full text-3xl ${iconBgClassName}`}
        style={iconBgStyle}
      >
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt=""
            fill
            sizes="64px"
            className={`object-cover ${imagePositionClassName} ${imageZoom ? "scale-[1.15]" : ""}`}
            unoptimized
          />
        ) : (
          Icon && <Icon className={iconClassName} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base font-bold text-white">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-white/70">{subtitle}</span>
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
    <div className="min-h-screen bg-[#141a17]">
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
            href="/marmitas"
            imageSrc={logoUrl()}
            imageZoom
            iconBgClassName="bg-nutrir-burgundy"
            title="Nosso Site"
            subtitle="Ver Cardápio | Faça seu Pedido."
            highlighted
          />
          <LinkButton
            href="/parceiro"
            icon={FaHandshake}
            iconClassName="text-nutrir-burgundy text-4xl"
            title="Seja Parceiro"
            subtitle="Ver Requisitos | Inscrever-se"
          />
          <LinkButton
            href={whatsappContactUrl()}
            external
            icon={FaWhatsapp}
            iconClassName="text-white text-4xl"
            iconBgClassName="bg-[#25D366]"
            title="WhatsApp"
            subtitle="Tire suas dúvidas | Faça seu Pedido."
          />
          <LinkButton
            href={GOOGLE_REVIEW_URL}
            external
            icon={FcGoogle}
            iconClassName="text-4xl"
            title="Avalie no Google"
            subtitle="Gostou? Nos avalie com 5 estrelas!"
          />
          <LinkButton
            href={INSTAGRAM_URL}
            external
            icon={FaInstagram}
            iconClassName="text-white text-4xl"
            iconBgStyle={{ backgroundImage: INSTAGRAM_GRADIENT }}
            title="Instagram"
            subtitle="Nos siga e fique por dentro das novidades e promoções."
          />
          <LinkButton
            href={PAULI_URL}
            external
            imageSrc="/links/nutricionista.png"
            imageZoom
            imagePositionClassName="object-[50%_15%]"
            title="Conheça a Nutricionista"
            subtitle="Conheça o trabalho da nutricionista fundadora do Nutrir."
          />
          <LinkButton
            href={IFOOD_URL}
            external
            icon={SiIfood}
            iconClassName="text-white"
            iconBgClassName="bg-[#EA1D2C]"
            title="Peça no iFood"
            subtitle="Faça seu pedido no iFood."
          />
        </div>
      </div>
    </div>
  );
}
