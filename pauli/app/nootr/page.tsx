"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { whatsappLink } from "@/lib/site";

function NootrPageContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "annual";

  const isAnnual = plan === "annual";
  const discount = isAnnual ? 20 : 10;
  const planLabel = isAnnual ? "Plano Pro Anual" : "Plano Pro Mensal";

  const discountMessage = `Olá! Sou usuária(o) do ${planLabel} do Nootr e gostaria de agendar uma consulta com o desconto exclusivo de ${discount}% oferecido. Qual seria a disponibilidade?`;

  return (
    <div className="min-h-screen bg-black px-6 py-16 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        {/* Header com logo Nootr */}
        <div className="mb-12 flex justify-center">
          <div className="rounded-full bg-pauli-gold/10 px-4 py-2 backdrop-blur">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-pauli-gold">
              Nootr + Paula Pastorino
            </span>
          </div>
        </div>

        {/* Título principal */}
        <h1 className="font-display mb-4 text-4xl font-bold text-pauli-cream md:text-5xl">
          Obrigada por confiar no{" "}
          <span className="bg-gradient-to-r from-pauli-gold to-pauli-sand bg-clip-text text-transparent">
            Nootr
          </span>
        </h1>

        {/* Subtítulo */}
        <p className="mb-12 text-lg text-pauli-sand/80">
          Sua jornada de saúde nutritional é importante para nós. Por isso,
          preparamos algo especial.
        </p>

        {/* Desconto destaque */}
        <div className="mb-16 rounded-2xl border-2 border-pauli-gold/30 bg-gradient-to-br from-pauli-gold/10 to-black p-8 backdrop-blur">
          <p className="mb-3 text-sm uppercase tracking-[0.2em] text-pauli-gold">
            Oferta exclusiva
          </p>
          <div className="mb-4">
            <span className="bg-gradient-to-r from-pauli-gold to-pauli-sand bg-clip-text text-6xl font-bold text-transparent md:text-7xl">
              {discount}%
            </span>
          </div>
          <p className="text-pauli-cream">
            De desconto em consultas nutricionais
          </p>
          <p className="mt-2 text-pauli-sand/60">
            Exclusivo para usuários do {planLabel}
          </p>
          <p className="mt-4 text-xs text-pauli-sand/50">
            *Esse desconto é exclusivo e válido apenas para a primeira consulta
            ou plano escolhido pelo usuário.
          </p>
          <p className="mt-1 text-xs text-pauli-sand/50">
            Oferta válida para consultas presenciais (Balneário Piçarras - SC)
            ou online (Todo o Brasil e Exterior)
          </p>
        </div>

        {/* Descrição do desconto */}
        <div className="mb-12 space-y-4 rounded-xl bg-pauli-charcoal/20 p-6">
          <p className="text-pauli-sand">
            Como agradecimento pelo seu compromisso com a saúde através do Nootr,
            Paula Pastorino, nutricionista clínica e esportiva, oferece um
            desconto especial de {discount}% em suas consultas nutricionais.
          </p>
          <p className="text-sm text-pauli-sand/70">
            Combine a inteligência do Nootr com a experiência de uma nutricionista
            de verdade. Juntos, você consegue mais.
          </p>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          {/* Botão 1: Saber mais sobre Paula */}
          <a
            href={`/?promo=nootr&plan=${plan}`}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <span>Conhecer Paula</span>
            <span className="text-lg">→</span>
          </a>

          {/* Botão 2: Agendar com desconto */}
          <a
            href={whatsappLink(discountMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex items-center justify-center gap-2"
          >
            <span>Agendar com Desconto</span>
            <svg
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-9.746 9.798c0 2.734.732 5.41 2.119 7.697L3.039 21.487l8.259-2.166a9.843 9.843 0 004.744 1.206h.006c5.44 0 9.863-4.422 9.863-9.865 0-2.63-.675-5.11-1.945-7.249C20.612 4.547 17.775 3.01 14.659 3.01z" />
            </svg>
          </a>
        </div>

        {/* Rodapé com CRN */}
        <div className="mt-16 border-t border-pauli-charcoal/30 pt-8 text-xs text-pauli-sand/50">
          <p>
            Paula Pastorino • Nutricionista Clínica e Esportiva • CRN 18489D
          </p>
        </div>
      </div>
    </div>
  );
}

export default function NootrPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <NootrPageContent />
    </Suspense>
  );
}
