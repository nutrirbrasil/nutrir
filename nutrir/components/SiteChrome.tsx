"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { InstagramBar } from "./InstagramBar";
import { MobileBottomNav } from "./MobileBottomNav";
import { Navbar } from "./Navbar";
import { WhatsAppFloatButton } from "./WhatsAppFloatButton";

/** Páginas "bare": sem cabeçalho/rodapé padrão do site (ex.: link-in-bio de tema próprio). */
const BARE_ROUTES = ["/links"];

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bare = BARE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (bare) {
    return <>{children}</>;
  }

  return (
    <>
      <InstagramBar />
      <Navbar />
      {/*
        Altura mínima = tela menos o chrome (o menu inferior fica dentro do
        padding). Sem isso sobra uma faixa do main abaixo da home.
      */}
      <main className="min-h-[calc(100dvh-var(--bar-h)-var(--nav-h)-var(--bottom-h))] bg-nutrir-nude pb-[4.75rem] md:pb-0">
        {children}
      </main>
      <MobileBottomNav />
      <WhatsAppFloatButton />
      <footer className="bg-nutrir-emerald-dark bg-grain py-10 text-center text-sm text-nutrir-nude/80">
        <p className="font-display text-lg italic text-nutrir-nude">@nutrirpicarras</p>
        <p className="mt-2">
          Copyright ©2026 Nutrir Piçarras. Todos os direitos reservados. CNPJ 55.465.657/0001-16
        </p>
        <p className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
          <a href="/politica-de-privacidade" className="hover:text-nutrir-nude hover:underline">
            Política de Privacidade
          </a>
          <span aria-hidden className="opacity-40">
            ·
          </span>
          <a href="/termos-de-uso" className="hover:text-nutrir-nude hover:underline">
            Termos de Uso
          </a>
        </p>
      </footer>
    </>
  );
}
