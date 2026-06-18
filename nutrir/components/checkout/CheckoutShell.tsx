"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCheckout } from "@/lib/checkout-context";

export function useCheckoutGuard(requireItems = true) {
  const router = useRouter();
  const { draft, hydrated } = useCheckout();

  useEffect(() => {
    if (!hydrated) return;
    if (!draft || (requireItems && draft.items.length === 0)) {
      router.replace("/agendar");
    }
  }, [draft, hydrated, requireItems, router]);

  return { draft, hydrated, ready: hydrated && !!draft && (!requireItems || draft.items.length > 0) };
}

interface CheckoutShellProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
}

export function CheckoutShell({ title, backHref, backLabel, children }: CheckoutShellProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
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
