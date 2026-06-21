import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";
import { Navbar } from "@/components/Navbar";

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
  title: "Nutrir Piçarras — Marmitas Fit",
  description:
    "Marmitas saudáveis em Piçarras. Combos, marmitas avulsas, monte seu combo e peça online.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${playfair.variable}`}>
      <body>
        <AppProviders>
          <Navbar />
          <main className="min-h-screen bg-nutrir-nude">{children}</main>
          <footer className="bg-nutrir-emerald-dark bg-grain py-10 text-center text-sm text-nutrir-nude/80">
            <p className="font-display text-lg italic text-nutrir-nude">@nutrirpicarras</p>
            <p className="mt-2">Nutrir Piçarras · Marmitas fit com ingredientes frescos</p>
          </footer>
        </AppProviders>
      </body>
    </html>
  );
}
