"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FiMenu, FiShoppingBag, FiUser } from "react-icons/fi";
import { CombosNavMenu } from "@/components/CombosNavMenu";
import { MobileNavDrawer } from "@/components/MobileNavDrawer";
import { NutrirNavMenu } from "@/components/NutrirNavMenu";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/api";
import { logoUrl } from "@/lib/brand-assets";

const links = [{ href: "/marmitas", label: "Marmitas" }] as const;

export function Navbar() {
  const pathname = usePathname();
  const { itemCount, totalCents, openCart } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  function navLinkClass(href: string) {
    const active = pathname === href;
    return `rounded-full px-4 py-2 text-sm font-medium transition ${
      active
        ? "bg-nutrir-nude text-nutrir-burgundy"
        : "text-nutrir-nude/85 hover:bg-nutrir-nude/10 hover:text-nutrir-nude"
    }`;
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-nutrir-burgundy-dark/40 bg-nutrir-burgundy bg-grain shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:py-4">
          <Link href="/" className="group flex min-w-0 shrink items-center gap-2 sm:gap-3">
            <Image
              src={logoUrl()}
              alt="Nutrir Piçarras"
              width={52}
              height={52}
              className="h-10 w-auto object-contain sm:h-12"
              priority
              unoptimized
            />
            <div className="leading-tight">
              <span className="block font-display text-base font-bold tracking-wide text-nutrir-nude sm:text-lg">
                NUTRIR
              </span>
              <span className="block font-display text-[10px] italic text-nutrir-nude/70 sm:text-xs">
                Piçarras
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <CombosNavMenu variant="desktop" />
            <Link href={links[0].href} className={navLinkClass(links[0].href)}>
              {links[0].label}
            </Link>
            <NutrirNavMenu variant="desktop" />
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/perfil"
              aria-label="Perfil"
              className={`hidden h-10 w-10 items-center justify-center rounded-full transition md:flex ${
                pathname.startsWith("/perfil")
                  ? "bg-nutrir-nude text-nutrir-burgundy"
                  : "text-nutrir-nude hover:bg-nutrir-nude/10"
              }`}
            >
              <FiUser className="text-xl" />
            </Link>

            <button
              type="button"
              onClick={openCart}
              className="flex items-center gap-2 rounded-full bg-nutrir-nude px-2.5 py-2 text-nutrir-burgundy shadow-md transition hover:bg-nutrir-cream sm:px-4"
            >
              <FiShoppingBag className="shrink-0 text-lg" />
              {itemCount > 0 ? (
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-xs font-medium opacity-90">
                    {itemCount} {itemCount === 1 ? "produto" : "produtos"}
                  </span>
                  <span className="block text-sm font-bold">{formatPrice(totalCents)}</span>
                </span>
              ) : (
                <span className="hidden text-sm font-semibold sm:inline">Sua sacola</span>
              )}
              {itemCount > 0 && (
                <span className="text-xs font-bold sm:hidden">{formatPrice(totalCents)}</span>
              )}
            </button>

            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setDrawerOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-nutrir-nude transition hover:bg-nutrir-nude/10 md:hidden"
            >
              <FiMenu className="text-2xl" />
            </button>
          </div>
        </div>
      </header>

      <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
