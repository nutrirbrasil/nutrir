"""Rotas Nootr — substituições (MVP com lógica placeholder)."""
from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.app.services import store

router = APIRouter(prefix="/nootr/substitutions", tags=["Nootr - Substituições"])


class SubstitutionRequest(BaseModel):
    action: str = Field(description="ate_different | will_eat_different | missing_food")
    description: str = Field(min_length=2, max_length=500)
    meal_id: str | None = None
    available_foods: list[str] | None = None


@router.post("")
def suggest_substitution(body: SubstitutionRequest):
    """
    MVP: retorna sugestão estruturada.
    Próxima fase: motor de macros + banco validado pela nutricionista.
    """
    diet = store.SAMPLE_DIET
    action_labels = {
        "ate_different": "Comi algo diferente",
        "will_eat_different": "Vou comer algo diferente",
        "missing_food": "Estou em falta",
    }

    return {
        "action": body.action,
        "action_label": action_labels.get(body.action, body.action),
        "input": body.description,
        "adjusted_meals": diet["meals"],
        "suggestion": (
            f"Registramos: «{body.description}». "
            "As refeições restantes do dia foram ajustadas para manter o alvo calórico. "
            "(Lógica completa em desenvolvimento)"
        ),
        "remaining_calories": diet["daily_calories"] - 600,
        "remaining_protein_g": diet["daily_protein_g"] - 40,
    }
