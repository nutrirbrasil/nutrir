"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { whatsappLink } from "@/lib/site";

const STORAGE_KEY = "pauli_promo_nootr20";

const discountMessage =
  "Olá! Sou usuária(o) do Plano Pro Anual do Nootr e gostaria de agendar uma consulta com o desconto exclusivo de 20% oferecido. Qual seria a disponibilidade?";

export function PromoFloatingButton() {
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (searchParams.get("promo") === "nootr20") {
      sessionStorage.setItem(STORAGE_KEY, "1");
    }
    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      setVisible(true);
    }
  }, [searchParams]);

  if (!visible || dismissed) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2">
      <a
        href={whatsappLink(discountMessage)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary flex items-center gap-2 px-5 py-3 text-xs shadow-lg"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-9.746 9.798c0 2.734.732 5.41 2.119 7.697L3.039 21.487l8.259-2.166a9.843 9.843 0 004.744 1.206h.006c5.44 0 9.863-4.422 9.863-9.865 0-2.63-.675-5.11-1.945-7.249C20.612 4.547 17.775 3.01 14.659 3.01z" />
        </svg>
        <span>Agendar com Desconto</span>
      </a>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Fechar"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pauli-charcoal/80 text-xs text-pauli-sand/70 shadow transition hover:text-pauli-cream"
      >
        ×
      </button>
    </div>
  );
}
