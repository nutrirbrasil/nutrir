"""
Rotas Nootr, receitas próprias do usuário.

Um "atalho" reaproveitável: quando a IA decompõe um prato composto que não é
um dos já conhecidos (ver ai.gemini._FOOD_DECOMPOSITION_RULES) nem uma
receita salva, ela pergunta os ingredientes pra pessoa confirmar (ver
routes/nootr/ai.py). Confirmado, o app oferece salvar como receita, essa
rota persiste isso. Da próxima vez que a pessoa citar o mesmo prato, a IA usa
os ingredientes salvos direto, sem perguntar de novo.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.auth import CurrentUser, CurrentUserDep
from backend.app.services import plan_limits, repository
from backend.app.services.nutrition import resolve_food

router = APIRouter(prefix="/nootr/recipes", tags=["Nootr - Receitas"])


class IngredientIn(BaseModel):
    grams: float = Field(gt=0, le=3000)
    quantity_label: str | None = Field(default=None, max_length=60)
    taco_id: int | None = None
    name: str | None = Field(default=None, max_length=120)
    kcal_100g: float | None = Field(default=None, ge=0, le=1000)
    protein_100g: float | None = Field(default=None, ge=0, le=100)
    carbs_100g: float | None = Field(default=None, ge=0, le=100)
    fat_100g: float | None = Field(default=None, ge=0, le=100)


class RecipeIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    ingredients: list[IngredientIn] = Field(min_length=1, max_length=20)


@router.get("")
def list_recipes(user: CurrentUser = CurrentUserDep):
    return {"results": repository.list_recipes(user)}


@router.get("/global")
def list_global_recipes(user: CurrentUser = CurrentUserDep):
    """Receitas aprovadas de outros usuários, ver /aprovar."""
    return {"results": repository.list_global_recipes(user)}


@router.post("")
def create_recipe(body: RecipeIn, user: CurrentUser = CurrentUserDep):
    # Basic: no máximo N receitas salvas (Pro é ilimitado).
    if not plan_limits.is_pro(repository.get_profile(user)):
        if repository.count_recipes(user) >= plan_limits.BASIC_MAX_RECIPES:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"O plano Basic permite até {plan_limits.BASIC_MAX_RECIPES} receitas. "
                    "Apague uma ou migre para o Pro para ter receitas ilimitadas."
                ),
            )

    ingredients = []
    for item in body.ingredients:
        resolved = resolve_food(item)
        if resolved is None:
            raise HTTPException(status_code=400, detail=f"Alimento TACO {item.taco_id} não existe")
        ingredients.append(resolved)
    return repository.insert_recipe(user, body.name.strip(), ingredients)


@router.delete("/{recipe_id}")
def delete_recipe(recipe_id: str, user: CurrentUser = CurrentUserDep):
    repository.delete_recipe(user, recipe_id)
    return {"ok": True}
