"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiShoppingBag, FiUser } from "react-icons/fi";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/api";

const links = [
  { href: "/", label: "Combo" },
  { href: "/marmitas", label: "Marmitas" },
  { href: "/perfil", label: "Perfil" },
];

export function Navbar() {
  const pathname = usePathname();
  const { itemCount, totalCents, openCart } = useCart();

  return (
    <header className="sticky top-0 z-50 border-b border-nutrir-emerald-dark/20 bg-nutrir-emerald bg-grain shadow-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-nutrir-nude/30 bg-nutrir-burgundy font-display text-lg font-bold text-nutrir-nude">
            N
          </span>
          <div className="leading-tight">
            <span className="block font-display text-lg font-bold tracking-wide text-nutrir-nude">
              NUTRIR
            </span>
            <span className="block font-display text-xs italic text-nutrir-nude/70">
              Piçarras
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                pathname === link.href
                  ? "bg-nutrir-burgundy text-nutrir-nude"
                  : "text-nutrir-nude/80 hover:bg-nutrir-nude/10 hover:text-nutrir-nude"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/perfil"
            aria-label="Perfil"
            className={`flex h-10 w-10 items-center justify-center rounded-full transition md:hidden ${
              pathname === "/perfil"
                ? "bg-nutrir-burgundy text-nutrir-nude"
                : "text-nutrir-nude hover:bg-nutrir-nude/10"
            }`}
          >
            <FiUser className="text-xl" />
          </Link>

          <button
            type="button"
            onClick={openCart}
            className="flex items-center gap-2 rounded-full bg-nutrir-nude px-3 py-2 text-nutrir-emerald shadow-md transition hover:bg-nutrir-cream sm:px-4"
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
              <span className="text-sm font-bold sm:hidden">{formatPrice(totalCents)}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
