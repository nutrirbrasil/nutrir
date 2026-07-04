"""Rotas Nootr — perfil do usuário (plano + dados corporais + cálculo calórico)."""
from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.app.auth import CurrentUser, CurrentUserDep
from backend.app.services import energy, repository

router = APIRouter(prefix="/nootr/profile", tags=["Nootr - Perfil"])

_DEFAULT_PROFILE = {
    "plan": "basic",
    "sex": None,
    "age": None,
    "weight_kg": None,
    "height_cm": None,
    "activity_level": None,
    "formula": "manual",
    "target_calories": None,
}


class ProfileUpdate(BaseModel):
    plan: str | None = Field(default=None, pattern="^(basic|pro)$")
    sex: str | None = Field(default=None, pattern="^(m|f)$")
    age: int | None = Field(default=None, ge=10, le=120)
    weight_kg: float | None = Field(default=None, gt=0, lt=500)
    height_cm: float | None = Field(default=None, gt=0, lt=260)
    activity_level: str | None = Field(default=None, pattern="^(sedentario|leve|moderado|intenso|atleta)$")
    formula: str | None = Field(default=None, pattern="^(manual|harris_benedict|mifflin_st_jeor)$")
    target_calories: float | None = Field(default=None, ge=0, le=10000)


def _with_computed_calories(profile: dict) -> dict:
    """Se a fórmula não é manual e os dados estão completos, calcula o alvo."""
    formula = profile.get("formula") or "manual"
    if formula != "manual":
        required = (profile.get("sex"), profile.get("weight_kg"), profile.get("height_cm"),
                    profile.get("age"), profile.get("activity_level"))
        if all(v is not None for v in required):
            computed = energy.daily_calories(
                formula, profile["sex"], float(profile["weight_kg"]),
                float(profile["height_cm"]), int(profile["age"]), profile["activity_level"],
            )
            if computed is not None:
                profile["target_calories"] = computed
    return profile


@router.get("")
def get_profile(user: CurrentUser = CurrentUserDep):
    profile = repository.get_profile(user)
    return profile or {**_DEFAULT_PROFILE, "user_id": user.id}


@router.put("")
def update_profile(body: ProfileUpdate, user: CurrentUser = CurrentUserDep):
    current = repository.get_profile(user) or dict(_DEFAULT_PROFILE)
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    merged = {**{k: current.get(k) for k in _DEFAULT_PROFILE}, **patch}
    merged = _with_computed_calories(merged)
    return repository.upsert_profile(user, merged)
