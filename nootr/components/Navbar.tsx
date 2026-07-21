"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { HamburgerMenu } from "@/components/HamburgerMenu";

const links = [
  { href: "/dieta", label: "Dieta" },
  { href: "/substituir", label: "Substituir" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-nootr-line bg-nootr-black/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/" className="group flex items-baseline gap-0.5">
          <span className="font-display text-2xl font-semibold tracking-wide text-nootr-cream">
            Nootr
          </span>
          <span className="text-2xl leading-none text-nootr-bordo transition-colors group-hover:text-nootr-bordoSoft">
            .
          </span>
        </Link>
        <nav className="flex items-center gap-0.5 sm:gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors sm:px-3.5 ${
                pathname === link.href
                  ? "text-nootr-cream"
                  : "text-nootr-muted hover:text-nootr-cream"
              }`}
            >
              <span className="relative">
                {link.label}
                {pathname === link.href && (
                  <span className="absolute -bottom-2 left-0 right-0 mx-auto h-px w-4 bg-nootr-bordo" />
                )}
              </span>
            </Link>
          ))}
          <span className="mx-2 hidden h-4 w-px bg-nootr-line sm:block" />
          {session ? (
            <HamburgerMenu onSignOut={handleSignOut} />
          ) : (
            <Link
              href="/login"
              className="rounded-lg border border-nootr-bordo/60 px-4 py-1.5 text-[13px] font-semibold text-nootr-cream transition-all hover:bg-nootr-bordo"
            >
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
