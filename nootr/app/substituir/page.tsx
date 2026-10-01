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
  // Template original (sem os ajustes de hoje), só pros exemplos do Noo: um
  // alimento que já saiu da dieta hoje (troca manual ou do próprio Noo) não
  // faz sentido como sugestão de "não comi X", ver NooChat.buildSuggestions.
  const [originalMeals, setOriginalMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    () =>
      nootrApi
        .getTodayDiet(token)
        .then((data) => {
          setMeals(data.diet?.meals ?? []);
          setOriginalMeals(data.original_diet?.meals ?? data.diet?.meals ?? []);
        })
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
        subtitle="Comeu ou vai comer algo fora do plano, ou está sem um alimento? O Nootr ajusta o resto do dia."
      />
      <div className="mt-10 space-y-6">
        {loading ? (
          <SkeletonPage cards={2} />
        ) : (
          <>
            {/* Recarrega a dieta quando o Noo aplica alguma mudança, pro
                painel manual (que trabalha em cima das refeições de hoje)
                não continuar com a versão antiga. */}
            <NooChat token={token} onApplied={load} meals={originalMeals} currentMeals={meals} />

            <div>
              <p className="label-caps mb-4">Ajuste manual</p>
              <SubstitutionPanel token={token} meals={meals} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SubstituirPage() {
  return <RequireAuth>{(token) => <SubstituirContent token={token} />}</RequireAuth>;
}
