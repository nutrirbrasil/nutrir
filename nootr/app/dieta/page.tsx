"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DietView } from "@/components/DietView";
import { RequireAuth } from "@/components/RequireAuth";
import { nootrApi } from "@/lib/api";
import type { Diet } from "@/lib/types";

function DietaContent({ token }: { token: string }) {
  const [diet, setDiet] = useState<Diet | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    nootrApi
      .getTodayDiet(token)
      .then((data) => {
        if (!active) return;
        setDiet(data.diet);
        setNeedsSetup(data.needs_setup);
        setDate(data.date);
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
  }, [token]);

  return (
    <div>
      <div className="divider-bordo mb-4" />
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-nootr-cream">Minha dieta</h1>
          <p className="mt-2 text-sm text-nootr-muted">Plano do dia, macros e refeições.</p>
        </div>
        {diet && (
          <Link href="/montar-dieta" className="btn-ghost shrink-0 pb-1">
            Editar dieta →
          </Link>
        )}
      </div>

      <div className="mt-10">
        {loading && <p className="text-sm text-nootr-muted">Carregando dieta…</p>}
        {error && (
          <p className="rounded-xl border border-nootr-bordo/40 bg-nootr-wine/40 p-4 text-sm text-nootr-bordoSoft">
            {error}
          </p>
        )}

        {!loading && needsSetup && (
          <div className="card mx-auto max-w-lg py-12 text-center">
            <p className="font-display text-3xl text-nootr-cream">Comece pela sua dieta</p>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-nootr-muted">
              Sua dieta nasce em branco: monte as refeições com alimentos da tabela TACO, defina
              suas calorias e salve. Depois é só adaptar o dia quando algo sair do plano.
            </p>
            <Link href="/montar-dieta" className="btn-primary mt-8">
              Montar minha dieta
            </Link>
            <p className="mt-4 text-xs text-nootr-faint">
              Quer calcular suas calorias primeiro?{" "}
              <Link href="/perfil" className="text-nootr-bordoSoft hover:underline">
                Preencha seu perfil
              </Link>
            </p>
          </div>
        )}

        {diet && <DietView diet={diet} date={date} />}
      </div>
    </div>
  );
}

export default function DietaPage() {
  return <RequireAuth>{(token) => <DietaContent token={token} />}</RequireAuth>;
}
