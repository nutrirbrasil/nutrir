"""
Rotas Nootr — dietas montadas pelo usuário.

A dieta nasce vazia: o usuário monta as refeições escolhendo alimentos da TACO
com quantidades. Basic salva 1 dieta base (vale todos os dias); Pro salva até 7,
uma por dia da semana (0=segunda..6=domingo), com fallback na base.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.auth import CurrentUser, CurrentUserDep
from backend.app.data.taco import load_taco_foods
from backend.app.services import repository
from backend.app.services.nutrition import scale_food

router = APIRouter(prefix="/nootr/diets", tags=["Nootr - Dietas"])

WEEKDAY_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]


class FoodIn(BaseModel):
    taco_id: int
    grams: float = Field(gt=0, le=3000)
    quantity_label: str | None = Field(default=None, max_length=60)


class MealIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    time: str = Field(pattern=r"^\d{2}:\d{2}$")
    foods: list[FoodIn] = Field(min_length=1)


class DietIn(BaseModel):
    name: str = Field(default="Minha dieta", min_length=1, max_length=80)
    weekday: int | None = Field(default=None, ge=0, le=6)
    target_calories: float | None = Field(default=None, gt=0, le=10000)
    meals: list[MealIn] = Field(min_length=1, max_length=10)


def _build_meals(meals_in: list[MealIn]) -> tuple[list[dict], dict]:
    """Materializa as refeições com macros reais da TACO; devolve (meals, totais)."""
    taco = {f.id: f for f in load_taco_foods()}
    totals = {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0}
    meals: list[dict] = []
    for i, meal_in in enumerate(sorted(meals_in, key=lambda m: m.time), start=1):
        foods = []
        for food_in in meal_in.foods:
            taco_food = taco.get(food_in.taco_id)
            if taco_food is None:
                raise HTTPException(status_code=400, detail=f"Alimento TACO {food_in.taco_id} não existe")
            scaled = scale_food(taco_food, food_in.grams, food_in.quantity_label)
            foods.append(scaled)
            totals["calories"] += scaled["calories"]
            totals["protein_g"] += scaled["protein_g"]
            totals["carbs_g"] += scaled["carbs_g"]
            totals["fat_g"] += scaled["fat_g"]
        meals.append({"id": f"meal-{i}", "name": meal_in.name, "time": meal_in.time, "foods": foods})
    return meals, totals


def _as_diet(day_plan: dict, user: CurrentUser) -> dict:
    return {
        "id": day_plan["id"],
        "user_id": user.id,
        "name": day_plan["name"],
        "daily_calories": day_plan["daily_calories"],
        "daily_protein_g": day_plan["daily_protein_g"],
        "daily_carbs_g": day_plan["daily_carbs_g"],
        "daily_fat_g": day_plan["daily_fat_g"],
        "meals": day_plan["meals"],
    }


@router.get("/today")
def get_today_diet(user: CurrentUser = CurrentUserDep):
    day_plan = repository.get_or_create_day_plan(user)
    if day_plan is None:
        # Usuário ainda não montou nenhuma dieta: estado vazio, não é erro.
        return {"date": repository.today_iso(), "diet": None, "needs_setup": True}
    return {"date": day_plan["plan_date"], "diet": _as_diet(day_plan, user), "needs_setup": False}


@router.get("")
def list_diets(user: CurrentUser = CurrentUserDep):
    diets = repository.list_diets(user)
    profile = repository.get_profile(user)
    return {
        "plan": (profile or {}).get("plan", "basic"),
        "diets": diets,
        "weekday_labels": WEEKDAY_LABELS,
    }


@router.post("")
def save_diet(body: DietIn, user: CurrentUser = CurrentUserDep):
    profile = repository.get_profile(user)
    plan = (profile or {}).get("plan", "basic")

    if body.weekday is not None and plan != "pro":
        raise HTTPException(
            status_code=403,
            detail="Dietas por dia da semana são do plano Pro. No Basic você tem 1 dieta base.",
        )

    meals, totals = _build_meals(body.meals)
    payload = {
        "name": body.name,
        "daily_calories": body.target_calories or round(totals["calories"]),
        "daily_protein_g": round(totals["protein_g"]),
        "daily_carbs_g": round(totals["carbs_g"]),
        "daily_fat_g": round(totals["fat_g"]),
        "meals": meals,
        "is_active": True,
    }
    diet = repository.save_diet(user, body.weekday, payload)

    # Se a dieta editada é a que vale para hoje, descarta o plano do dia já
    # materializado para que /today reflita a edição.
    applies_today = body.weekday is None or body.weekday == repository.today_weekday()
    if applies_today:
        repository.delete_day_plan(user, repository.today_iso())

    return diet


@router.delete("/{diet_id}")
def delete_diet(diet_id: str, user: CurrentUser = CurrentUserDep):
    repository.delete_diet(user, diet_id)
    return {"ok": True}
