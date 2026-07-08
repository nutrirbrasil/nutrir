"""Rotas Nootr — busca de alimentos (TACO) e código de barras (Open Food Facts)."""
import httpx
from fastapi import APIRouter, HTTPException, Path, Query

from backend.app.auth import CurrentUser, CurrentUserDep
from backend.app.services import food_matcher

router = APIRouter(prefix="/nootr/foods", tags=["Nootr - Alimentos"])

_OFF_URL = "https://world.openfoodfacts.org/api/v2/product/{code}.json"


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
