"use client";

import { useCallback, useEffect, useState } from "react";
import { DietBuilder } from "@/components/DietBuilder";
import { DietView } from "@/components/DietView";
import { RequireAuth } from "@/components/RequireAuth";
import { nootrApi } from "@/lib/api";
import type { Diet } from "@/lib/types";

type Mode = "view" | "edit";

function DietaContent({ token }: { token: string }) {
  const [diet, setDiet] = useState<Diet | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("view");

  const reload = useCallback(async () => {
    const data = await nootrApi.getTodayDiet(token);
    setDiet(data.diet);
    setNeedsSetup(data.needs_setup);
    setDate(data.date);
    return data;
  }, [token]);

  useEffect(() => {
    let active = true;
    reload()
      .then((data) => {
        if (!active) return;
        if (data.needs_setup) setMode("edit");
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
  }, [reload]);

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
          <button onClick={() => setMode("edit")} className="btn-ghost shrink-0 pb-1">
            Editar dieta →
          </button>
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

        {!loading && mode === "view" && diet && <DietView diet={diet} date={date} />}
        {!loading && mode === "edit" && <DietBuilder token={token} onSaved={handleSaved} />}
      </div>
    </div>
  );
}

export default function DietaPage() {
  return <RequireAuth>{(token) => <DietaContent token={token} />}</RequireAuth>;
}
