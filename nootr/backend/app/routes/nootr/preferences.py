"""
Rotas Nootr, preferências alimentares do usuário.

Guarda o contexto que a IA precisa para sugerir substituições realistas:
alergias/restrições, alimentos que não gosta, que gosta, e a "despensa",
o que a pessoa costuma ter em casa (usado no "Estou em falta" e nas
substituições sugeridas pela IA, para não propor algo fora da realidade dela).
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.auth import CurrentUser, CurrentUserDep
from backend.app.services import food_matcher, repository

router = APIRouter(prefix="/nootr/preferences", tags=["Nootr - Preferências"])

_MACRO_LABELS = {"protein": "proteína", "carb": "carboidrato", "fat": "gordura"}


def _pantry_gap_message(gap: dict[str, int]) -> str:
    missing = [f"{gap[m]} de {_MACRO_LABELS[m]}" for m in ("protein", "carb", "fat") if m in gap]
    msg = (
        f"A despensa/favoritos precisa de pelo menos {food_matcher.PANTRY_MIN_TOTAL} alimentos, "
        f"sendo {food_matcher.PANTRY_MIN_BY_MACRO['protein']} fontes de proteína, "
        f"{food_matcher.PANTRY_MIN_BY_MACRO['carb']} de carboidrato e "
        f"{food_matcher.PANTRY_MIN_BY_MACRO['fat']} de gordura."
    )
    if missing:
        msg += " Ainda falta: " + ", ".join(missing) + "."
    return msg

_DEFAULT = {
    "allergies": [], "dislikes": [], "likes": [], "pantry": [], "notes": "",
    # Quantas refeições a pessoa costuma fazer e em que horários, usado pra
    # montar o template de refeições na geração de dieta por IA (ver
    # services/meal_planning.py e POST /nootr/diets/generate). Sempre usa no
    # mínimo 4 refeições na geração, mesmo se a pessoa disser menos aqui.
    "meal_count": 4,
    "meal_times": [],
}
_MAX_ITEMS = 60


class PreferencesUpdate(BaseModel):
    allergies: list[str] | None = Field(default=None, max_length=_MAX_ITEMS)
    dislikes: list[str] | None = Field(default=None, max_length=_MAX_ITEMS)
    likes: list[str] | None = Field(default=None, max_length=_MAX_ITEMS)
    pantry: list[str] | None = Field(default=None, max_length=_MAX_ITEMS)
    notes: str | None = Field(default=None, max_length=2000)
    meal_count: int | None = Field(default=None, ge=1, le=8)
    meal_times: list[str] | None = Field(default=None, max_length=8)


@router.get("")
def get_preferences(user: CurrentUser = CurrentUserDep):
    prefs = repository.get_preferences(user)
    return prefs or {**_DEFAULT, "user_id": user.id}


@router.put("")
def update_preferences(body: PreferencesUpdate, user: CurrentUser = CurrentUserDep):
    current = repository.get_preferences(user) or dict(_DEFAULT)
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    merged = {**{k: current.get(k, _DEFAULT[k]) for k in _DEFAULT}, **patch}
    # Só valida o mínimo quando a própria despensa/favoritos está sendo
    # salva agora (onboarding, /perfil, ou o auto-adicionar de
    # SubstitutionPanel, que só CRESCE a lista, nunca dispararia isso). Uma
    # conta antiga que ainda não completou o mínimo não fica travada pra
    # salvar outra coisa sem relação (ex: meal_count), só quando ela mesma
    # está editando a despensa é que o salvar exige o mínimo cumprido.
    if "pantry" in patch or "likes" in patch:
        gap = food_matcher.pantry_gap(merged["pantry"])
        if gap:
            raise HTTPException(status_code=400, detail=_pantry_gap_message(gap))
    return repository.upsert_preferences(user, merged)
