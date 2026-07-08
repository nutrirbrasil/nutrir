"use client";

import { useEffect, useState } from "react";
import { SubstitutionPanel } from "@/components/SubstitutionPanel";
import { RequireAuth } from "@/components/RequireAuth";
import { nootrApi } from "@/lib/api";
import type { Meal } from "@/lib/types";

function SubstituirContent({ token }: { token: string }) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    nootrApi
      .getTodayDiet(token)
      .then((data) => {
        if (active) setMeals(data.diet?.meals ?? []);
      })
      .catch(() => {
        // sem dieta: painel mostra o estado vazio com CTA
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div>
      <div className="divider-bordo mb-4" />
      <h1 className="font-display text-4xl text-nootr-cream">Substituir</h1>
      <p className="mt-2 max-w-xl text-sm text-nootr-muted">
        Comeu (ou vai comer) algo fora do plano, ou está sem um alimento? Ajustamos o resto do dia.
      </p>
      <div className="mt-10">
        {loading ? (
          <p className="text-sm text-nootr-muted">Carregando…</p>
        ) : (
          <SubstitutionPanel token={token} meals={meals} />
        )}
      </div>
    </div>
  );
}

export default function SubstituirPage() {
  return <RequireAuth>{(token) => <SubstituirContent token={token} />}</RequireAuth>;
}
