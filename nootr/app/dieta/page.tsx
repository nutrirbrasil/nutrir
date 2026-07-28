"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DietBuilder } from "@/components/DietBuilder";
import { DietView } from "@/components/DietView";
import { StreakCard } from "@/components/StreakCard";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader } from "@/components/PageHeader";
import { nootrApi } from "@/lib/api";
import type { Diet } from "@/lib/types";

type Mode = "view" | "edit";
type ViewTab = "today" | "original";

function DietaContent({ token }: { token: string }) {
  const router = useRouter();
  const [diet, setDiet] = useState<Diet | null>(null);
  const [originalDiet, setOriginalDiet] = useState<Diet | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [hasPendingReview, setHasPendingReview] = useState(false);
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("view");
  const [tab, setTab] = useState<ViewTab>("today");

  const reload = useCallback(async () => {
    const data = await nootrApi.getTodayDiet(token);
    setDiet(data.diet);
    setOriginalDiet(data.original_diet);
    setNeedsSetup(data.needs_setup);
    setHasPendingReview(data.has_pending_review);
    setDate(data.date);
    return data;
  }, [token]);

  useEffect(() => {
    let active = true;
    // Conta recém-criada (login por senha ou primeiro login com Google, que
    // cai direto aqui via redirectTo) ainda não escolheu país/plano, ver
    // app/onboarding. Não carrega a dieta nesse caso, só redireciona.
    nootrApi
      .getProfile(token)
      .then((profile) => {
        if (!active) return;
        if (!profile.has_profile) {
          router.replace("/onboarding");
          return;
        }
        return reload().then((data) => {
          if (!active) return;
          // Se já tem uma dieta gerada pelo Nootr aguardando revisão, não
          // empurra pro modo de montar manualmente, deixa a pessoa ver o
          // aviso de espera (ela ainda pode montar manualmente se quiser).
          if (data.needs_setup && !data.has_pending_review) setMode("edit");
        });
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar a dieta. Verifique se a API está rodando.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, token]);

  function handleSaved() {
    setMode("view");
    reload().catch(() => setError("Não foi possível recarregar a dieta."));
  }

  return (
    <div>
      <PageHeader
        icon="calendar"
        title="Dieta"
        subtitle={mode === "view" ? "Plano do dia, macros e refeições." : "Monte as refeições com alimentos pré existentes, criados por você ou escaneando o código de barras."}
        right={
          <>
            {mode === "view" && diet && (
              <div className="flex shrink-0 items-center gap-4">
                <button onClick={() => window.print()} className="btn-ghost">
                  Baixar PDF / Imprimir
                </button>
                <button onClick={() => setMode("edit")} className="btn-ghost">
                  Editar dieta →
                </button>
              </div>
            )}
            {mode === "edit" && !needsSetup && (
              <button onClick={() => setMode("view")} className="btn-ghost shrink-0">
                ← Voltar
              </button>
            )}
          </>
        }
      />

      <div className="mt-10">
        {loading && <p className="text-sm text-nootr-muted">Carregando dieta…</p>}
        {error && (
          <p className="rounded-xl border border-nootr-bordo/40 bg-nootr-wine/40 p-4 text-sm text-nootr-bordoSoft">
            {error}
          </p>
        )}

        {!loading && !diet && needsSetup && hasPendingReview && mode === "view" && (
          <div className="card">
            <p className="font-display text-2xl text-nootr-cream">Sua dieta está a caminho</p>
            <p className="mt-2 text-sm text-nootr-muted">
              Sua dieta já foi gerada pelo Nootr e está aguardando revisão de um nutricionista parceiro.
              Você receberá em até 24h.
            </p>
          </div>
        )}

        {!loading && mode === "view" && diet && (
          <>
            {/* Fora da área de impressão: é reconhecimento de uso, não faz
                parte do plano que a pessoa leva impresso. */}
            <div className="no-print">
              <StreakCard token={token} />
            </div>

            {/* "Original" só existe de fato quando difere do dia ajustado,
                mas as abas ficam sempre visíveis: sumir e reaparecer
                conforme o Noo mexe no dia seria mais confuso que mostrar
                uma aba idêntica quando ainda não houve ajuste hoje. */}
            <div className="no-print mb-5 flex gap-1 border-b border-nootr-line">
              <button
                onClick={() => setTab("today")}
                className={`px-3.5 py-2.5 text-sm font-medium transition ${
                  tab === "today"
                    ? "border-b-2 border-nootr-bordo text-nootr-cream"
                    : "text-nootr-faint hover:text-nootr-muted"
                }`}
              >
                Dieta alterada de hoje
              </button>
              <button
                onClick={() => setTab("original")}
                className={`px-3.5 py-2.5 text-sm font-medium transition ${
                  tab === "original"
                    ? "border-b-2 border-nootr-bordo text-nootr-cream"
                    : "text-nootr-faint hover:text-nootr-muted"
                }`}
              >
                Dieta original
              </button>
            </div>

            <div id="diet-print-area">
              {tab === "today" || !originalDiet ? (
                <DietView diet={diet} date={date} />
              ) : (
                <>
                  <p className="no-print mb-4 text-sm text-nootr-muted">
                    O plano que você montou, sem as alterações que o Noo ou as funções manuais
                    fizeram hoje.
                  </p>
                  <DietView diet={originalDiet} date={date} />
                </>
              )}
            </div>
          </>
        )}
        {!loading && mode === "edit" && <DietBuilder token={token} onSaved={handleSaved} />}
      </div>
    </div>
  );
}

export default function DietaPage() {
  return <RequireAuth>{(token) => <DietaContent token={token} />}</RequireAuth>;
}
