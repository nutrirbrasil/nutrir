"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SkeletonPage } from "@/components/Skeleton";
import { nootrApi } from "@/lib/api";
import { FoodAdder, AddedFoodList, addedFoodToInput, absoluteFoodToAdded, type AddedFood } from "@/components/FoodAdder";
import { gramsSuffix } from "@/lib/units";
import type {
  Meal,
  PantryMatch,
  Preferences,
  MealChangeKind,
  SubstitutionAction,
  SubstitutionResult,
} from "@/lib/types";

function pantryMatchToAdded(m: PantryMatch): AddedFood {
  return absoluteFoodToAdded(m);
}

function PantryMatchCard({ match, onAdd }: { match: PantryMatch; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="rounded-lg bg-nootr-black px-3 py-2.5 text-left transition-colors hover:bg-nootr-wine/30"
    >
      <p className="text-sm text-nootr-cream">{match.name}</p>
      <p className="mt-0.5 text-xs text-nootr-faint">
        {Math.round(match.calories)} kcal · P{Math.round(match.protein_g)}g · C{Math.round(match.carbs_g)}g · G{Math.round(match.fat_g)}g
      </p>
    </button>
  );
}

const ACTION_LABELS: Record<SubstitutionAction, string> = {
  ate_different: "Comi algo diferente",
  will_eat_different: "Vou comer algo diferente",
  missing_food: "Estou em falta",
};

const ACTION_CARDS: { id: SubstitutionAction; tag: string; desc: string }[] = [
  { id: "ate_different", tag: "Past", desc: "Registre o que comeu e ajustamos o resto do dia." },
  { id: "will_eat_different", tag: "Future", desc: "Planeje uma refeição fora do plano antes de comer." },
  { id: "missing_food", tag: "Now", desc: "Troque um alimento que não tem por outro equivalente." },
];

// A mesma pergunta muda de tempo verbal por ação (já aconteceu, vai
// acontecer, ou é uma falta agora), ver docstring do módulo no backend
// (diet_engine) pra entender por que cada ação trava refeições diferentes.
const MEAL_QUESTION: Record<SubstitutionAction, string> = {
  ate_different: "Qual refeição você comeu algo diferente?",
  will_eat_different: "Qual refeição você vai comer algo diferente?",
  missing_food: "Qual refeição você não terá alimentos à disposição?",
};

const FOOD_QUESTION: Record<SubstitutionAction, string> = {
  ate_different: "Qual alimento você não consumiu?",
  will_eat_different: "Qual alimento você não vai consumir?",
  missing_food: "Qual alimento está em falta?",
};

const ADDED_QUESTION: Record<SubstitutionAction, string> = {
  ate_different: "Quais alimentos você comeu no lugar?",
  will_eat_different: "Quais alimentos você vai comer no lugar?",
  missing_food: "O que você tem no lugar?",
};

/** "A, B e C" (e não "A, B, C"), pro resumo soar como frase escrita. */
function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

// O símbolo carrega o mesmo significado da cor: quem não distingue bordô de
// cinza (ou lê em preto e branco) continua sabendo o que subiu e o que desceu.
const CHANGE_TAGS: Record<MealChangeKind, { label: string; symbol: string; className: string }> = {
  increased: { label: "aumentou", symbol: "↑", className: "text-nootr-bordoSoft" },
  decreased: { label: "diminuiu", symbol: "↓", className: "text-nootr-muted" },
  added: { label: "novo", symbol: "+", className: "text-nootr-bordoSoft" },
  removed: { label: "removido", symbol: "−", className: "text-nootr-faint" },
};

/** Selo do que aconteceu com o alimento no reajuste (ver diet_engine.diff_meals). */
function ChangeTag({ kind }: { kind: MealChangeKind }) {
  const tag = CHANGE_TAGS[kind];
  return (
    <span className={`ml-1.5 text-[10px] font-semibold uppercase tracking-caps ${tag.className}`}>
      <span aria-hidden>{tag.symbol}</span> {tag.label}
    </span>
  );
}

/** Balão do Nootr (pergunta), mesmo estilo visual do chat do Noo, pra manter
 * a experiência consistente entre os dois caminhos de substituição. */
