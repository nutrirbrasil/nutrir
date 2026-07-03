"""Rotas Nootr — dietas."""
from fastapi import APIRouter, HTTPException

from backend.app.services import store

router = APIRouter(prefix="/nootr/diets", tags=["Nootr - Dietas"])


@router.get("/today")
def get_today_diet():
    return {
        "date": store.today_iso(),
        "diet": store.SAMPLE_DIET,
    }


@router.get("/{diet_id}")
def get_diet(diet_id: str):
    if diet_id != store.SAMPLE_DIET["id"]:
        raise HTTPException(status_code=404, detail="Dieta não encontrada")
    return store.SAMPLE_DIET
