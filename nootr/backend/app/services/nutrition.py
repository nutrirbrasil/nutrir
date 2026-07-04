"""Escala valores nutricionais da TACO (por 100g) para uma quantidade em gramas."""
from backend.app.data.taco import TacoFood


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
