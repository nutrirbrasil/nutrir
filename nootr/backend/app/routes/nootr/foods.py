"""Rotas Nootr, busca de alimentos (TACO + itens próprios do usuário) e código de barras (Open Food Facts)."""
import httpx
from fastapi import APIRouter, HTTPException, Path, Query
from pydantic import BaseModel, Field

from backend.app.auth import CurrentUser, CurrentUserDep
from backend.app.services import food_matcher, repository

router = APIRouter(prefix="/nootr/foods", tags=["Nootr - Alimentos"])

_OFF_URL = "https://world.openfoodfacts.org/api/v2/product/{code}.json"


@router.get("/search")
def search_foods(
    q: str = Query(min_length=2, max_length=80),
    limit: int = Query(default=8, ge=1, le=25),
    user: CurrentUser = CurrentUserDep,
):
    """
    Busca alimentos na TACO + itens próprios do usuário (cadastrados à mão via
    "Adicionar novo alimento"). Valores por 100g.
    """
    taco_results = food_matcher.search_taco(q, limit=limit)
    custom_results = repository.search_custom_foods(user, q, limit=limit)
    # Alimentos aprovados de OUTROS usuários (ver /aprovar), dedupe por id
    # com os próprios, que já vêm em custom_results independente do status.
    own_ids = {c["id"] for c in custom_results}
    custom_results += [
        c for c in repository.search_global_custom_foods(user, q, limit=limit)
        if c["id"] not in own_ids
    ]
    return {
        "results": [
            {
                "taco_id": f.id,
                "custom_id": None,
                "name": f.display_name,
                "full_name": f.name,
                "category": f.category,
                "kcal": f.kcal,
                "protein_g": f.protein_g,
                "carbs_g": f.carbs_g,
                "fat_g": f.fat_g,
                "pending_approval": False,
            }
            for f in taco_results
        ] + [
            {
                "taco_id": None,
                "custom_id": c["id"],
                "name": c["name"],
                "full_name": c["name"],
                "category": "Meus alimentos",
                "kcal": c["kcal_100g"],
                "protein_g": c["protein_100g"],
                "carbs_g": c["carbs_100g"],
                "fat_g": c["fat_100g"],
                "pending_approval": c["status"] == "pending",
            }
            for c in custom_results
        ][:limit]
    }


class CustomFoodIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    kcal_100g: float = Field(ge=0, le=900)
    protein_100g: float = Field(ge=0, le=100)
    carbs_100g: float = Field(ge=0, le=100)
    fat_100g: float = Field(ge=0, le=100)
    fiber_100g: float | None = Field(default=None, ge=0, le=100)
    sodium_100mg: float | None = Field(default=None, ge=0, le=30000)


@router.get("/custom")
def list_custom_foods(user: CurrentUser = CurrentUserDep):
    """Alimentos que o próprio usuário cadastrou à mão (permanentes na conta dele)."""
    return {"results": repository.list_custom_foods(user)}


@router.post("/custom")
def create_custom_food(body: CustomFoodIn, user: CurrentUser = CurrentUserDep):
    """
    Cadastra um alimento novo, permanente na conta do usuário e já disponível
    pra busca. Nasce "pending", entra na base TACO geral só após revisão
    manual (mesmo processo curado de taco_extra.csv).
    """
    return repository.insert_custom_food(user, body.model_dump())


@router.delete("/custom/{food_id}")
def delete_custom_food(food_id: str, user: CurrentUser = CurrentUserDep):
    repository.delete_custom_food(user, food_id)
    return {"ok": True}


@router.get("/barcode/{code}")
def lookup_barcode(
    code: str = Path(min_length=6, max_length=20, pattern=r"^\d+$"),
    _user: CurrentUser = CurrentUserDep,
):
    """
    Consulta o Open Food Facts por código de barras. Devolve um alimento
    customizado (macros por 100g, sem taco_id) pronto para o picker.
    """
    try:
        resp = httpx.get(
            _OFF_URL.format(code=code),
            params={"fields": "product_name,product_name_pt,brands,nutriments"},
            headers={"User-Agent": "Nootr/0.1 (nootr food app)"},
            timeout=15.0,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Falha ao consultar Open Food Facts: {exc}") from exc

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Open Food Facts indisponível")

    data = resp.json()
    if data.get("status") != 1 or "product" not in data:
        raise HTTPException(status_code=404, detail="Produto não encontrado nesse código de barras")

    product = data["product"]
    n = product.get("nutriments", {})
    kcal = n.get("energy-kcal_100g")
    if kcal is None:
        raise HTTPException(status_code=422, detail="Produto sem informação nutricional por 100g")

    name = product.get("product_name_pt") or product.get("product_name") or "Produto"
    brand = (product.get("brands") or "").split(",")[0].strip()
    if brand and brand.lower() not in name.lower():
        name = f"{name} ({brand})"

    return {
        "name": name[:120],
        "kcal_100g": round(float(kcal), 1),
        "protein_100g": round(float(n.get("proteins_100g") or 0), 1),
        "carbs_100g": round(float(n.get("carbohydrates_100g") or 0), 1),
        "fat_100g": round(float(n.get("fat_100g") or 0), 1),
    }
