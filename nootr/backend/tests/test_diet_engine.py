import pytest

from backend.app.data.taco import load_taco_foods
from backend.app.services import diet_engine
from backend.app.services.nutrition import scale_food


def _scaled(taco_id: int, grams: float) -> dict:
    taco = {f.id: f for f in load_taco_foods()}
    return scale_food(taco[taco_id], grams)


@pytest.fixture
def diet():
    """Dieta de teste montada como o builder faria (4 refeições da TACO)."""
    meals = [
        {"id": "meal-1", "name": "Café da manhã", "time": "07:30",
         "foods": [_scaled(488, 100), _scaled(52, 50), _scaled(182, 100)]},
        {"id": "meal-2", "name": "Almoço", "time": "12:30",
         "foods": [_scaled(410, 150), _scaled(3, 150), _scaled(561, 100)]},
        {"id": "meal-3", "name": "Lanche", "time": "16:00",
         "foods": [_scaled(448, 170), _scaled(222, 130)]},
        {"id": "meal-4", "name": "Jantar", "time": "19:30",
         "foods": [_scaled(308, 150), _scaled(88, 150), _scaled(100, 100)]},
    ]
    totals_kcal = sum(f["calories"] for m in meals for f in m["foods"])
    totals_protein = sum(f["protein_g"] for m in meals for f in m["foods"])
    return {
        "id": "d", "user_id": "u", "name": "Teste",
        "daily_calories": round(totals_kcal),
        "daily_protein_g": round(totals_protein),
        "daily_carbs_g": 0, "daily_fat_g": 0,
        "meals": meals,
    }


def _total_kcal(meals):
    return sum(f["calories"] for m in meals for f in m["foods"])


def test_ate_different_replaces_meal(diet):
    pizza = _scaled(53, 200) if False else _scaled(3, 300)  # arroz 300g como "fora do plano"
    r = diet_engine.log_ate_different(diet, [pizza], "meal-2")
    almoco = next(m for m in r["adjusted_meals"] if m["id"] == "meal-2")
    assert len(almoco["foods"]) == 1
    assert almoco["foods"][0]["name"] == pizza["name"]


def test_ate_different_rebalances_following_meals(diet):
    # Refeição bem mais calórica que o planejado → refeições seguintes encolhem.
    big = _scaled(3, 600)  # 600g de arroz ~768 kcal
    before_dinner = _total_kcal([m for m in diet["meals"] if m["id"] == "meal-4"])
    r = diet_engine.log_ate_different(diet, [big], "meal-2")
    after_dinner = _total_kcal([m for m in r["adjusted_meals"] if m["id"] == "meal-4"])
    assert after_dinner < before_dinner
    assert "Redistribuímos" in r["suggestion"]


def test_multiple_foods_summed(diet):
    foods = [_scaled(3, 150), _scaled(561, 100)]
    r = diet_engine.log_ate_different(diet, foods, "meal-2")
    almoco = next(m for m in r["adjusted_meals"] if m["id"] == "meal-2")
    assert len(almoco["foods"]) == 2


def test_last_meal_reports_day_balance_not_fake_rebalance(diet):
    big = _scaled(3, 600)
    r = diet_engine.log_ate_different(diet, [big], "meal-4")
    assert "Redistribuímos" not in r["suggestion"]
    assert "não há refeições seguintes" in r["suggestion"].lower()
    assert r["remaining_calories"] < 0  # fechou o dia acima da meta


def test_missing_food_swaps_only_that_food(diet):
    meal = next(m for m in diet["meals"] if m["id"] == "meal-2")
    missing_name = meal["foods"][0]["name"]  # frango
    substitute = _scaled(315, 150)  # outro item da TACO
    r = diet_engine.log_missing_food(diet, missing_name, "meal-2", [substitute])
    almoco = next(m for m in r["adjusted_meals"] if m["id"] == "meal-2")
    names = [f["name"] for f in almoco["foods"]]
    assert missing_name not in names
    assert substitute["name"] in names
    assert len(names) == 3  # trocou 1 por 1, manteve os outros 2


def test_missing_food_unknown_meal_raises(diet):
    with pytest.raises(ValueError):
        diet_engine.log_missing_food(diet, "x", "meal-999", [_scaled(3, 100)])


def test_missing_food_unknown_food_raises(diet):
    with pytest.raises(ValueError):
        diet_engine.log_missing_food(diet, "inexistente", "meal-2", [_scaled(3, 100)])
