"""
Rotas Nootr, fila de aprovação global (só o admin acessa).

Receitas e alimentos customizados nascem "pending" (ver repository.insert_recipe
/insert_custom_food) e ficam invisíveis pra outros usuários até serem
aprovados aqui. Acesso restrito por email fixo (CurrentUser já carrega
`.email` do GoTrue), a policy RLS "*_admin_all" no Supabase é quem de fato
garante o isolamento cross-user no banco; esta checagem no backend só evita
expor a UI/rota pra quem não é admin (ver services/repository.py, seção admin).
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.app.auth import CurrentUser, CurrentUserDep
from backend.app.config import get_settings
from backend.app.routes.nootr.diets import MealIn, _build_meals
from backend.app.services import repository

router = APIRouter(prefix="/nootr/admin", tags=["Nootr - Admin"])


def _require_admin(user: CurrentUser = CurrentUserDep) -> CurrentUser:
    if user.email != get_settings().admin_email:
        raise HTTPException(status_code=403, detail="Acesso restrito ao admin.")
    return user


AdminUserDep = Depends(_require_admin)


@router.get("/recipes/pending")
def list_pending_recipes(admin: CurrentUser = AdminUserDep):
    return {"results": repository.admin_list_pending_recipes(admin)}


@router.post("/recipes/{recipe_id}/approve")
def approve_recipe(recipe_id: str, admin: CurrentUser = AdminUserDep):
    return repository.admin_update_recipe_status(admin, recipe_id, "approved")


@router.post("/recipes/{recipe_id}/reject")
def reject_recipe(recipe_id: str, admin: CurrentUser = AdminUserDep):
    return repository.admin_update_recipe_status(admin, recipe_id, "rejected")


@router.get("/custom-foods/pending")
def list_pending_custom_foods(admin: CurrentUser = AdminUserDep):
    return {"results": repository.admin_list_pending_custom_foods(admin)}


@router.post("/custom-foods/{food_id}/approve")
def approve_custom_food(food_id: str, admin: CurrentUser = AdminUserDep):
    return repository.admin_update_custom_food_status(admin, food_id, "approved")


@router.post("/custom-foods/{food_id}/reject")
def reject_custom_food(food_id: str, admin: CurrentUser = AdminUserDep):
    return repository.admin_update_custom_food_status(admin, food_id, "rejected")


class AdminDietMealsIn(BaseModel):
    meals: list[MealIn] = Field(min_length=1, max_length=10)


@router.get("/diets/pending")
def list_pending_diets(admin: CurrentUser = AdminUserDep):
    """Dietas geradas por IA (ver POST /nootr/diets/generate) aguardando revisão."""
    return {"results": repository.admin_list_pending_diets(admin)}


@router.put("/diets/{diet_id}")
def update_pending_diet(diet_id: str, body: AdminDietMealsIn, admin: CurrentUser = AdminUserDep):
    """Edita os alimentos/quantidades antes de aprovar, reaproveita o mesmo
    schema/lógica de montagem de refeições do resto do app (`MealIn`/`_build_meals`)."""
    meals, totals = _build_meals(body.meals)
    return repository.admin_update_diet_meals(admin, diet_id, meals, totals)


@router.post("/diets/{diet_id}/approve")
def approve_diet(diet_id: str, admin: CurrentUser = AdminUserDep):
    return repository.admin_approve_diet(admin, diet_id)


@router.post("/diets/{diet_id}/reject")
def reject_diet(diet_id: str, admin: CurrentUser = AdminUserDep):
    repository.admin_reject_diet(admin, diet_id)
    return {"ok": True}
