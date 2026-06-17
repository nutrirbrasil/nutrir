import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Nootr — Dieta adaptável",
  description: "App de substituições alimentares. Adapte sua dieta quando sair do plano.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Navbar />
        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-4xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
