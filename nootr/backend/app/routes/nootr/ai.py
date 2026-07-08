"""Rotas Nootr — interpretação de refeição por IA (conversa -> alimentos TACO)."""
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


def _match_items(items: list[dict]) -> tuple[list[dict], list[str]]:
    """
    Casa cada item com um alimento real: primeiro na tabela de itens comuns
    (fast-food/industrializados que a TACO não cobre), depois na TACO, e por
    último uma estimativa genérica — nunca fica "sem casar" (ver food_matcher).
    """
    foods, unmatched = [], []
    for it in items:
        name = it["name"].strip()
        if not name:
            continue
        match = food_matcher.find_food(f"{it['quantity']} {name}".strip())
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
    Turno de uma conversa: a IA pode devolver uma pergunta de esclarecimento
    (ex: "quantas fatias?", "é caseiro, de marca ou de lanchonete local?") em
    vez de fechar a lista de alimentos direto. O frontend acumula `history` e
    reenvia a cada resposta do usuário.
    """
    history = [t.model_dump() for t in body.history] + [{"role": "user", "text": body.text}]
    assistant_questions = sum(1 for t in history if t["role"] == "assistant")
    preferences = repository.get_preferences(user) or {}

    if assistant_questions >= _MAX_QUESTIONS:
        # Já perguntamos o suficiente: fecha com a melhor estimativa a partir
        # de tudo que o usuário disse, em vez de insistir indefinidamente.
        combined = " ".join(t["text"] for t in history if t["role"] == "user")
        try:
            items = ai.parse_meal(combined)
        except ai.AIError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
        foods, unmatched = _match_items(items)
        return {"status": "done", "foods": foods, "unmatched": unmatched, "history": history}

    try:
        result = ai.converse_meal(history, preferences)
    except ai.AIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if result["needs_question"] and result["question"]:
        new_history = history + [{"role": "assistant", "text": result["question"]}]
        return {"status": "question", "question": result["question"], "history": new_history}

    foods, unmatched = _match_items(result["items"])
    return {"status": "done", "foods": foods, "unmatched": unmatched, "history": history}
