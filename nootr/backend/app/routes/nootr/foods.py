"""Rotas Nootr — busca de alimentos na tabela TACO (autocomplete/seleção manual)."""
from fastapi import APIRouter, Query

from backend.app.auth import CurrentUser, CurrentUserDep
from backend.app.services import food_matcher

router = APIRouter(prefix="/nootr/foods", tags=["Nootr - Alimentos"])


@router.get("/search")
def search_foods(
    q: str = Query(min_length=2, max_length=80),
    limit: int = Query(default=8, ge=1, le=25),
    _user: CurrentUser = CurrentUserDep,
):
    """Busca alimentos na TACO por texto. Valores por 100g."""
    results = food_matcher.search_taco(q, limit=limit)
    return {
        "results": [
            {
                "taco_id": f.id,
                "name": f.display_name,
                "full_name": f.name,
                "category": f.category,
                "kcal": f.kcal,
                "protein_g": f.protein_g,
                "carbs_g": f.carbs_g,
                "fat_g": f.fat_g,
            }
            for f in results
        ]
    }
