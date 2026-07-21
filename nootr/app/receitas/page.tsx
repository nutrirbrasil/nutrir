"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { FoodAdder, AddedFoodList, addedFoodToInput, type AddedFood } from "@/components/FoodAdder";
import { nootrApi } from "@/lib/api";
import type { Recipe } from "@/lib/types";

/** Pratos compostos salvos pelo usuário (ex: "Crepioca"), confirmados no
 * fluxo de "Descrever com IA" ou criados aqui à mão. Reaproveitados depois:
 * a IA usa os ingredientes salvos direto, sem precisar adivinhar de novo. */
const RECIPE_STATUS_LABEL: Record<Recipe["status"], string> = {
  pending: "pendente",
  approved: "aprovada",
  rejected: "rejeitada",
};

function RecipeStatusBadge({ status }: { status: Recipe["status"] }) {
  const color =
    status === "approved" ? "text-emerald-400/90" : status === "rejected" ? "text-nootr-bordoSoft" : "text-nootr-faint";
  return <span className={`text-xs ${color}`}>{RECIPE_STATUS_LABEL[status]}</span>;
}

function ReceitasContent({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [globalRecipes, setGlobalRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState("");

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIngredients, setNewIngredients] = useState<AddedFood[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([nootrApi.listRecipes(token), nootrApi.listGlobalRecipes(token)])
      .then(([own, global]) => {
        if (!active) return;
        setRecipes(own.results);
        setGlobalRecipes(global.results);
      })
      .catch(() => active && setError("Não foi possível carregar suas receitas."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  async function handleDelete(id: string) {
    const prev = recipes;
    setRecipes((r) => r.filter((x) => x.id !== id));
    try {
      await nootrApi.deleteRecipe(token, id);
    } catch (err) {
      setRecipes(prev);
      setError(err instanceof Error ? err.message : "Erro ao remover receita");
    }
  }

  async function handleCreate() {
    setError("");
    if (!newName.trim()) {
      setError("Dê um nome para a receita.");
      return;
    }
    if (newIngredients.length === 0) {
      setError("Adicione pelo menos um ingrediente.");
      return;
    }
    setSaving(true);
    try {
      const created = await nootrApi.createRecipe(token, {
        name: newName.trim(),
        ingredients: newIngredients.map(addedFoodToInput),
      });
      setRecipes((r) => [created, ...r]);
      setNewName("");
      setNewIngredients([]);
      setCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar receita");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="divider-bordo mb-4" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-nootr-cream">Minhas receitas</h1>
          <p className="mt-2 text-sm text-nootr-muted">
            Pratos que você monta com frequência (ex: crepioca, vitamina caseira). Confirmados no
            &ldquo;Descrever com IA&rdquo; ou criados aqui, a próxima vez que citar o prato, o Nootr já
            sabe os ingredientes.
          </p>
        </div>
        <button type="button" onClick={() => setCreating((v) => !v)} className={`chip shrink-0 ${creating ? "chip-active" : ""}`}>
          {creating ? "cancelar" : "+ nova receita"}
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-nootr-muted">Carregando…</p>
      ) : (
        <div className="mt-6 space-y-6">
          {creating && (
            <div className="rounded-xl border border-nootr-line bg-nootr-black/40 p-3.5 space-y-3">
              <div>
                <label className="label-caps">Nome da receita</label>
                <input
                  className="input-field"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Crepioca"
                />
              </div>
              <div>
                <label className="label-caps">Ingredientes</label>
                <AddedFoodList
                  foods={newIngredients}
                  onRemove={(i) => setNewIngredients((prev) => prev.filter((_, j) => j !== i))}
                  onEdit={(i, f) => setNewIngredients((prev) => prev.map((x, j) => (j === i ? f : x)))}
                />
                <div className="mt-2">
                  <FoodAdder token={token} onAdd={(f) => setNewIngredients((prev) => [...prev, f])} />
                </div>
              </div>
              <button onClick={handleCreate} disabled={saving} className="btn-primary w-full text-sm">
                {saving ? "Salvando…" : "Salvar receita"}
              </button>
            </div>
          )}

          {error && <p className="text-sm text-nootr-bordoSoft">{error}</p>}

          {recipes.length === 0 && !creating ? (
            <p className="text-sm text-nootr-faint">Nenhuma receita salva ainda.</p>
          ) : (
            <ul className="space-y-1.5">
              {recipes.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-nootr-line bg-nootr-black px-3.5 py-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-nootr-cream">{r.name}</p>
                        <RecipeStatusBadge status={r.status} />
                      </div>
                      <p className="truncate text-xs text-nootr-faint">
                        {r.ingredients.map((i) => i.name).join(", ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="shrink-0 text-xs text-nootr-muted transition-colors hover:text-nootr-bordoSoft"
                    >
                      remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {globalRecipes.length > 0 && (
            <div className="border-t border-nootr-line pt-4">
              <p className="label-caps">Receitas da comunidade</p>
              <p className="mt-1 text-xs text-nootr-muted">
                Pratos aprovados que outras pessoas já salvaram, o Nootr também reconhece esses nomes no
                &ldquo;Descrever com IA&rdquo;.
              </p>
              <ul className="mt-3 space-y-1.5">
                {globalRecipes.map((r) => (
                  <li key={r.id} className="rounded-lg border border-nootr-line bg-nootr-black px-3.5 py-2.5">
                    <p className="text-sm text-nootr-cream">{r.name}</p>
                    <p className="truncate text-xs text-nootr-faint">
                      {r.ingredients.map((i) => i.name).join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReceitasPage() {
  return <RequireAuth>{(token) => <ReceitasContent token={token} />}</RequireAuth>;
}
