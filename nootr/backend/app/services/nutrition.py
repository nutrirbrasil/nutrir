"""Escala valores nutricionais (por 100g) para uma quantidade em gramas."""
from backend.app.data.taco import TacoFood, load_taco_foods


def scale_food(food: TacoFood, grams: float, quantity_label: str | None = None) -> dict:
    ratio = grams / 100
    return {
        "name": food.display_name,
        "quantity": quantity_label or f"{round(grams)}g",
        "calories": round((food.kcal or 0) * ratio, 1),
        "protein_g": round((food.protein_g or 0) * ratio, 1),
        "carbs_g": round((food.carbs_g or 0) * ratio, 1),
        "fat_g": round((food.fat_g or 0) * ratio, 1),
        "taco_id": food.id,
        "grams": round(grams, 1),
    }


def scale_custom(
    name: str, grams: float, kcal_100: float, protein_100: float,
    carbs_100: float, fat_100: float, quantity_label: str | None = None,
) -> dict:
    """Escala um alimento customizado (ex: código de barras) — sem taco_id."""
    ratio = grams / 100
    return {
        "name": name,
        "quantity": quantity_label or f"{round(grams)}g",
        "calories": round(kcal_100 * ratio, 1),
        "protein_g": round(protein_100 * ratio, 1),
        "carbs_g": round(carbs_100 * ratio, 1),
        "fat_g": round(fat_100 * ratio, 1),
        "taco_id": None,
        "grams": round(grams, 1),
    }


def resolve_food(item) -> dict | None:
    """
    Resolve um item de entrada (pydantic) num alimento escalado.
    Aceita `taco_id`+`grams` (TACO) OU `name`+macros por 100g (customizado).
    Devolve None se o taco_id não existir.
    """
    if item.taco_id is not None:
        taco = {f.id: f for f in load_taco_foods()}
        food = taco.get(item.taco_id)
        if food is None:
            return None
        return scale_food(food, item.grams, item.quantity_label)
    return scale_custom(
        item.name or "Alimento",
        item.grams,
        item.kcal_100g or 0,
        item.protein_100g or 0,
        item.carbs_100g or 0,
        item.fat_100g or 0,
        item.quantity_label,
    )
