import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";
import { SiteChrome } from "@/components/SiteChrome";
import { logoUrl } from "@/lib/brand-assets";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

// Serifada editorial/artesanal: dá o ar premium de marca de comida autoral.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "Nutrir Piçarras | Marmitas Saudáveis & Combos",
  description:
    "Marmitas saudáveis em Piçarras. Combos, marmitas avulsas, monte seu combo e peça online.",
  icons: {
    icon: logoUrl(),
    apple: logoUrl(),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${fraunces.variable}`}>
      {/*
        Alturas do "chrome" (faixa do Instagram, cabeçalho, menu inferior no
        celular) como variáveis: o main e páginas de tela cheia (home) usam
        pra calcular o vão visível. Ao mudar a altura de algum deles, ajustar aqui.
      */}
      <body className="[--bar-h:2.75rem] [--bottom-h:4.875rem] [--nav-h:4rem] md:[--bar-h:2rem] md:[--bottom-h:0rem]">
        <AppProviders>
          <SiteChrome>{children}</SiteChrome>
        </AppProviders>
      </body>
    </html>
  );
}
