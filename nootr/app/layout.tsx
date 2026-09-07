import type { Metadata } from "next";
import Link from "next/link";
import { Hanken_Grotesk, Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/components/AuthProvider";

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

// Registro numérico do app inteiro (kcal, gramas, preços, deltas de macro):
// uma fonte técnica separada da prosa, coerente com o "razão" de recálculo
// que é a assinatura visual do Nootr (ver DietView.MacroBar, app/lp/Ledger).
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nootr, Dieta adaptável",
  description: "App de substituições alimentares. Adapte sua dieta quando sair do plano.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="font-sans">
        <AuthProvider>
          <Navbar />
          <main className="mx-auto min-h-[calc(100vh-9rem)] max-w-5xl px-5 py-10">
            {children}
          </main>
          <footer className="border-t border-nootr-line bg-nootr-coal">
            <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-5 py-8 text-xs text-nootr-faint sm:flex-row">
              <p className="font-display text-base italic tracking-wide text-nootr-muted">
                Nootr<span className="not-italic text-nootr-bordo">.</span>
              </p>
              <nav className="flex items-center gap-6">
                <Link href="/termos" className="transition-colors hover:text-nootr-cream">
                  Termos de uso
                </Link>
                <Link href="/privacidade" className="transition-colors hover:text-nootr-cream">
                  Política de privacidade
                </Link>
              </nav>
              <p>© {new Date().getFullYear()} Nootr</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
