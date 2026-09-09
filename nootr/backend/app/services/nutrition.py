"""Escala valores nutricionais (por 100g) para uma quantidade em gramas."""
import re

from backend.app.data.taco import TacoFood, load_taco_foods

_PLAIN_GRAMS_LABEL = re.compile(r"^(\d+(?:[.,]\d+)?)\s*g$", re.IGNORECASE)


def _clean_quantity_label(quantity_label: str | None, grams: float) -> str | None:
    """
    Preserva o rótulo com medida caseira ("1 xícara", "2 fatias") como veio,
    mas se for só gramas cru (ex: um cálculo de "metade" virando "112.5g"),
    arredonda pro mesmo padrão inteiro que o resto do app usa (`round(grams)g`
    no fallback abaixo), senão a fração aparecia crua pra pessoa, que ninguém
    mede de verdade ("112.5g" de arroz).
    """
    if quantity_label and _PLAIN_GRAMS_LABEL.match(quantity_label.strip()):
        return f"{round(grams)}g"
    return quantity_label


def scale_food(
    food: TacoFood, grams: float, quantity_label: str | None = None, dish_name: str | None = None,
) -> dict:
    ratio = grams / 100
    quantity_label = _clean_quantity_label(quantity_label, grams)
    result = {
        "name": food.display_name,
        "quantity": quantity_label or f"{round(grams)}g",
        "calories": round((food.kcal or 0) * ratio, 1),
        "protein_g": round((food.protein_g or 0) * ratio, 1),
        "carbs_g": round((food.carbs_g or 0) * ratio, 1),
        "fat_g": round((food.fat_g or 0) * ratio, 1),
        "taco_id": food.id,
        "grams": round(grams, 1),
    }
    if dish_name:
        result["dish_name"] = dish_name
    return result


def scale_custom(
    name: str, grams: float, kcal_100: float, protein_100: float,
    carbs_100: float, fat_100: float, quantity_label: str | None = None,
    dish_name: str | None = None,
) -> dict:
    """Escala um alimento customizado (ex: código de barras), sem taco_id."""
    ratio = grams / 100
    quantity_label = _clean_quantity_label(quantity_label, grams)
    result = {
        "name": name,
        "quantity": quantity_label or f"{round(grams)}g",
        "calories": round(kcal_100 * ratio, 1),
        "protein_g": round(protein_100 * ratio, 1),
        "carbs_g": round(carbs_100 * ratio, 1),
        "fat_g": round(fat_100 * ratio, 1),
        "taco_id": None,
        "grams": round(grams, 1),
    }
    if dish_name:
        result["dish_name"] = dish_name
    return result


def resolve_food(item) -> dict | None:
    """
    Resolve um item de entrada (pydantic) num alimento escalado.
    Aceita `taco_id`+`grams` (TACO) OU `name`+macros por 100g (customizado).
    Devolve None se o taco_id não existir.
    `dish_name` (opcional, ver import de dieta) só sobrevive no dict de saída
    quando o item veio de decompor um prato composto, usado transitoriamente
    pra revisão no frontend, nunca persistido na dieta final.
    """
    dish_name = getattr(item, "dish_name", None)
    if item.taco_id is not None:
        taco = {f.id: f for f in load_taco_foods()}
        food = taco.get(item.taco_id)
        if food is None:
            return None
        return scale_food(food, item.grams, item.quantity_label, dish_name)
    return scale_custom(
        item.name or "Alimento",
        item.grams,
        item.kcal_100g or 0,
        item.protein_100g or 0,
        item.carbs_100g or 0,
        item.fat_100g or 0,
        item.quantity_label,
        dish_name,
    )
