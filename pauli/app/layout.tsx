import type { Metadata } from "next";
import { Suspense } from "react";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PromoFloatingButton } from "@/components/PromoFloatingButton";
import { site } from "@/lib/site";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: `${site.fullName} — ${site.subtitle} | ${site.city}`,
  description: site.heroSubtitle,
  metadataBase: new URL(site.siteUrl),
  applicationName: site.fullName,
  openGraph: {
    siteName: site.fullName,
    title: `${site.fullName} — ${site.subtitle}`,
    description: site.heroSubtitle,
    images: [{ url: site.iconImage }],
  },
  icons: {
    icon: "/p.png",
    apple: "/p.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`dark ${dmSans.variable} ${playfair.variable}`}>
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <Suspense fallback={null}>
          <PromoFloatingButton />
        </Suspense>
      </body>
    </html>
  );
}
