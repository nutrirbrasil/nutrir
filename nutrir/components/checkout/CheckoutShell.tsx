"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCheckout } from "@/lib/checkout-context";
import { useRequireLogin } from "@/lib/use-require-login";

export function useCheckoutGuard(requireItems = true) {
  const router = useRouter();
  const { draft, hydrated } = useCheckout();
  const { ready: authReady } = useRequireLogin();

  useEffect(() => {
    if (!hydrated || !authReady) return;
    if (!draft || (requireItems && draft.items.length === 0)) {
      router.replace("/agendar");
    }
  }, [draft, hydrated, requireItems, router, authReady]);

  return {
    draft,
    hydrated,
    ready:
      authReady &&
      hydrated &&
      !!draft &&
      (!requireItems || draft.items.length > 0),
  };
}

interface CheckoutShellProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  /** `wide` para etapas com duas colunas (ex.: revisão do pedido). */
  layout?: "default" | "wide";
  children: React.ReactNode;
}

export function CheckoutShell({
  title,
  backHref,
  backLabel,
  layout = "default",
  children,
}: CheckoutShellProps) {
  const widthClass = layout === "wide" ? "max-w-5xl" : "max-w-2xl";

  return (
    <div className={`mx-auto ${widthClass} px-4 py-10`}>
      {backHref && (
        <Link href={backHref} className="text-sm font-medium text-nutrir-burgundy hover:underline">
          ← {backLabel ?? "Voltar"}
        </Link>
      )}
      <h1 className="section-title mt-4 text-left">{title}</h1>
      <div className="mt-8">{children}</div>
    </div>
  );
}
