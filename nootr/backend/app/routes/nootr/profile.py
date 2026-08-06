"""Rotas Nootr, perfil do usuário (plano + dados corporais + cálculo calórico + macros)."""
from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.app.auth import CurrentUser, CurrentUserDep
from backend.app.services import energy, repository

router = APIRouter(prefix="/nootr/profile", tags=["Nootr - Perfil"])

_DEFAULT_PROFILE = {
    "full_name": None,
    "plan": "basic",
    # Sem cobrança real ainda (ver ProfileUpdate.billing_cycle), só guarda a
    # escolha mensal/anual pra decidir elegibilidade a benefícios (ex: desconto
    # da nutricionista, hoje exclusivo do Pro Anual, ver POST /nootr/diets/generate
    # e lib/plan.ts NUTRITIONIST_DISCOUNT).
    "billing_cycle": "mensal",
    "country": "BR",
    "sex": None,
    "age": None,
    "weight_kg": None,
    "height_cm": None,
    "activity_level": None,
    "formula": "manual",
    "target_calories": None,
    "macro_mode": "percent",
    "protein_pct": 30,
    "carbs_pct": 40,
    "fat_pct": 30,
    # Ajuste manual do g/kg (Pro, modo per_kg): None = usa o meio da faixa de
    # referência (ver energy.PROTEIN_G_PER_KG/FAT_G_PER_KG).
    "protein_g_per_kg": None,
    "fat_g_per_kg": None,
    "ai_diet_generated_at": None,
}


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    plan: str | None = Field(default=None, pattern="^(basic|pro)$")
    # Sem cobrança real ainda, só a escolha declarada (ver _DEFAULT_PROFILE).
    billing_cycle: str | None = Field(default=None, pattern="^(mensal|anual)$")
    # ISO 3166-1 alpha-2. Hoje só afeta o desempate de "variedade mais comum"
    # do matching (ver food_matcher._COMMON_DEFAULT_BR) quando for "BR", a
    # TACO é uma base só brasileira, então outros países ainda não têm um
    # equivalente próprio; o campo já fica disponível pra quando existir.
    country: str | None = Field(default=None, pattern="^[A-Z]{2}$")
    sex: str | None = Field(default=None, pattern="^(m|f)$")
    age: int | None = Field(default=None, ge=10, le=120)
    weight_kg: float | None = Field(default=None, gt=0, lt=500)
    height_cm: float | None = Field(default=None, gt=0, lt=260)
    activity_level: str | None = Field(default=None, pattern="^(sedentario|leve|moderado|intenso|atleta)$")
    formula: str | None = Field(default=None, pattern="^(manual|harris_benedict|mifflin_st_jeor)$")
    target_calories: float | None = Field(default=None, ge=0, le=10000)
    protein_pct: float | None = Field(default=None, ge=0, le=100)
    carbs_pct: float | None = Field(default=None, ge=0, le=100)
    fat_pct: float | None = Field(default=None, ge=0, le=100)
    # "percent" (padrão, único do Basic) ou "per_kg" (Pro). Governa só como as
    # metas são exibidas/editadas; a dieta que o Nootr monta usa g/kg sempre
    # (ver energy.macro_targets_for_generation).
    macro_mode: str | None = Field(default=None, pattern="^(percent|per_kg)$")
    # Ajuste manual do modo per_kg (Pro): None mantém o meio da faixa de
    # referência. Carboidrato nunca é editável direto, fecha o que sobra das
    # calorias (ver energy.macro_targets_from_weight).
    protein_g_per_kg: float | None = Field(default=None, gt=0, le=10)
    fat_g_per_kg: float | None = Field(default=None, gt=0, le=10)


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


def _with_macro_targets(profile: dict) -> dict:
    """Anexa as metas de gramas de macro (por g/kg de peso quando há peso
    cadastrado, ver energy.macro_targets_for_profile)."""
    cals = profile.get("target_calories")
    profile["macro_targets_g"] = (
        energy.macro_targets_for_profile(profile, float(cals)) if cals else None
    )
    return profile


@router.get("")
def get_profile(user: CurrentUser = CurrentUserDep):
    """
    `has_profile=False` quando o usuário nunca salvou nada (nenhuma linha na
    tabela ainda), a resposta já vem com valores default pra UI não travar,
    mas o frontend usa esse flag pra saber que a conta é nova e ainda precisa
    passar pelo onboarding (país + plano, ver app/onboarding).
    """
    existing = repository.get_profile(user)
    profile = existing or {**_DEFAULT_PROFILE, "user_id": user.id}
    return {**_with_macro_targets(dict(profile)), "has_profile": existing is not None}


@router.put("")
def update_profile(body: ProfileUpdate, user: CurrentUser = CurrentUserDep):
    current = repository.get_profile(user) or dict(_DEFAULT_PROFILE)
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    merged = {**{k: current.get(k, _DEFAULT_PROFILE.get(k)) for k in _DEFAULT_PROFILE}, **patch}
    # g/kg é recurso do Pro: no Basic a visão é sempre por percentual.
    if merged.get("plan") != "pro":
        merged["macro_mode"] = "percent"
    merged = _with_computed_calories(merged)
    saved = repository.upsert_profile(user, merged)
    return {**_with_macro_targets(dict(saved)), "has_profile": True}


@router.delete("")
def delete_account(user: CurrentUser = CurrentUserDep):
    """
    Exclui a conta inteira, sem volta: todos os dados do usuário (dieta,
    preferências, alimentos/receitas próprias, conversas do Noo, histórico de
    substituições) e o login. Ver repository.delete_own_account.
    """
    repository.delete_own_account(user)
    return {"ok": True}