function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      <Image src="/noo-icon.png" alt="" width={24} height={24} className="mb-1 shrink-0" />
      <div className="max-w-full flex-1 rounded-2xl rounded-bl-sm bg-nootr-black px-3.5 py-2.5">{children}</div>
    </div>
  );
}

/** Balão da pessoa (o que ela já respondeu), some do jeito de conversa em vez
 * de sumir a pergunta anterior assim que ela avança pra próxima. */
function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-nootr-bordo/90 px-3.5 py-2">
        <p className="text-sm text-nootr-cream">{children}</p>
      </div>
    </div>
  );
}

/** Checklist de seleção ÚNICA (refeição, ou o alimento que falta), dentro de
 * um balão. `getLabel`/`getSub` extraem o texto de cada item genérico. */
function SingleChecklist<T>({
  items, getId, getLabel, getSub, onSelect,
}: {
  items: T[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  getSub?: (item: T) => string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mt-3 space-y-1.5">
      {items.map((item) => (
        <button
          key={getId(item)}
          type="button"
          onClick={() => onSelect(getId(item))}
          className="flex w-full items-center gap-2.5 rounded-lg bg-nootr-wine/20 px-3 py-2 text-left text-sm text-nootr-cream transition-colors hover:bg-nootr-wine/40"
        >
          <span className="min-w-0 flex-1">{getLabel(item)}</span>
          {getSub && <span className="shrink-0 text-xs text-nootr-faint">{getSub(item)}</span>}
        </button>
      ))}
    </div>
  );
}

function SubstituirForm({ token, meals }: { token: string; meals: Meal[] }) {
  const searchParams = useSearchParams();
  const acaoParam = searchParams.get("acao") as SubstitutionAction | null;
  const initialAction = acaoParam && acaoParam in ACTION_LABELS ? acaoParam : null;

  // null = tela de escolha (as 3 funções); só mostra a conversa depois que a
  // pessoa escolhe uma (por card ou por link direto com ?acao=).
  const [action, setAction] = useState<SubstitutionAction | null>(initialAction);
  const [mealId, setMealId] = useState<string>("");
  const [missingFoodName, setMissingFoodName] = useState("");
  const [foods, setFoods] = useState<AddedFood[]>([]);
  // ate_different / will_eat_different: nomes dos alimentos planejados da
  // refeição que a pessoa sinalizou que NÃO comeu (esquema de troca), tudo
  // que não estiver aqui continua exatamente como estava planejado.
  const [skippedNames, setSkippedNames] = useState<string[]>([]);
  // Depois de marcar o que não comeu (ou escolher o alimento em falta), a
  // pergunta seguinte (o que entra no lugar) só aparece depois de confirmar.
  const [foodStepConfirmed, setFoodStepConfirmed] = useState(false);
  // will_eat_different: refeições que a pessoa já comeu hoje, não dá pra
  // inferir só pelo horário planejado, então perguntamos. Ficam de fora do
  // reajuste, mesmo que venham depois da refeição trocada na lista.
  const [alreadyEatenIds, setAlreadyEatenIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubstitutionResult | null>(null);
  const [error, setError] = useState("");
  // Desfazer o último ajuste (ver POST /nootr/substitutions/undo). `undone`
  // troca o botão pela confirmação, sem apagar o resultado da tela: a pessoa
  // ainda quer ver o que tinha sido feito antes de desfazer.
  const [undoing, setUndoing] = useState(false);
  const [undone, setUndone] = useState(false);

  // "Estou em falta": opções da despensa (mesmo perfil), sugestões da IA e
  // atalho pra cadastrar um alimento novo na despensa na hora.
  const [pantryMatches, setPantryMatches] = useState<PantryMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [alternatives, setAlternatives] = useState<PantryMatch[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [alternativesFetched, setAlternativesFetched] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [preferences, setPreferences] = useState<Preferences | null>(null);

  const selectedMeal = useMemo(() => meals.find((m) => m.id === mealId) ?? null, [meals, mealId]);

  const swapSummary = useMemo(() => {
    if (action === "missing_food") return "";
    const skippedLabel = joinNames(skippedNames);
    const eatenLabel = joinNames(foods.map((f) => f.name));
    const verb = action === "will_eat_different" ? "não vai comer" : "não comeu";
    const verbEat = action === "will_eat_different" ? "vai comer" : "comeu";
    if (skippedLabel && eatenLabel) return `Você ${verb} ${skippedLabel} e ${verbEat} ${eatenLabel} no lugar.`;
    if (skippedLabel) return `Você ${verb} ${skippedLabel}.`;
    if (eatenLabel) return `Você ${verbEat} ${eatenLabel} a mais.`;
    return "";
  }, [action, skippedNames, foods]);

  useEffect(() => {
    // Preferências aqui são só contexto opcional (despensa/alergias pra
    // enriquecer as sugestões): se falhar, o fluxo continua inteiro sem elas,
    // então não vale interromper a pessoa com um erro.
    nootrApi.getPreferences(token).then(setPreferences).catch(() => {});
  }, [token]);

  // Chute inicial de quais refeições já rolaram hoje (pelo horário planejado
  // vs agora), a pessoa pode corrigir marcando/desmarcando.
  useEffect(() => {
    if (action !== "will_eat_different") return;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const toMinutes = (time: string) => {
      const [h, m] = time.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    setAlreadyEatenIds(
      meals.filter((m) => m.id !== mealId && toMinutes(m.time) <= nowMinutes).map((m) => m.id)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, mealId]);

  useEffect(() => {
    setPantryMatches([]);
    setAlternatives([]);
    setAlternativesFetched(false);
    setShowAddNew(false);
    if (action !== "missing_food" || !missingFoodName) return;
    let active = true;
    setLoadingMatches(true);
    // Calorias REAIS do alimento que falta, na quantidade que está de fato
    // na refeição (ver missingFoodOptions): sem isso o backend não tinha
    // porção pra ancorar e chutava um padrão genérico bem maior.
    const missingFoodKcal = selectedMeal?.foods.find((f) => f.name === missingFoodName)?.calories;
    nootrApi
      .missingFoodOptions(token, missingFoodName, missingFoodKcal)
      .then((data) => active && setPantryMatches(data.pantry_matches))
      .catch((err) => {
        // Sem isso a lista só ficava vazia e a pessoa não sabia se era falha
        // ou se realmente não havia nada na despensa que servisse.
        if (active) setError(err instanceof Error ? err.message : "Não consegui buscar opções da sua despensa.");
      })
      .finally(() => active && setLoadingMatches(false));
    return () => {
      active = false;
    };
  }, [action, missingFoodName, token, selectedMeal]);

  function addMatch(m: PantryMatch) {
    setFoods((prev) => [...prev, pantryMatchToAdded(m)]);
  }

  function toggleSkipped(name: string) {
    setSkippedNames((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  function toggleAlreadyEaten(id: string) {
    setAlreadyEatenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleShowAlternatives() {
    if (alternativesFetched) return;
    setLoadingAlternatives(true);
    setError("");
    try {
      const missingFoodKcal = selectedMeal?.foods.find((f) => f.name === missingFoodName)?.calories;
      const data = await nootrApi.suggestAlternatives(token, missingFoodName, missingFoodKcal);
      setAlternatives(data.suggestions);
      setAlternativesFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não deu para buscar alternativas. Tente de novo.");
    } finally {
      setLoadingAlternatives(false);
    }
  }

  async function handleAddNewFood(f: AddedFood) {
    setFoods((prev) => [...prev, f]);
    if (preferences && !preferences.pantry.some((p) => p.toLowerCase() === f.name.toLowerCase())) {
      const updatedPantry = [...preferences.pantry, f.name];
      setPreferences({ ...preferences, pantry: updatedPantry });
      try {
        await nootrApi.updatePreferences(token, { pantry: updatedPantry });
      } catch {
        // não bloqueia o fluxo de substituição por causa disso
      }
    }
  }

  /**
   * Zera tudo que descreve UM ajuste específico. Trocar de ação ou de
   * refeição precisa limpar o rascunho inteiro, inclusive o resultado já
   * exibido: sem isso o painel continuava mostrando o "dia ajustado" da
   * substituição anterior ao lado do formulário novo, como se fosse dela.
   */
  async function handleUndo() {
    setUndoing(true);
    setError("");
    try {
      await nootrApi.undoSubstitution(token);
      setUndone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não consegui desfazer o ajuste.");
    } finally {
      setUndoing(false);
    }
  }

  function resetDraft() {
    setMissingFoodName("");
    setSkippedNames([]);
    setFoods([]);
    setFoodStepConfirmed(false);
    setResult(null);
    setUndone(false);
  }

  function switchAction(next: SubstitutionAction | null) {
    setAction(next);
    setMealId("");
    resetDraft();
    setError("");
  }

  function selectMeal(id: string) {
    setMealId(id);
    resetDraft();
  }

  async function handleSubmit() {
    setError("");
    if (!action || !mealId) return;
    if (action === "missing_food" && !missingFoodName) return;
    setLoading(true);
    try {
      const data = await nootrApi.suggestSubstitution(token, {
        action,
        meal_id: mealId || null,
        foods: foods.map(addedFoodToInput),
        skipped_food_names: action === "missing_food" ? undefined : skippedNames,
        already_eaten_meal_ids: action === "will_eat_different" ? alreadyEatenIds : undefined,
        missing_food_name: action === "missing_food" ? missingFoodName : undefined,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não deu para processar seu pedido agora. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  if (meals.length === 0) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <p className="font-display text-2xl text-nootr-cream">Sua dieta ainda está vazia</p>
        <p className="mt-2 text-sm text-nootr-muted">
          Para registrar substituições, primeiro monte sua dieta base.
        </p>
        <Link href="/dieta" className="btn-primary mt-6">
          Montar minha dieta
        </Link>
      </div>
    );
  }

  if (!action) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {ACTION_CARDS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => switchAction(c.id)}
            className="group card card-hover relative overflow-hidden text-center"
          >
            <p className="text-lg font-semibold uppercase tracking-caps text-nootr-bordo">
              {c.tag}
            </p>
            <h3 className="mt-2 text-[15px] font-semibold text-nootr-cream">{ACTION_LABELS[c.id]}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-nootr-muted">{c.desc}</p>
            <span className="mt-4 inline-block text-xs font-medium text-nootr-bordoSoft opacity-0 transition-opacity group-hover:opacity-100">
              Começar →
            </span>
          </button>
        ))}
      </div>
    );
  }

  const canSubmit =
    !!mealId &&
    (action === "missing_food"
      ? !!missingFoodName && foods.length > 0
      : foodStepConfirmed && (skippedNames.length > 0 || foods.length > 0));

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-nootr-cream">{ACTION_LABELS[action]}</p>
          <button
            type="button"
            onClick={() => switchAction(null)}
            className="text-xs text-nootr-muted transition-colors hover:text-nootr-bordoSoft"
          >
            ← escolher outra ação
          </button>
        </div>

        {/* Balão: quais refeições já rolaram hoje (só faz sentido planejando
            uma refeição futura, com outras no meio ainda por vir). */}
        {action === "will_eat_different" && meals.length > 1 && !mealId && (
          <AssistantBubble>
            <p className="text-sm leading-relaxed text-nootr-cream">Quais refeições você já fez hoje?</p>
            <p className="mt-1 text-xs text-nootr-faint">
              Usamos isso pra saber quais refeições ainda podem ser ajustadas, pode corrigir se o palpite
              estiver errado.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {meals.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleAlreadyEaten(m.id)}
                  className={`chip ${alreadyEatenIds.includes(m.id) ? "chip-active" : ""}`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </AssistantBubble>
        )}

        {/* Balão 1: qual refeição */}
        <AssistantBubble>
          <p className="text-sm leading-relaxed text-nootr-cream">{MEAL_QUESTION[action]}</p>
          {!mealId && (
            <SingleChecklist
              items={meals}
              getId={(m) => m.id}
              getLabel={(m) => m.name}
              getSub={(m) => m.time}
              onSelect={selectMeal}
            />
          )}
        </AssistantBubble>
        {selectedMeal && (
          <UserBubble>
            {selectedMeal.name}{" "}
            <button
              type="button"
              onClick={() => selectMeal("")}
              className="ml-1.5 text-xs text-nootr-cream/70 underline-offset-2 hover:underline"
            >
              trocar
            </button>
          </UserBubble>
        )}

        {/* Balão 2: qual alimento */}
        {selectedMeal && (
          <>
            <AssistantBubble>
              <p className="text-sm leading-relaxed text-nootr-cream">{FOOD_QUESTION[action]}</p>
              {!foodStepConfirmed &&
                (action === "missing_food" ? (
                  <SingleChecklist
                    items={selectedMeal.foods}
                    getId={(f) => f.name}
                    getLabel={(f) => f.name}
                    getSub={(f) => `${f.quantity}${gramsSuffix(f.quantity, f.grams)}`}
                    onSelect={(name) => {
                      setMissingFoodName(name);
                      setFoodStepConfirmed(true);
                    }}
                  />
                ) : (
                  <>
                    <p className="mt-1 text-xs text-nootr-faint">
                      Está tudo marcado como planejado, desmarque só o que não{" "}
                      {action === "will_eat_different" ? "vai comer" : "comeu"}.
                    </p>
                    <div className="mt-2.5 space-y-1.5">
                      {selectedMeal.foods.map((f) => {
                        const skipped = skippedNames.includes(f.name);
                        return (
                          <label
                            key={f.name}
                            className="flex cursor-pointer items-center gap-2.5 rounded-lg bg-nootr-wine/20 px-3 py-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={!skipped}
                              onChange={() => toggleSkipped(f.name)}
                              className="h-4 w-4 accent-nootr-bordo"
                            />
                            <span className={skipped ? "text-nootr-faint line-through" : "text-nootr-cream"}>
                              {f.name}
                            </span>
                            <span className="ml-auto shrink-0 text-xs text-nootr-faint">
                              {f.quantity}
                              {gramsSuffix(f.quantity, f.grams)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setFoodStepConfirmed(true)}
                      className="btn-secondary mt-3 w-full py-1.5 text-xs"
                    >
                      Continuar
                    </button>
                  </>
                ))}
            </AssistantBubble>
            {foodStepConfirmed && (
              <UserBubble>
                {action === "missing_food" ? (
                  <>
                    {missingFoodName}{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMissingFoodName("");
                        setFoodStepConfirmed(false);
                      }}
                      className="ml-1.5 text-xs text-nootr-cream/70 underline-offset-2 hover:underline"
                    >
                      trocar
                    </button>
                  </>
                ) : (
                  <>
                    {skippedNames.length > 0
                      ? joinNames(skippedNames)
                      : action === "will_eat_different"
                      ? "Nada, vai comer tudo como planejado"
                      : "Nada, comeu tudo como planejado"}{" "}
                    <button
                      type="button"
                      onClick={() => setFoodStepConfirmed(false)}
                      className="ml-1.5 text-xs text-nootr-cream/70 underline-offset-2 hover:underline"
                    >
                      trocar
                    </button>
                  </>
                )}
              </UserBubble>
            )}
          </>
        )}

        {/* Balão 3: o que entra no lugar */}
        {foodStepConfirmed && (
          <AssistantBubble>
            <p className="text-sm leading-relaxed text-nootr-cream">{ADDED_QUESTION[action]}</p>

            {action === "missing_food" && (
              <div className="mt-3 space-y-3">
                {loadingMatches && <p className="text-xs text-nootr-faint">Olhando sua despensa…</p>}

                {!loadingMatches && pantryMatches.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs text-nootr-muted">Da sua despensa (mesmo perfil nutricional):</p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {pantryMatches.map((m, i) => (
                        <PantryMatchCard key={`${m.taco_id ?? "c"}-${i}`} match={m} onAdd={() => addMatch(m)} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-nootr-line/40 pt-3 text-center">
                  <p className="text-xs text-nootr-muted">
                    Esses itens não estão disponíveis também ou não gostou de nenhuma opção?
                  </p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleShowAlternatives}
                      disabled={loadingAlternatives}
                      className="btn-secondary px-3 py-1.5 text-xs"
                    >
                      {loadingAlternatives ? "Pensando…" : "Buscar outros alimentos"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddNew((v) => !v)}
                      className={`chip ${showAddNew ? "chip-active" : ""}`}
                    >
                      Adicionar novo alimento
                    </button>
                  </div>
                </div>

                {alternatives.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs text-nootr-muted">Sugestões da IA:</p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {alternatives.map((m, i) => (
                        <PantryMatchCard key={`${m.taco_id ?? "c"}-${i}`} match={m} onAdd={() => addMatch(m)} />
                      ))}
                    </div>
                  </div>
                )}

                {showAddNew && (
                  <div className="rounded-xl bg-nootr-black/40 p-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
                      Adicionar à despensa
                    </p>
                    <FoodAdder token={token} onAdd={handleAddNewFood} />
                  </div>
                )}
              </div>
            )}

            {action !== "missing_food" && (
              <p className="mt-1 text-xs text-nootr-faint">
                Deixe vazio se não {action === "will_eat_different" ? "vai comer" : "comeu"} nada no lugar
                do que faltou.
              </p>
            )}

            <div className="mt-3">
              <AddedFoodList
                foods={foods}
                onRemove={(i) => setFoods((prev) => prev.filter((_, j) => j !== i))}
                onEdit={(i, f) => setFoods((prev) => prev.map((x, j) => (j === i ? f : x)))}
              />
              <div className="mt-2">
                <FoodAdder token={token} onAdd={(f) => setFoods((prev) => [...prev, f])} />
              </div>
            </div>

            {swapSummary && (
              <p className="mt-3 rounded-xl bg-nootr-wine/20 px-3.5 py-3 text-sm leading-relaxed text-nootr-cream">
                {swapSummary}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="btn-primary mt-3 w-full disabled:opacity-60"
            >
              {loading ? "Adaptando dieta…" : "Concluir e adaptar dieta do dia"}
            </button>
          </AssistantBubble>
        )}

        {error && <p className="text-sm text-nootr-bordoSoft">{error}</p>}
      </div>

      <div className="card h-fit lg:sticky lg:top-24">
        <p className="label-caps">Resultado</p>
        {!result ? (
          <p className="mt-3 text-sm text-nootr-faint">
            Responda as perguntas ao lado pra ver o ajuste do seu dia.
          </p>
        ) : (
          <div className="rise-in mt-4 space-y-5">
            {result.wildcard_added && (
              <div className="rounded-xl bg-nootr-wine/40 p-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
                  Coringa da despensa
                </p>
                <p className="text-sm leading-relaxed text-nootr-cream">
                  Também adicionamos <strong>{result.wildcard_added}</strong>, estava faltando na refeição e você
                  tem esse item em casa.
                </p>
              </div>
            )}

            {result.topup_applied && result.topup_applied.length > 0 && (
              <div className="rounded-xl bg-nootr-wine/40 p-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
                  Ajuste extra
                </p>
                <div className="space-y-1 text-sm leading-relaxed text-nootr-cream">
                  {result.topup_applied.map((change, i) => (
                    <p key={i}>
                      <strong>{change.meal_name}</strong>: adicionamos{" "}
                      <strong>{change.additions.join(", ")}</strong>.
                    </p>
                  ))}
                  <p>Só escalar as quantidades não seria suficiente pra chegar perto da meta do dia.</p>
                </div>
              </div>
            )}

            {/* Explicação da IA */}
            {result.ai_explanation ? (
              <div className="rounded-xl bg-nootr-wine/40 p-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-caps text-nootr-bordoSoft">
                  Explicação
                </p>
                <p className="text-sm leading-relaxed text-nootr-cream">{result.ai_explanation}</p>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-nootr-cream">{result.suggestion}</p>
            )}

            {/* Desfazer: o ajuste já foi gravado no plano do dia, então sem
                isso um registro errado (descreveu de um jeito, a IA entendeu
                de outro) só se corrige remontando o dia na mão. */}
            {!undone && (
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoing}
                className="w-full text-center text-xs text-nootr-faint underline-offset-4 transition-colors hover:text-nootr-bordoSoft hover:underline disabled:opacity-60"
              >
                {undoing ? "Desfazendo…" : "↺ Desfazer este ajuste"}
              </button>
            )}
            {undone && (
              <p className="rounded-lg bg-nootr-black px-3 py-2.5 text-center text-xs text-nootr-muted">
                Ajuste desfeito. Seu dia voltou como estava antes.
              </p>
            )}

            {/* Macros antes -> depois + meta */}
            <div>
              <p className="label-caps">Macros do dia</p>
              <div className="mt-2 overflow-hidden rounded-xl bg-nootr-black/30">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-nootr-line text-[11px] uppercase tracking-caps text-nootr-faint">
                      <th className="px-3 py-2 text-left font-semibold"> </th>
                      <th className="px-2 py-2 text-right font-semibold">Antes</th>
                      <th className="px-3 py-2 text-right font-semibold">Depois</th>
                    </tr>
                  </thead>
                  <tbody className="text-nootr-cream">
                    <MacroRow label="Calorias" unit="kcal" before={result.macros_before.calories} after={result.macros_after.calories} />
                    <MacroRow label="Proteína" unit="g" before={result.macros_before.protein_g} after={result.macros_after.protein_g} pctBefore={result.macros_before.protein_pct} pctAfter={result.macros_after.protein_pct} />
                    <MacroRow label="Carboidrato" unit="g" before={result.macros_before.carbs_g} after={result.macros_after.carbs_g} pctBefore={result.macros_before.carbs_pct} pctAfter={result.macros_after.carbs_pct} />
                    <MacroRow label="Gordura" unit="g" before={result.macros_before.fat_g} after={result.macros_after.fat_g} pctBefore={result.macros_before.fat_pct} pctAfter={result.macros_after.fat_pct} />
                  </tbody>
                </table>
              </div>
              <p className="mt-1.5 text-xs text-nootr-faint">% é a fração das calorias vinda de cada macro.</p>
            </div>

            {/* Todas as refeições com quantidades (a mudança principal é aqui) */}
            <div>
              <p className="label-caps">Dia ajustado, quantidades</p>
              <div className="mt-2 space-y-2">
                {result.adjusted_meals.map((meal) => {
                  const mealChanges = result.changes?.find((c) => c.meal === meal.name)?.changes ?? [];
                  const changeOf = (name: string) => mealChanges.find((c) => c.name === name);
                  const removed = mealChanges.filter((c) => c.kind === "removed");
                  return (
                    <div key={meal.id} className="rounded-lg bg-nootr-black/30 px-3.5 py-2.5">
                      <div className="flex justify-between text-sm">
                        <p className="font-medium text-nootr-cream">{meal.name}</p>
                        <p className="text-nootr-faint">{meal.time}</p>
                      </div>
                      <ul className="mt-1.5 space-y-1">
                        {meal.foods.map((f, j) => {
                          const ch = changeOf(f.name);
                          return (
                            <li key={`${f.name}-${j}`} className="flex items-baseline justify-between gap-3 text-xs">
                              <span className="min-w-0 text-nootr-cream">
                                {f.name}
                                {ch && <ChangeTag kind={ch.kind} />}
                              </span>
                              <span className="shrink-0 tabular-nums text-nootr-muted">
                                {/* Quantidade anterior riscada ao lado da nova, pra
                                    ficar claro o que o ajuste mexeu. */}
                                {ch && (ch.kind === "increased" || ch.kind === "decreased") && (
                                  <span className="mr-1.5 text-nootr-faint line-through">{ch.from}</span>
                                )}
                                {f.quantity}{gramsSuffix(f.quantity, f.grams)} · {Math.round(f.calories)} kcal
                              </span>
                            </li>
                          );
                        })}
                        {removed.map((c) => (
                          <li key={`rm-${c.name}`} className="flex items-baseline justify-between gap-3 text-xs opacity-60">
                            <span className="min-w-0 text-nootr-faint line-through">{c.name}</span>
                            <span className="shrink-0 tabular-nums text-nootr-faint">removido</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MacroRow({
  label,
  unit,
  before,
  after,
  pctBefore,
  pctAfter,
}: {
  label: string;
  unit: string;
  before: number;
  after: number;
  pctBefore?: number;
  pctAfter?: number;
}) {
  const changed = Math.round(before) !== Math.round(after);
  return (
    <tr className="border-b border-nootr-line/60 last:border-0">
      <td className="px-3 py-2 text-nootr-muted">{label}</td>
      <td className="px-2 py-2 text-right tabular-nums text-nootr-faint">
        {Math.round(before)}
        {unit}
        {pctBefore != null && <span className="ml-1 text-[10px]">({pctBefore}%)</span>}
      </td>
      <td className={`px-3 py-2 text-right tabular-nums ${changed ? "text-nootr-bordoSoft" : "text-nootr-cream"}`}>
        {Math.round(after)}
        {unit}
        {pctAfter != null && <span className="ml-1 text-[10px]">({pctAfter}%)</span>}
      </td>
    </tr>
  );
}

export function SubstitutionPanel({ token, meals }: { token: string; meals: Meal[] }) {
  return (
    <Suspense fallback={<SkeletonPage cards={2} />}>
      <SubstituirForm token={token} meals={meals} />
    </Suspense>
  );
}
