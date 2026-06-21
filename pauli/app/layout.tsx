import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
  description: site.tagline,
  metadataBase: new URL(site.siteUrl),
  openGraph: {
    title: `${site.fullName} — ${site.subtitle}`,
    description: site.tagline,
    images: [{ url: site.profileImage }],
  },
  icons: {
    icon: site.profileImage,
    apple: site.profileImage,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${playfair.variable}`}>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
