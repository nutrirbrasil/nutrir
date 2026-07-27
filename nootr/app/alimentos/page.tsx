"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/Skeleton";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader } from "@/components/PageHeader";
import { nootrApi } from "@/lib/api";
import type { CustomFood } from "@/lib/types";

const STATUS_LABEL: Record<CustomFood["status"], string> = {
  pending: "pendente",
  approved: "aprovado",
  rejected: "rejeitado",
};

function StatusBadge({ status }: { status: CustomFood["status"] }) {
  const color =
    status === "approved" ? "text-emerald-400/90" : status === "rejected" ? "text-nootr-bordoSoft" : "text-nootr-faint";
  return <span className={`text-xs ${color}`}>{STATUS_LABEL[status]}</span>;
}

/** Alimentos cadastrados à mão pelo usuário (via "+ Adicionar novo alimento" no
 * picker), permanentes na conta, nascem "pending" até revisão manual entrar
 * na base TACO geral (ver repository.insert_custom_food). */
function AlimentosContent({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [foods, setFoods] = useState<CustomFood[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    nootrApi
      .listCustomFoods(token)
      .then((data) => active && setFoods(data.results))
      .catch(() => active && setError("Não foi possível carregar seus alimentos."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  async function handleDelete(id: string) {
    const prev = foods;
    setFoods((f) => f.filter((x) => x.id !== id));
    try {
      await nootrApi.deleteCustomFood(token, id);
    } catch (err) {
      setFoods(prev);
      setError(err instanceof Error ? err.message : "Erro ao remover alimento");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon="barcode"
        title="Meus alimentos"
        subtitle={<>Alimentos que você cadastrou à mão (via &ldquo;+ Adicionar novo alimento&rdquo; na busca), ficam permanentes na sua conta e disponíveis pra qualquer refeição ou dieta.</>}
      />

      {loading ? (
        <div className="mt-6"><SkeletonCard lines={2} /></div>
      ) : (
        <div className="mt-6 space-y-6">
          {error && <p className="text-sm text-nootr-bordoSoft">{error}</p>}

          {foods.length === 0 ? (
            <EmptyState
              icon="barcode"
              title="Nenhum alimento seu ainda"
              description={<>Quando a busca não tiver um alimento que você usa, cadastre pelo &ldquo;+ Adicionar novo alimento&rdquo; ou escaneie o código de barras. Ele fica salvo na sua conta pra qualquer refeição.</>}
              action={{ label: "Montar minha dieta", href: "/dieta" }}
            />
          ) : (
            <ul className="space-y-1.5">
              {foods.map((f) => (
                <li key={f.id} className="rounded-lg border border-nootr-line bg-nootr-black px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-nootr-cream">{f.name}</p>
                        <StatusBadge status={f.status} />
                      </div>
                      <p className="truncate text-xs text-nootr-faint">
                        {f.kcal_100g} kcal · P {f.protein_100g}g · C {f.carbs_100g}g · G {f.fat_100g}g (por 100g)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(f.id)}
                      className="shrink-0 text-xs text-nootr-muted transition-colors hover:text-nootr-bordoSoft"
                    >
                      remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function AlimentosPage() {
  return <RequireAuth>{(token) => <AlimentosContent token={token} />}</RequireAuth>;
}
