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

  // URLs para Pauli com desconto dinâmico
  const pauliNootrAnnualUrl = "https://pauli.nutrirpicarras.com.br/nootr?plan=annual";
  const pauliNootrMonthlyUrl = "https://pauli.nutrirpicarras.com.br/nootr?plan=monthly";

  return (
    <article className="mx-auto max-w-2xl">
      <div className="divider-bordo mb-4" />
      <p className="label-caps text-nootr-bordoSoft">Nutricionista + Nootr</p>
      <h1 className="mt-2 font-display text-4xl text-nootr-cream">A Dupla Que Funciona</h1>
      <p className="mt-4 text-sm leading-relaxed text-nootr-muted">
        O Nootr é seu companheiro nos momentos críticos. Mas ele é mais poderoso ainda quando trabalhando
        junto a uma nutricionista de verdade que entende seu corpo, seus objetivos e desenha sua estratégia.
      </p>

      {/* Seção 1: O que é Nootr */}
      <div className="card mt-8">
        <p className="label-caps text-nootr-bordoSoft">Seu Companheiro</p>
        <h2 className="mt-2 font-display text-2xl text-nootr-cream">O Nootr te Ajuda nos Momentos Críticos</h2>
        <p className="mt-3 text-sm text-nootr-muted">
          Você montou uma dieta. Mas entre um dia e outro, a vida acontece. Você come fora do plano, surge
          um imprevisto, tudo muda. O Nootr tá ali pra isso, não pra substituir profissional, mas pra te
          dar inteligência quando você mais precisa.
        </p>
        <ul className="mt-4 space-y-3 text-sm text-nootr-muted">
          <li className="flex gap-3">
            <span className="shrink-0 text-nootr-bordoSoft">→</span>
            <span>
              <strong>Você comeu diferente.</strong> O Nootr ajusta o resto do seu dia pra você não perder
              o progresso, sem sobrecarregar seu nutricionista.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 text-nootr-bordoSoft">→</span>
            <span>
              <strong>Precisa de alternativas rápido.</strong> Nootr busca substituições que fazem sentido
              pro seu plano, respeitando o trabalho do profissional.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 text-nootr-bordoSoft">→</span>
            <span>
              <strong>Você fica autossuficiente.</strong> Com a dieta do profissional + inteligência do
              Nootr, você consegue navegar sozinho entre consultas, sem perder a direção.
            </span>
          </li>
        </ul>
      </div>

      {/* Seção 2: Por que Nutricionista é Essencial */}
      <div className="card mt-6">
        <p className="label-caps text-nootr-bordoSoft">O Alicerce</p>
        <h2 className="mt-2 font-display text-2xl text-nootr-cream">Por que Você Precisa de um Nutricionista</h2>
        <p className="mt-3 text-sm text-nootr-muted">
          Nootr é ótimo pra os desvios do dia a dia. Mas a fundação de tudo é uma dieta feita por um
          profissional que ENTENDE você. Aqui é onde tudo muda de verdade.
        </p>
        <ul className="mt-4 space-y-3 text-sm text-nootr-muted">
          <li className="flex gap-3">
            <span className="shrink-0 text-nootr-bordoSoft">✓</span>
            <span>
              <strong>Dieta PERSONALIZADA é fundação.</strong> Não é receita do YouTube ou do seu colega
              de academia. É VOCÊ, seu metabolismo, sua história, seus objetivos. Só um profissional
              consegue desenhar isso certo.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 text-nootr-bordoSoft">✓</span>
            <span>
              <strong>Acompanhamento de verdade.</strong> Ajustes conforme você evolui, estratégia que
              muda quando precisa, alguém monitorando pra evitar platôs e frustração.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 text-nootr-bordoSoft">✓</span>
            <span>
              <strong>Você aprende de verdade.</strong> Entende por que come cada coisa, como seu corpo
              funciona, e consegue fazer escolhas inteligentes pro resto da vida.
            </span>
          </li>
        </ul>
      </div>

      {/* Seção 3: Oferta de Desconto */}
      <div className="card mt-6 border-nootr-bordoSoft/40 shadow-[0_0_0_1px_rgba(138,30,50,0.25)]">
        <p className="label-caps text-nootr-bordoSoft">Bônus Exclusivo Nootr Pro</p>
        <h2 className="mt-2 font-display text-2xl text-nootr-cream">Você Ganhou um Desconto Exclusivo!</h2>
        <p className="mt-3 text-sm text-nootr-muted">
          Como agradecimento por já estar investindo em si mesmo com o Nootr Pro e entendendo que o Nootr
          NÃO SUBSTITUI um nutricionista, estamos entregando a você uma oportunidade de ter um
          acompanhamento nutricional com a própria nutricionista cofundadora do Nootr com um desconto
          único, para você dar o próximo passo.
        </p>

        <div className="mt-6 space-y-4">
          {/* 10% Mensal */}
          <div className="rounded-lg border border-nootr-line/40 bg-nootr-line/5 p-4">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl text-nootr-cream">10%</span>
              <span className="text-xs text-nootr-muted">de desconto</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-nootr-cream">Plano Pro Mensal</p>
            <p className="mt-2 text-xs text-nootr-muted">
              Você está testando a jornada mês a mês. Para incentivar você a continuar motivado, a
              primeira consulta ou plano sai <strong>10% mais barato</strong> pra você experimentar o
              acompanhamento profissional junto com o Nootr.
            </p>
          </div>

          {/* 20% Anual */}
          <div className="rounded-lg border border-nootr-bordoSoft/40 bg-nootr-bordoSoft/5 p-4">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl text-nootr-cream">20%</span>
              <span className="text-xs text-nootr-muted">de desconto</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-nootr-bordoSoft">Plano Pro Anual</p>
            <p className="mt-2 text-xs text-nootr-muted">
              Você já se comprometeu com um ano de transformação. Por isso, em forma de agradecimento e
              de incentivo, você receberá o <strong>desconto máximo</strong>.
            </p>
          </div>

          <p className="text-xs text-nootr-faint">
            Válido pra primeira consulta ou primeira contratação de plano com nutricionista. Presencial
            (Balneário Piçarras, SC) ou online (Brasil e exterior).
          </p>
        </div>

        {/* CTAs Dinâmicas */}
        <div className="mt-6 border-t border-nootr-line/30 pt-6">
          {showBasicCTA && (
            <>
              <p className="text-sm text-nootr-muted">
                Você tá no Plano Basic. Pra acessar desconto com o nutricionista, migre pro Plano Pro.
              </p>
              <p className="mt-2 text-sm text-nootr-muted">
                Assine o Plano Pro Anual e garanta 20% de desconto na mensalidade do Nootr e no
                acompanhamento nutricional.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/plano" className="btn-primary inline-flex">
                  Migrar para Plano Pro
                </Link>
                <Link href="/plano" className="btn-secondary inline-flex">
                  Assinar Plano Pro Anual (20% off)
                </Link>
              </div>
            </>
          )}

          {showMonthlyCTA && (
            <>
              <p className="text-sm text-nootr-cream">
                Você tá no Plano Pro Mensal.
              </p>
              <p className="mt-2 text-sm text-nootr-muted">
                Assine o Plano Pro Anual e garanta 20% de desconto na mensalidade do Nootr e no
                acompanhamento nutricional.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href={pauliNootrMonthlyUrl} className="btn-primary inline-flex">
                  Conhecer Nutricionista (10% off)
                </a>
                <Link href="/plano" className="btn-secondary inline-flex">
                  Assinar Plano Pro Anual (20% off)
                </Link>
              </div>
            </>
          )}

          {showAnnualCTA && (
            <>
              <p className="text-sm text-nootr-cream">
                Você tá no Plano Pro Anual.
              </p>
              <a
                href={pauliNootrAnnualUrl}
                className="btn-primary mt-5 inline-flex"
              >
                Conhecer Nutricionista (20% off) →
              </a>
            </>
          )}
        </div>
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
