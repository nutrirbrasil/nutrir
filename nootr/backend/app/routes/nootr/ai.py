"""Rotas Nootr, interpretação de refeição por IA (conversa -> alimentos TACO)."""
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.auth import CurrentUser, CurrentUserDep
from backend.app.services import ai, food_matcher, repository

router = APIRouter(prefix="/nootr/ai", tags=["Nootr - IA"])

_MAX_QUESTIONS = 2  # depois disso, fecha com a melhor estimativa em vez de insistir


class ConverseTurn(BaseModel):
    role: Literal["user", "assistant"]
    text: str = Field(min_length=1, max_length=500)


class ParseMealRequest(BaseModel):
    text: str = Field(min_length=2, max_length=500)
    history: list[ConverseTurn] = Field(default_factory=list)
    # Refeição sendo ajustada, contexto pro "esquema de troca": a IA só
    # precisa entender o que MUDOU em relação a esses alimentos, nunca pede
    # pra pessoa redescrever a refeição inteira.
    meal_name: str = Field(default="", max_length=80)
    meal_foods: list[str] = Field(default_factory=list, max_length=20)


def _match_items(
    items: list[dict], preferred: set[int] = frozenset(), tie_resolver=None,
) -> tuple[list[dict], list[str]]:
    """
    Casa cada item com um alimento real: primeiro na tabela de itens comuns
    (fast-food/industrializados que a TACO não cobre), depois na TACO, e por
    último uma estimativa genérica, nunca fica "sem casar" (ver food_matcher).
    `preferred`: taco_ids da despensa/gosta do usuário, desempata a favor do
    que a pessoa já tem/gosta (ex: "banana" com "Banana, nanica" na despensa).
    `tie_resolver`: quando não há favorito e ainda assim empata, pergunta pra
    IA qual é o mais comum no país do usuário (ver ai.build_country_tie_resolver).
    """
    foods, unmatched = [], []
    for it in items:
        name = it["name"].strip()
        if not name:
            continue
        match = food_matcher.find_food(
            f"{it['quantity']} {name}".strip(), preferred=preferred, tie_resolver=tie_resolver,
        )
        grams = match.grams or 100.0  # itens de porção fixa (comum/estimativa) usam 100 como base de escala
        foods.append({
            "taco_id": match.taco_id,
            "name": match.name,
            "quantity": f"{round(match.grams)}g" if match.grams else "1 porção",
            "calories": match.calories,
            "protein_g": match.protein_g,
            "carbs_g": match.carbs_g,
            "fat_g": match.fat_g,
            "grams": grams,
            "match_confidence": match.confidence,
        })
    return foods, unmatched


@router.post("/parse-meal")
def parse_meal(body: ParseMealRequest, user: CurrentUser = CurrentUserDep):
    """
    Turno de uma conversa pra registrar um desvio de `meal_name`: a pessoa diz
    só o que mudou (ex: "não comi o pão, comi um pedaço de bolo no lugar") e a
    IA devolve quais alimentos de `meal_foods` saem (`skipped_names`) e o que
    entra no lugar (`new_items`, pode ficar vazio = nada no lugar), o resto
    da refeição é presumido igual, sem precisar redescrever tudo. A IA pode
    devolver uma pergunta de esclarecimento em vez de fechar direto (ex:
    quantidade ambígua, ou se "o resto continuou igual" quando a frase for
    genuinamente ambígua). O frontend acumula `history` e reenvia a cada
    resposta do usuário.
    """
    history = [t.model_dump() for t in body.history] + [{"role": "user", "text": body.text}]
    assistant_questions = sum(1 for t in history if t["role"] == "assistant")
    preferences = repository.get_preferences(user) or {}
    preferred_ids = food_matcher.preferred_taco_ids([*preferences.get("likes", []), *preferences.get("pantry", [])])
    profile = repository.get_profile(user)
    tie_resolver = ai.build_country_tie_resolver((profile or {}).get("country") or "BR")
    # Receitas próprias + aprovadas de outros usuários (ver /aprovar), a IA
    # reconhece qualquer prato já confirmado pela comunidade, não só os do
    # próprio usuário. Dedupe por nome (case-insensitive): a própria sempre
    # vence se a pessoa já tiver uma receita homônima.
    own_recipes = repository.list_recipes(user)
    own_names = {r["name"].strip().lower() for r in own_recipes}
    recipes = own_recipes + [
        r for r in repository.list_global_recipes(user) if r["name"].strip().lower() not in own_names
    ]

    try:
        result = ai.converse_meal(
            history, body.meal_name, body.meal_foods, preferences,
            force_finalize=assistant_questions >= _MAX_QUESTIONS, recipes=recipes,
        )
    except ai.AIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if result["needs_question"] and result["question"]:
        new_history = history + [{"role": "assistant", "text": result["question"]}]
        return {
            "status": "question",
            "question": result["question"],
            "question_kind": result["question_kind"],
            "proposed_dish_name": result["proposed_dish_name"],
            "proposed_ingredients": result["proposed_ingredients"],
            "history": new_history,
        }

    new_foods, unmatched = _match_items(result["new_items"], preferred_ids, tie_resolver)
    return {
        "status": "done",
        "skipped_names": result["skipped_names"],
        "foods": new_foods,
        "unmatched": unmatched,
        "history": history,
        # Preenchido só quando um prato composto novo (fora da lista já \
        # conhecida e sem receita salva) foi decomposto e confirmado agora \
        #, o frontend usa pra oferecer "salvar como receita".
        "proposed_dish_name": result["proposed_dish_name"],
    }
