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
from backend.app.routes.nootr.diets import MealIn, _build_meals, _generate_diet_meals
from backend.app.services import energy, repository

router = APIRouter(prefix="/nootr/admin", tags=["Nootr - Admin"])


def _require_admin(user: CurrentUser = CurrentUserDep) -> CurrentUser:
    if user.email != get_settings().admin_email:
        raise HTTPException(status_code=403, detail="Acesso restrito ao admin.")
    return user


AdminUserDep = Depends(_require_admin)


def _with_emails(admin: CurrentUser, rows: list[dict]) -> list[dict]:
    """Anexa `user_email` (ver repository.admin_emails_for) pra exibir na fila
    de aprovação em vez do user_id cru."""
    emails = repository.admin_emails_for(admin, [r["user_id"] for r in rows])
    return [{**r, "user_email": emails.get(r["user_id"])} for r in rows]


@router.get("/recipes/pending")
def list_pending_recipes(admin: CurrentUser = AdminUserDep):
    return {"results": _with_emails(admin, repository.admin_list_pending_recipes(admin))}


@router.post("/recipes/{recipe_id}/approve")
def approve_recipe(recipe_id: str, admin: CurrentUser = AdminUserDep):
    return repository.admin_update_recipe_status(admin, recipe_id, "approved")


@router.post("/recipes/{recipe_id}/reject")
def reject_recipe(recipe_id: str, admin: CurrentUser = AdminUserDep):
    return repository.admin_update_recipe_status(admin, recipe_id, "rejected")


@router.get("/custom-foods/pending")
def list_pending_custom_foods(admin: CurrentUser = AdminUserDep):
    return {"results": _with_emails(admin, repository.admin_list_pending_custom_foods(admin))}


@router.post("/custom-foods/{food_id}/approve")
def approve_custom_food(food_id: str, admin: CurrentUser = AdminUserDep):
    return repository.admin_update_custom_food_status(admin, food_id, "approved")


@router.post("/custom-foods/{food_id}/reject")
def reject_custom_food(food_id: str, admin: CurrentUser = AdminUserDep):
    return repository.admin_update_custom_food_status(admin, food_id, "rejected")


class AdminDietMealsIn(BaseModel):
    meals: list[MealIn] = Field(min_length=1, max_length=10)


def _with_user_context(admin: CurrentUser, rows: list[dict]) -> list[dict]:
    """
    Anexa a cada dieta pendente o contexto do paciente que o nutricionista
    precisa pra julgar se a dieta está adequada sem sair da tela: dados
    corporais (peso, altura, idade, sexo, país), a meta calórica e as metas de
    macro com que a dieta foi montada (por g/kg, ver
    energy.macro_targets_for_generation, incluindo os limites da faixa). Perfil de outro usuário só é legível pelo
    admin (policy profiles_admin_select, ver repository.admin_get_profile).
    """
    out = []
    for row in rows:
        profile = repository.admin_get_profile(admin, row["user_id"]) or {}
        calories = profile.get("target_calories")
        out.append({
            **row,
            "user_context": {
                "sex": profile.get("sex"),
                "age": profile.get("age"),
                "weight_kg": profile.get("weight_kg"),
                "height_cm": profile.get("height_cm"),
                "activity_level": profile.get("activity_level"),
                "country": profile.get("country"),
                "formula": profile.get("formula"),
                "target_calories": calories,
                "macro_targets": (
                    # As mesmas metas com que o Nootr montou a dieta (g/kg),
                    # não a visão que o usuário escolheu pro próprio perfil.
                    energy.macro_targets_for_generation(profile, float(calories)) if calories else None
                ),
            },
        })
    return out


@router.get("/diets/pending")
def list_pending_diets(admin: CurrentUser = AdminUserDep):
    """Dietas geradas por IA (ver POST /nootr/diets/generate) aguardando revisão."""
    rows = _with_emails(admin, repository.admin_list_pending_diets(admin))
    return {"results": _with_user_context(admin, rows)}


@router.put("/diets/{diet_id}")
def update_pending_diet(diet_id: str, body: AdminDietMealsIn, admin: CurrentUser = AdminUserDep):
    """Edita os alimentos/quantidades antes de aprovar, reaproveita o mesmo
    schema/lógica de montagem de refeições do resto do app (`MealIn`/`_build_meals`)."""
    meals, totals = _build_meals(body.meals)
    return repository.admin_update_diet_meals(admin, diet_id, meals, totals)


@router.post("/diets/{diet_id}/regenerate")
def regenerate_pending_diet(diet_id: str, admin: CurrentUser = AdminUserDep):
    """
    Refaz do zero a dieta pendente (mesmo diet_id, mesmo usuário), chamando o
    mesmo gerador de `POST /nootr/diets/generate` (ver _generate_diet_meals em
    diets.py). Existe pra fase de teste: quando um bug no gerador é corrigido
    no código, a dieta já gerada pra um paciente fica desatualizada, e refazer
    evita o nutricionista ter que consertar manualmente algo que a próxima
    geração já resolveria sozinha. Não conta contra o limite de 1 geração do
    usuário (profiles.ai_diet_generated_at já foi marcado na primeira vez).
    """
    diet = repository.admin_get_diet(admin, diet_id)
    if diet is None or diet.get("status") != "pending_review":
        raise HTTPException(status_code=404, detail="Dieta pendente não encontrada.")
    profile = repository.admin_get_profile(admin, diet["user_id"])
    if profile is None:
        raise HTTPException(status_code=404, detail="Perfil do usuário não encontrado.")
    prefs = repository.admin_get_preferences(admin, diet["user_id"]) or {}
    country = profile.get("country") or "BR"
    meals, totals = _generate_diet_meals(profile, prefs, country)
    return repository.admin_update_diet_meals(admin, diet_id, meals, totals)


@router.post("/diets/{diet_id}/approve")
def approve_diet(diet_id: str, admin: CurrentUser = AdminUserDep):
    approved = repository.admin_approve_diet(admin, diet_id)
    if approved is None:
        raise HTTPException(status_code=404, detail="Dieta não encontrada.")
    return approved


@router.post("/diets/{diet_id}/reject")
def reject_diet(diet_id: str, admin: CurrentUser = AdminUserDep):
    repository.admin_reject_diet(admin, diet_id)
    return {"ok": True}
