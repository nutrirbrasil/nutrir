import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/components/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nootr, Dieta adaptável",
  description: "App de substituições alimentares. Adapte sua dieta quando sair do plano.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${display.variable}`}>
      <body className="font-sans">
        <AuthProvider>
          <Navbar />
          <main className="mx-auto min-h-[calc(100vh-9rem)] max-w-5xl px-5 py-10">
            {children}
          </main>
          <footer className="border-t border-nootr-line bg-nootr-coal">
            <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-5 py-8 text-xs text-nootr-faint sm:flex-row">
              <p className="font-display text-base tracking-wide text-nootr-muted">
                Nootr<span className="text-nootr-bordo">.</span>
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
