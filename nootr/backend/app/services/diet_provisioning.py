"""
Monta o template de dieta padrão a partir de itens reais da tabela TACO.

Usado para provisionar uma dieta inicial quando um usuário novo ainda não tem
nenhuma dieta ativa. O objetivo é que o usuário já veja um plano coerente (com
macros vindos da mesma base nutricional usada pelo motor de substituição) sem
precisar montar tudo do zero.
"""
from backend.app.data.taco import load_taco_foods
from backend.app.services.nutrition import scale_food

# (taco_id, gramas) por refeição. Ids conferidos contra backend/app/data/taco.csv.
_DEFAULT_MEALS = [
    ("meal-1", "Café da manhã", "07:30", [
        (488, 100),  # Ovo, de galinha, inteiro, cozido/10minutos
        (52, 50),    # Pão, trigo, forma, integral
        (182, 100),  # Banana, prata, crua
    ]),
    ("meal-2", "Almoço", "12:30", [
        (410, 150),  # Frango, peito, sem pele, grelhado
        (3, 150),    # Arroz, tipo 1, cozido
        (561, 100),  # Feijão, carioca, cozido
        (77, 30),    # Alface, americana, crua
        (161, 50),   # Tomate, salada
    ]),
    ("meal-3", "Lanche da tarde", "16:00", [
        (448, 170),  # Iogurte, natural
        (222, 130),  # Maçã, Fuji, com casca, crua
    ]),
    ("meal-4", "Jantar", "19:30", [
        (308, 150),  # Pescada, filé, frito
        (88, 150),   # Batata, doce, cozida
        (100, 100),  # Brócolis, cozido
        (109, 50),   # Cenoura, cozida
    ]),
]


def build_default_diet() -> dict:
    """Devolve o template de dieta (sem user_id) com macros calculados da TACO."""
    taco = {f.id: f for f in load_taco_foods()}

    meals = [
        {
            "id": meal_id,
            "name": name,
            "time": time,
            "foods": [scale_food(taco[food_id], grams) for food_id, grams in items],
        }
        for meal_id, name, time, items in _DEFAULT_MEALS
    ]

    totals = {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0}
    for meal in meals:
        for food in meal["foods"]:
            totals["calories"] += food["calories"]
            totals["protein_g"] += food["protein_g"]
            totals["carbs_g"] += food["carbs_g"]
            totals["fat_g"] += food["fat_g"]

    return {
        "name": "Plano padrão",
        "daily_calories": round(totals["calories"]),
        "daily_protein_g": round(totals["protein_g"]),
        "daily_carbs_g": round(totals["carbs_g"]),
        "daily_fat_g": round(totals["fat_g"]),
        "meals": meals,
    }
