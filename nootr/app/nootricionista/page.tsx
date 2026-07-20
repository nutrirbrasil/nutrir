"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { nootrApi } from "@/lib/api";
import type { Profile } from "@/lib/types";
import { useEffect, useState } from "react";

function NootricionistaContent({ token }: { token: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    nootrApi
      .getProfile(token)
      .then((p) => {
        if (active) setProfile(p);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-nootr-bg">
        <div className="text-nootr-cream">Carregando...</div>
      </div>
    );
  }

  const plan = profile?.plan || "basic";
  const billingCycle = profile?.billing_cycle || "mensal";

  const showBasicCTA = plan === "basic";
  const showMonthlyCTA = plan === "pro" && billingCycle === "mensal";
  const showAnnualCTA = plan === "pro" && billingCycle === "anual";

  return (
    <article className="mx-auto max-w-2xl">
      <div className="divider-bordo mb-4" />
      <p className="label-caps text-nootr-bordoSoft">Parceria Nootr</p>
      <h1 className="mt-2 font-display text-4xl text-nootr-cream">Nootricionista</h1>
      <p className="mt-4 text-sm leading-relaxed text-nootr-muted">
        O Nootr cuida dos ajustes do dia a dia — o que fazer quando o imprevisto acontece. Mas nada
        substitui uma nutricionista de verdade, que entende de você, personaliza e acompanha de perto.
      </p>

      {/* Seção 1: Por que um nutricionista? */}
      <div className="card mt-8">
        <p className="label-caps text-nootr-bordoSoft">Por que</p>
        <h2 className="mt-2 font-display text-2xl text-nootr-cream">Um Nutricionista é Essencial</h2>
        <ul className="mt-4 space-y-3 text-sm text-nootr-muted">
          <li className="flex gap-3">
            <span className="shrink-0 text-nootr-bordoSoft">✓</span>
            <span>
              <strong>Cada corpo é único.</strong> Não existe dieta genérica que funcione pra todos.
              Um nutricionista analisa VOCÊ — seu metabolismo, atividade, história, objetivos.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 text-nootr-bordoSoft">✓</span>
            <span>
              <strong>Acompanhamento real.</strong> Ajusta a estratégia conforme você progride, evita
              platôs, evolui com você. Não é uma receita fixa da internet.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 text-nootr-bordoSoft">✓</span>
            <span>
              <strong>Desvios viram oportunidades.</strong> Quando você come fora do plano, ele ajusta
              o resto do dia pra você não perder progresso — e é exatamente aqui que o Nootr brilha.
            </span>
          </li>
        </ul>
      </div>

      {/* Seção 2: Plano Individualizado */}
      <div className="card mt-6">
        <p className="label-caps">Seu plano</p>
        <h2 className="mt-2 font-display text-2xl text-nootr-cream">Alimentar Individualizado</h2>
        <p className="mt-3 text-sm text-nootr-muted">
          O Nootr deixa você montar sua dieta como gostaria, mas com suporte de verdade.
        </p>
        <div className="mt-4 space-y-2 rounded-lg bg-nootr-black p-4 text-xs text-nootr-cream">
          <p>✓ Cálculo de calorias baseado no SEU metabolismo</p>
          <p>✓ Distribuição de macros (proteína, carbo, gordura) alinhada com objetivos</p>
          <p>✓ Alimentos que você realmente gosta — não vamos pedir brócolis todo dia</p>
          <p>✓ Refeições estruturadas pra caber na sua rotina</p>
        </div>
      </div>

      {/* Seção 3: Descontos */}
      <div className="card mt-6 border-nootr-bordo/60 shadow-[0_0_0_1px_rgba(138,30,50,0.25)]">
        <p className="label-caps text-nootr-bordoSoft">Oferta exclusiva</p>
        <h2 className="mt-2 font-display text-2xl text-nootr-cream">Descontos Nootr Pro</h2>

        <div className="mt-6 space-y-4">
          {/* 20% Anual */}
          <div className="rounded-lg border border-nootr-bordoSoft/40 bg-nootr-bordoSoft/5 p-4">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl text-nootr-cream">20%</span>
              <span className="text-xs text-nootr-muted">em consultas com nutricionista</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-nootr-bordoSoft">Plano Pro Anual</p>
            <p className="mt-2 text-xs text-nootr-muted">
              Você se comprometeu com um ano de transformação. Por isso a primeira consulta sai{" "}
              <strong>20% mais barata</strong> — um brinde pra quem topa de verdade.
            </p>
          </div>

          {/* 10% Mensal */}
          <div className="rounded-lg border border-nootr-line/40 bg-nootr-line/5 p-4">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl text-nootr-cream">10%</span>
              <span className="text-xs text-nootr-muted">em consultas com nutricionista</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-nootr-cream">Plano Pro Mensal</p>
            <p className="mt-2 text-xs text-nootr-muted">
              Você tá testando mês a mês — faz sentido. A primeira consulta sai{" "}
              <strong>10% mais barata</strong> pra dar aquele passo com um profissional, sem
              compromisso de longo prazo.
            </p>
          </div>

          <p className="text-xs text-nootr-faint">
            Válido pra primeira consulta ou primeira contratação de plano. Presencial (Balneário
            Piçarras - SC) ou online (Brasil e exterior).
          </p>
        </div>
      </div>

      {/* CTAs Dinâmicas */}
      <div className="card mt-6">
        <p className="label-caps">Próximo passo</p>
        <h2 className="mt-2 font-display text-2xl text-nootr-cream">Qual é seu plano?</h2>

        {showBasicCTA && (
          <>
            <p className="mt-3 text-sm text-nootr-muted">
              Você tá no Plano Basic. Pra acessar descontos com nutricionista, migre pro Plano Pro.
            </p>
            <Link href="/plano" className="btn-primary mt-5 inline-flex">
              Migrar para Plano Pro →
            </Link>
          </>
        )}

        {showMonthlyCTA && (
          <>
            <p className="mt-3 text-sm text-nootr-muted">
              Você tá no Plano Pro Mensal e tem direito a <strong>10% de desconto</strong> na primeira
              consulta.
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href="https://wa.me/5547992279022?text=Olá! Sou usuária(o) do Plano Pro Mensal do Nootr e gostaria de agendar uma consulta com o desconto exclusivo de 10% oferecido. Qual seria a disponibilidade?"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex-1 text-center"
              >
                Agendar com 10% →
              </a>
              <Link href="/plano" className="btn-secondary flex-1 text-center">
                Upgrade para Anual →
              </Link>
            </div>
          </>
        )}

        {showAnnualCTA && (
          <>
            <p className="mt-3 text-sm text-nootr-muted">
              Você tá no Plano Pro Anual — você tem direito a <strong>20% de desconto</strong> na
              primeira consulta.
            </p>
            <a
              href="https://wa.me/5547992279022?text=Olá! Sou usuária(o) do Plano Pro Anual do Nootr e gostaria de agendar uma consulta com o desconto exclusivo de 20% oferecido. Qual seria a disponibilidade?"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mt-5 inline-flex"
            >
              Agendar com 20% →
            </a>
          </>
        )}
      </div>
    </article>
  );
}

export default function NootricionistaPage() {
  return (
    <RequireAuth>
      {(token) => <NootricionistaContent token={token} />}
    </RequireAuth>
  );
}
