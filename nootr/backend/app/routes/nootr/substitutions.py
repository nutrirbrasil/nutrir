"""Rotas Nootr — substituições com alimentos estruturados da TACO."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.auth import CurrentUser, CurrentUserDep
from backend.app.data.taco import load_taco_foods
from backend.app.services import diet_engine, repository
from backend.app.services.nutrition import scale_food

router = APIRouter(prefix="/nootr/substitutions", tags=["Nootr - Substituições"])

ACTION_LABELS = {
    "ate_different": "Comi algo diferente",
    "will_eat_different": "Vou comer algo diferente",
    "missing_food": "Estou em falta",
}


class FoodIn(BaseModel):
    taco_id: int
    grams: float = Field(gt=0, le=3000)
    quantity_label: str | None = Field(default=None, max_length=60)


class SubstitutionRequest(BaseModel):
    action: str = Field(description="ate_different | will_eat_different | missing_food")
    meal_id: str | None = None
    foods: list[FoodIn] = Field(min_length=1, max_length=15)
    # Só para missing_food: nome (exibido) do alimento da refeição que falta.
    missing_food_name: str | None = Field(default=None, max_length=120)


def _scale_foods(foods_in: list[FoodIn]) -> list[dict]:
    taco = {f.id: f for f in load_taco_foods()}
    scaled = []
    for food_in in foods_in:
        food = taco.get(food_in.taco_id)
        if food is None:
            raise HTTPException(status_code=400, detail=f"Alimento TACO {food_in.taco_id} não existe")
        scaled.append(scale_food(food, food_in.grams, food_in.quantity_label))
    return scaled


@router.post("")
def suggest_substitution(body: SubstitutionRequest, user: CurrentUser = CurrentUserDep):
    # O plano do dia já reflete substituições anteriores de hoje: novos ajustes
    # compõem em cima dele, não sobre o template original.
    day_plan = repository.get_or_create_day_plan(user)
    if day_plan is None:
        raise HTTPException(status_code=409, detail="Monte sua dieta primeiro em /montar-dieta.")

    if body.meal_id and not any(m["id"] == body.meal_id for m in day_plan["meals"]):
        raise HTTPException(status_code=404, detail="Refeição não encontrada")

    foods = _scale_foods(body.foods)

    if body.action == "ate_different":
        result = diet_engine.log_ate_different(day_plan, foods, body.meal_id)
    elif body.action == "will_eat_different":
        result = diet_engine.log_will_eat_different(day_plan, foods, body.meal_id)
    elif body.action == "missing_food":
        if not body.meal_id or not body.missing_food_name:
            raise HTTPException(status_code=400, detail="Informe a refeição e o alimento em falta")
        try:
            result = diet_engine.log_missing_food(day_plan, body.missing_food_name, body.meal_id, foods)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
    else:
        raise HTTPException(status_code=400, detail="Ação inválida")

    description = ", ".join(f'{f["name"]} ({f["quantity"]})' for f in foods)

    # Persiste o plano ajustado do dia e registra a substituição.
    repository.update_day_plan_meals(user, day_plan["id"], result["adjusted_meals"])
    repository.insert_substitution_log(
        user,
        day_plan["id"],
        day_plan["plan_date"],
        {
            "action": body.action,
            "description": description,
            "meal_id": body.meal_id,
            "matched_food": result.get("matched_food"),
            "match_confidence": result.get("match_confidence"),
            "delta_calories": result.get("delta_calories"),
            "remaining_calories": result.get("remaining_calories"),
            "remaining_protein_g": result.get("remaining_protein_g"),
        },
    )

    return {
        "action": body.action,
        "action_label": ACTION_LABELS.get(body.action, body.action),
        "input": description,
        **result,
    }
