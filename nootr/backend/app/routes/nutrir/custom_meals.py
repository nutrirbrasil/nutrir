"""Rotas Nutrir — monte sua marmita."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.services import store

router = APIRouter(prefix="/nutrir/custom-meals", tags=["Nutrir - Marmita Custom"])


class CustomMealRequest(BaseModel):
    ingredient_ids: list[str] = Field(min_length=1, max_length=8)


@router.get("/ingredients")
def list_ingredients():
    return {"ingredients": store.INGREDIENTS}


@router.post("/build")
def build_custom_meal(body: CustomMealRequest):
    selected = []
    for ing_id in body.ingredient_ids:
        found = next((i for i in store.INGREDIENTS if i["id"] == ing_id), None)
        if not found:
            raise HTTPException(status_code=404, detail=f"Ingrediente {ing_id} não encontrado")
        selected.append(found)

    total = {
        "calories": sum(i["calories"] for i in selected),
        "protein_g": sum(i["protein_g"] for i in selected),
        "carbs_g": sum(i["carbs_g"] for i in selected),
        "fat_g": sum(i["fat_g"] for i in selected),
        "price_cents": sum(i["price_cents"] for i in selected) + 500,  # taxa base montagem
    }

    return {
        "custom_meal": {
            "id": f"custom-{len(body.ingredient_ids)}",
            "ingredients": selected,
            **total,
        }
    }
