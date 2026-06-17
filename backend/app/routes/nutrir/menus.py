"""Rotas Nutrir — cardápios."""
from fastapi import APIRouter, HTTPException

from backend.app.services import store

router = APIRouter(prefix="/nutrir/menus", tags=["Nutrir - Cardápios"])


@router.get("")
def list_menus():
    return {"menus": store.MENUS}


@router.get("/{menu_id}")
def get_menu(menu_id: str):
    for menu in store.MENUS:
        if menu["id"] == menu_id:
            return menu
    raise HTTPException(status_code=404, detail="Cardápio não encontrado")
