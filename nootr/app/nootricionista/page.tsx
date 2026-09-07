"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { Icon } from "@/components/Icon";
import { SkeletonPage } from "@/components/Skeleton";
import { nootrApi } from "@/lib/api";
import type { Profile } from "@/lib/types";
import {
  NUTRITIONIST_DISCOUNT_PCT_ANNUAL as PCT_ANNUAL,
  NUTRITIONIST_DISCOUNT_PCT_MONTHLY as PCT_MONTHLY,
} from "@/lib/plan";
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
      <div className="mx-auto max-w-2xl px-4 py-10">
        <SkeletonPage cards={2} />
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
      <div className="rise-in">
        <div className="divider-bordo mb-4" />
        <div className="flex items-start gap-4">
          <span className="icon-badge-lg mt-1">
            <Icon name="handshake" size={22} />
          </span>
          <div>
            <p className="label-caps text-nootr-bordoSoft">Nutricionista + Nootr</p>
            <h1 className="mt-1 font-display text-2xl text-nootr-cream sm:text-4xl">A dupla que funciona</h1>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-nootr-muted">
          O Nootr é seu companheiro nos momentos críticos. Mas ele é mais poderoso ainda quando trabalhando
          junto a uma nutricionista de verdade que entende seu corpo, seus objetivos e desenha sua estratégia.
        </p>
      </div>

      {/* Seção 1: O que é Nootr */}
      <div className="card card-sheen mt-8 transition-all duration-300">
        <p className="label-caps text-nootr-bordoSoft">Seu companheiro</p>
        <h2 className="mt-2 font-display text-2xl text-nootr-cream">O Nootr te ajuda nos momentos críticos</h2>
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
      <div className="card card-sheen mt-6 transition-all duration-300">
        <p className="label-caps text-nootr-bordoSoft">O alicerce</p>
        <h2 className="mt-2 font-display text-2xl text-nootr-cream">Por que você precisa de um nutricionista</h2>
        <p className="mt-3 text-sm text-nootr-muted">
          O Nootr é ótimo pros desvios do dia a dia. Mas a fundação de tudo é uma dieta feita por um
          profissional que entende você. É aqui que tudo muda de verdade.
        </p>
        <ul className="mt-4 space-y-3 text-sm text-nootr-muted">
          <li className="flex gap-3">
            <span className="shrink-0 text-nootr-bordoSoft">✓</span>
            <span>
              <strong>Uma dieta personalizada é a fundação.</strong> Não é receita do YouTube nem do seu
              colega de academia, é você: seu metabolismo, sua história, seus objetivos. Só um
              profissional consegue desenhar isso certo.
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
      <div className="card mt-6 bg-nootr-wine/20">
        <p className="label-caps text-nootr-bordoSoft">Bônus do Nootr Pro</p>
        <h2 className="mt-2 font-display text-2xl italic text-nootr-cream">Seu desconto com a nutricionista</h2>
        <p className="mt-3 text-sm text-nootr-muted">
          Você já está investindo em si mesmo com o Nootr Pro, e sabe que o Nootr não substitui um
          nutricionista. Por isso preparamos um desconto exclusivo pra você dar o próximo passo: o
          acompanhamento com a própria nutricionista cofundadora do Nootr.
        </p>

        <div className="mt-6 space-y-4">
          {/* Desconto do Pro Mensal */}
          <div className="rounded-lg bg-nootr-line/10 p-4">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl text-nootr-cream">{PCT_MONTHLY}%</span>
              <span className="text-xs text-nootr-muted">de desconto</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-nootr-cream">Plano Pro Mensal</p>
            <p className="mt-2 text-xs text-nootr-muted">
              Você está testando a jornada mês a mês. Para incentivar você a continuar motivado, a
              primeira consulta ou plano sai <strong>{PCT_MONTHLY}% mais barato</strong> pra você experimentar o
              acompanhamento profissional junto com o Nootr.
            </p>
          </div>

          {/* Desconto do Pro Anual */}
          <div className="rounded-lg bg-nootr-bordoSoft/10 p-4">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl text-nootr-cream">{PCT_ANNUAL}%</span>
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
                Você está no plano Basic. Pra ter o desconto com a nutricionista, migre pro plano Pro.
              </p>
              <p className="mt-2 text-sm text-nootr-muted">
                Assine o plano Pro anual e garanta {PCT_ANNUAL}% de desconto na mensalidade do Nootr e no
                acompanhamento nutricional.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/plano" className="btn-primary inline-flex">
                  Migrar para o Pro
                </Link>
                <Link href="/plano" className="btn-secondary inline-flex">
                  Assinar o plano Pro anual ({PCT_ANNUAL}% off)
                </Link>
              </div>
            </>
          )}

          {showMonthlyCTA && (
            <>
              <p className="text-sm text-nootr-cream">
                Você está no plano Pro mensal.
              </p>
              <p className="mt-2 text-sm text-nootr-muted">
                Assine o plano Pro anual e garanta {PCT_ANNUAL}% de desconto na mensalidade do Nootr e no
                acompanhamento nutricional.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href={pauliNootrMonthlyUrl} className="btn-primary inline-flex">
                  Conhecer a nutricionista ({PCT_MONTHLY}% off)
                </a>
                <Link href="/plano" className="btn-secondary inline-flex">
                  Assinar o plano Pro anual ({PCT_ANNUAL}% off)
                </Link>
              </div>
            </>
          )}

          {showAnnualCTA && (
            <>
              <p className="text-sm text-nootr-cream">
                Você está no plano Pro anual.
              </p>
              <a
                href={pauliNootrAnnualUrl}
                className="btn-primary mt-5 inline-flex"
              >
                Conhecer a nutricionista ({PCT_ANNUAL}% off) →
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
