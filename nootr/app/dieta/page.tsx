"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DietBuilder } from "@/components/DietBuilder";
import { DietView } from "@/components/DietView";
import { RequireAuth } from "@/components/RequireAuth";
import { nootrApi } from "@/lib/api";
import type { Diet } from "@/lib/types";

type Mode = "view" | "edit";

function DietaContent({ token }: { token: string }) {
  const router = useRouter();
  const [diet, setDiet] = useState<Diet | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [hasPendingReview, setHasPendingReview] = useState(false);
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("view");

  const reload = useCallback(async () => {
    const data = await nootrApi.getTodayDiet(token);
    setDiet(data.diet);
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
      <div className="divider-bordo mb-4" />
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-nootr-cream">Dieta</h1>
          <p className="mt-2 text-sm text-nootr-muted">
            {mode === "view" ? "Plano do dia, macros e refeições." : "Monte as refeições com alimentos da TACO (ou código de barras)."}
          </p>
        </div>
        {mode === "view" && diet && (
          <div className="flex shrink-0 items-center gap-4 pb-1">
            <button onClick={() => window.print()} className="btn-ghost">
              Baixar PDF / Imprimir
            </button>
            <button onClick={() => setMode("edit")} className="btn-ghost">
              Editar dieta →
            </button>
          </div>
        )}
        {mode === "edit" && !needsSetup && (
          <button onClick={() => setMode("view")} className="btn-ghost shrink-0 pb-1">
            ← Voltar
          </button>
        )}
      </div>

      <div className="mt-10">
        {loading && <p className="text-sm text-nootr-muted">Carregando dieta…</p>}
        {error && (
          <p className="rounded-xl border border-nootr-bordo/40 bg-nootr-wine/40 p-4 text-sm text-nootr-bordoSoft">
            {error}
          </p>
        )}

        {!loading && hasPendingReview && (
          <p className="mb-4 rounded-xl border border-nootr-line bg-nootr-wine/30 px-4 py-3 text-sm text-nootr-muted">
            Você tem uma dieta gerada pelo Nootr aguardando revisão de um nutricionista parceiro, chega em
            até 24h.
          </p>
        )}

        {!loading && !diet && needsSetup && hasPendingReview && mode === "view" && (
          <div className="card">
            <p className="font-display text-2xl text-nootr-cream">Sua dieta está a caminho</p>
            <p className="mt-2 text-sm text-nootr-muted">
              Assim que a revisão terminar, ela aparece aqui automaticamente.
            </p>
            <button onClick={() => setMode("edit")} className="btn-ghost mt-4 text-sm">
              Prefere montar a sua enquanto isso? →
            </button>
          </div>
        )}

        {!loading && mode === "view" && diet && (
          <div id="diet-print-area">
            <DietView diet={diet} date={date} />
          </div>
        )}
        {!loading && mode === "edit" && <DietBuilder token={token} onSaved={handleSaved} />}
      </div>
    </div>
  );
}

export default function DietaPage() {
  return <RequireAuth>{(token) => <DietaContent token={token} />}</RequireAuth>;
}
