"use client";

import { useCallback, useEffect, useState } from "react";
import { SkeletonPage } from "@/components/Skeleton";
import { NooChat } from "@/components/NooChat";
import { SubstitutionPanel } from "@/components/SubstitutionPanel";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader } from "@/components/PageHeader";
import { nootrApi } from "@/lib/api";
import type { Meal } from "@/lib/types";

function SubstituirContent({ token }: { token: string }) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  // O Noo é o caminho principal; as três funções manuais ficam a um clique,
  // pra quem quer marcar item por item (é o caminho de precisão).
  const [showManual, setShowManual] = useState(false);

  const load = useCallback(
    () =>
      nootrApi
        .getTodayDiet(token)
        .then((data) => setMeals(data.diet?.meals ?? []))
        .catch(() => {
          // sem dieta: o painel manual mostra o estado vazio com CTA
        }),
    [token]
  );

  useEffect(() => {
    let active = true;
    load().finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [load]);

  return (
    <div>
      <PageHeader
        icon="swap"
        title="Substituir"
        subtitle="Comeu (ou vai comer) algo fora do plano, ou está sem um alimento? Ajustamos o resto do dia."
      />
      <div className="mt-10 space-y-6">
        {loading ? (
          <SkeletonPage cards={2} />
        ) : (
          <>
            {/* Recarrega a dieta quando o Noo aplica alguma mudança, pro
                painel manual (que trabalha em cima das refeições de hoje)
                não continuar com a versão antiga. */}
            <NooChat token={token} onApplied={load} />

            {showManual ? (
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="label-caps mb-0">Ajuste manual</p>
                  <button
                    type="button"
                    onClick={() => setShowManual(false)}
                    className="text-xs text-nootr-faint transition-colors hover:text-nootr-bordoSoft"
                  >
                    fechar
                  </button>
                </div>
                <SubstitutionPanel token={token} meals={meals} />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowManual(true)}
                className="w-full text-center text-xs text-nootr-faint underline-offset-4 transition-colors hover:text-nootr-bordoSoft hover:underline"
              >
                Prefiro ajustar manualmente, item por item
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SubstituirPage() {
  return <RequireAuth>{(token) => <SubstituirContent token={token} />}</RequireAuth>;
}
