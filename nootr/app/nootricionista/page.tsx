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
      <p className="label-caps text-nootr-bordoSoft">Transformação Nutricional</p>
      <h1 className="mt-2 font-display text-4xl text-nootr-cream">Por que Contratar um Nutricionista</h1>
      <p className="mt-4 text-sm leading-relaxed text-nootr-muted">
        Você já sabe que precisa mudar. Sabe que "dieta da internet" não funciona. O que você ainda não
        tem é alguém que entende VOCÊ — sua rotina, seu corpo, seus objetivos. É aí que tudo muda.
      </p>

      {/* Seção 1: O Problema Real */}
      <div className="card mt-8">
        <p className="label-caps text-nootr-bordoSoft">A realidade</p>
        <h2 className="mt-2 font-display text-2xl text-nootr-cream">Por que Você Ainda Não Conseguiu</h2>
        <ul className="mt-4 space-y-3 text-sm text-nootr-muted">
          <li className="flex gap-3">
            <span className="shrink-0 text-nootr-bordoSoft">✗</span>
            <span>
              <strong>Dietas genéricas não funcionam.</strong> Aquela "dieta perfeita" que funciona pra
              sua amiga? Pode ser exatamente o oposto do que seu corpo precisa. Só um profissional
              consegue ler os sinais.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 text-nootr-bordoSoft">✗</span>
            <span>
              <strong>Você precisa de orientação, não de restrição.</strong> Quando você come fora do
              plano (e isso vai acontecer), você não sabe como se recuperar. Fica frustrado. Desiste.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 text-nootr-bordoSoft">✗</span>
            <span>
              <strong>Ninguém tá olhando pra você.</strong> Sem acompanhamento, você não vê o que tá
              funcionando e o que não tá. Segue a mesma receita meses inteiros, mesmo sabendo que não
              funciona.
            </span>
          </li>
        </ul>
      </div>

      {/* Seção 2: A Solução */}
      <div className="card mt-6">
        <p className="label-caps text-nootr-bordoSoft">A diferença</p>
        <h2 className="mt-2 font-display text-2xl text-nootr-cream">Um Nutricionista Muda Tudo</h2>
        <ul className="mt-4 space-y-3 text-sm text-nootr-muted">
          <li className="flex gap-3">
            <span className="shrink-0 text-nootr-bordoSoft">✓</span>
            <span>
              <strong>Seu plano é SEU.</strong> Análise do seu metabolismo, sua história, seus
              objetivos. Não é genérico. Não é copiado. É construído pra você funcionar.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 text-nootr-bordoSoft">✓</span>
            <span>
              <strong>Você aprende a se recuperar.</strong> Comeu fora? Conhece alguém que ajusta seu
              dia em tempo real pra você não perder o progresso. Fica em controle.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 text-nootr-bordoSoft">✓</span>
            <span>
              <strong>Alguém tá de olho em você.</strong> Acompanhamento real, ajustes conforme você
              evolui, estratégia que muda quando precisa. Nenhum platô, nenhuma frustração.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 text-nootr-bordoSoft">✓</span>
            <span>
              <strong>Você finalmente entende nutrição.</strong> Não é seguir regras à risca. É
              aprender como seu corpo funciona pra fazer escolhas inteligentes pro resto da vida.
            </span>
          </li>
        </ul>
      </div>

      {/* Seção 3: Por que Paula */}
      <div className="card mt-6 border-nootr-bordoSoft/40 shadow-[0_0_0_1px_rgba(138,30,50,0.25)]">
        <p className="label-caps text-nootr-bordoSoft">Sobre</p>
        <h2 className="mt-2 font-display text-2xl text-nootr-cream">Paula Pastorino</h2>
        <p className="text-xs uppercase tracking-caps text-nootr-muted">
          Nutricionista Clínica e Esportiva · CRN 18489D
        </p>

        <p className="mt-4 text-sm text-nootr-cream">
          Paula não acredita em terrorismo nutricional. Não vai pedir pra você comer frango com brócolis
          por seis meses. Acredita que nutrição funciona quando <strong>se encaixa na sua vida real</strong>
          .
        </p>

        <div className="mt-4 space-y-2 text-xs text-nootr-muted">
          <p>✓ Atendimento presencial em Balneário Piçarras (SC) ou online (Brasil e exterior)</p>
          <p>
            ✓ Especializada em: emagrecimento saudável, hipertrofia, performance esportiva, saúde da
            mulher, longevidade
          </p>
          <p>✓ Acompanhamento real com ajustes conforme você evolui</p>
        </div>
      </div>

      {/* Seção 4: O Desconto */}
      <div className="card mt-6">
        <p className="label-caps">Seu desconto</p>
        <h2 className="mt-2 font-display text-2xl text-nootr-cream">Isso Você Ganhou Hoje</h2>

        {showBasicCTA && (
          <>
            <p className="mt-3 text-sm text-nootr-muted">
              Você tá no Plano Basic. Pra acessar desconto com Paula, migre pro Plano Pro.
            </p>
            <Link href="/plano" className="btn-primary mt-5 inline-flex">
              Migrar para Plano Pro →
            </Link>
          </>
        )}

        {showMonthlyCTA && (
          <>
            <p className="mt-3 text-sm text-nootr-cream">
              <strong>10% de desconto</strong> na sua primeira consulta com Paula.
            </p>
            <p className="mt-2 text-xs text-nootr-muted">
              É o bastante pra você testar o acompanhamento profissional sem grande compromisso.
            </p>
            <a
              href={pauliNootrMonthlyUrl}
              className="btn-primary mt-5 inline-flex"
            >
              Conhecer Paula (10% off) →
            </a>
          </>
        )}

        {showAnnualCTA && (
          <>
            <p className="mt-3 text-sm text-nootr-cream">
              <strong>20% de desconto</strong> na sua primeira consulta com Paula.
            </p>
            <p className="mt-2 text-xs text-nootr-muted">
              Você se comprometeu com um ano de transformação real. Isso merece um profissional de
              verdade.
            </p>
            <a
              href={pauliNootrAnnualUrl}
              className="btn-primary mt-5 inline-flex"
            >
              Conhecer Paula (20% off) →
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
