import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { FaGoogle, FaInstagram, FaUserDoctor, FaWhatsapp } from "react-icons/fa6";
import { FiShoppingBag } from "react-icons/fi";
import { whatsappContactUrl } from "@/lib/legal";
import { logoUrl } from "@/lib/brand-assets";
import { CopyLinkButton } from "@/components/CopyLinkButton";

export const metadata: Metadata = {
  title: "Links | Nutrir Piçarras",
  description: "Instagram, cardápio, WhatsApp e avaliação da Nutrir Piçarras.",
};

const INSTAGRAM_URL = "https://www.instagram.com/nutrirpicarras";
const GOOGLE_REVIEW_URL = "https://g.page/r/CXJ5WKkcHYgMEAI/review";
const PAULI_URL = "https://pauli.nutrirpicarras.com.br/";

/**
 * O navegador embutido do Instagram roda numa WebView isolada, sem o login do
 * Google sincronizado com o Chrome/Safari do sistema — por isso o link de
 * avaliação pede pra logar de novo. Detectamos pelo user-agent (o app do
 * Instagram sempre inclui "Instagram" nele) pra contornar isso.
 */
function isInstagramInAppBrowser(userAgent: string): boolean {
  return /Instagram/i.test(userAgent);
}

function isAndroidUserAgent(userAgent: string): boolean {
  return /Android/i.test(userAgent);
}

/** No Android, esse esquema pede pro sistema abrir o link no Chrome de verdade, saindo da WebView do Instagram. */
function buildAndroidChromeIntentUrl(url: string): string {
  const withoutProtocol = url.replace(/^https?:\/\//, "");
  return `intent://${withoutProtocol}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
}

interface LinkButtonProps {
  href: string;
  external?: boolean;
  icon: IconType;
  title: string;
  subtitle: string;
  hint?: string;
  extra?: ReactNode;
}

function LinkButton({ href, external, icon: Icon, title, subtitle, hint, extra }: LinkButtonProps) {
  const cardClassName = "card !p-4 transition hover:-translate-y-0.5 hover:shadow-md";
  const rowContent = (
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

  const link = external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4">
      {rowContent}
    </a>
  ) : (
    <Link href={href} className="flex items-center gap-4">
      {rowContent}
    </Link>
  );

  return (
    <div className={cardClassName}>
      {link}
      {hint && (
        <p className="mt-3 rounded-lg bg-nutrir-emerald/5 px-3 py-2 text-xs leading-relaxed text-nutrir-emerald/80">
          {hint}
        </p>
      )}
      {extra}
    </div>
  );
}

export default function LinksPage() {
  const userAgent = headers().get("user-agent") ?? "";
  const inInstagram = isInstagramInAppBrowser(userAgent);
  const reviewHref =
    inInstagram && isAndroidUserAgent(userAgent)
      ? buildAndroidChromeIntentUrl(GOOGLE_REVIEW_URL)
      : GOOGLE_REVIEW_URL;

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
          href={reviewHref}
          external
          icon={FaGoogle}
          title="Avalie e ganhe"
          subtitle="Nos avalie no Google com 5 estrelas e ganhe um suco grátis no seu próximo pedido!"
          hint={
            inInstagram
              ? "Você está no navegador do Instagram — se pedir login de novo, toque em ⋯ no topo da tela e escolha \"Abrir no navegador\" pra usar sua conta Google já conectada."
              : undefined
          }
          extra={inInstagram ? <CopyLinkButton url={GOOGLE_REVIEW_URL} /> : undefined}
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
