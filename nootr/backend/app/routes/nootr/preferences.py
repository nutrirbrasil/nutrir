"""
Rotas Nootr, preferências alimentares do usuário.

Guarda o contexto que a IA precisa para sugerir substituições realistas:
alergias/restrições, alimentos que não gosta, que gosta, e a "despensa",
o que a pessoa costuma ter em casa (usado no "Estou em falta" e nas
substituições sugeridas pela IA, para não propor algo fora da realidade dela).
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.app.auth import CurrentUser, CurrentUserDep
from backend.app.services import repository

router = APIRouter(prefix="/nootr/preferences", tags=["Nootr - Preferências"])

_DEFAULT = {"allergies": [], "dislikes": [], "likes": [], "pantry": [], "notes": ""}
_MAX_ITEMS = 60


class PreferencesUpdate(BaseModel):
    allergies: list[str] | None = Field(default=None, max_length=_MAX_ITEMS)
    dislikes: list[str] | None = Field(default=None, max_length=_MAX_ITEMS)
    likes: list[str] | None = Field(default=None, max_length=_MAX_ITEMS)
    pantry: list[str] | None = Field(default=None, max_length=_MAX_ITEMS)
    notes: str | None = Field(default=None, max_length=2000)


@router.get("")
def get_preferences(user: CurrentUser = CurrentUserDep):
    prefs = repository.get_preferences(user)
    return prefs or {**_DEFAULT, "user_id": user.id}


@router.put("")
def update_preferences(body: PreferencesUpdate, user: CurrentUser = CurrentUserDep):
    current = repository.get_preferences(user) or dict(_DEFAULT)
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    merged = {**{k: current.get(k, _DEFAULT[k]) for k in _DEFAULT}, **patch}
    return repository.upsert_preferences(user, merged)
