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


def test_ate_different_swaps_one_food_keeps_rest(diet):
    meal = next(m for m in diet["meals"] if m["id"] == "meal-2")
    skipped_name = meal["foods"][0]["name"]  # frango
    substitute = _scaled(3, 300)  # arroz 300g no lugar do frango
    r = diet_engine.log_ate_different(diet, [skipped_name], [substitute], "meal-2")
    almoco = next(m for m in r["adjusted_meals"] if m["id"] == "meal-2")
    names = [f["name"] for f in almoco["foods"]]
    assert skipped_name not in names
    assert substitute["name"] in names
    assert len(names) == 3  # trocou 1 por 1, manteve os outros 2


def test_ate_different_no_replacement_removes_food(diet):
    # "não comi X e não comi nada no lugar" -> o alimento só sai da refeição.
    meal = next(m for m in diet["meals"] if m["id"] == "meal-2")
    skipped_name = meal["foods"][0]["name"]
    r = diet_engine.log_ate_different(diet, [skipped_name], [], "meal-2")
    almoco = next(m for m in r["adjusted_meals"] if m["id"] == "meal-2")
    names = [f["name"] for f in almoco["foods"]]
    assert skipped_name not in names
    assert len(names) == 2


def test_ate_different_extra_food_keeps_planned(diet):
    # Nada foi "pulado" -- é uma adição por cima do que já estava planejado.
    meal = next(m for m in diet["meals"] if m["id"] == "meal-2")
    planned_names = [f["name"] for f in meal["foods"]]
    r = diet_engine.log_ate_different(diet, [], [_scaled(410, 200)], "meal-2")
    almoco = next(m for m in r["adjusted_meals"] if m["id"] == "meal-2")
    names = [f["name"] for f in almoco["foods"]]
    assert all(n in names for n in planned_names)
    assert len(names) == len(planned_names) + 1


def test_ate_different_rebalances_by_protein(diet):
    # Come um item muito proteico no almoço -> a proteína do dia já é suprida,
    # então as refeições seguintes ENCOLHEM e as quantidades (gramas) mudam.
    protein_rich = _scaled(410, 400)  # 400g de frango grelhado (muita proteína)
    before_dinner = _total_kcal([m for m in diet["meals"] if m["id"] == "meal-4"])
    r = diet_engine.log_ate_different(diet, [], [protein_rich], "meal-2")
    dinner_after = next(m for m in r["adjusted_meals"] if m["id"] == "meal-4")
    after_dinner = _total_kcal([dinner_after])
    assert after_dinner < before_dinner
    assert r["rebalanced"] is True
    # A mudança principal é na quantidade: gramas do jantar caíram.
    orig_dinner = next(m for m in diet["meals"] if m["id"] == "meal-4")
    assert dinner_after["foods"][0]["grams"] < orig_dinner["foods"][0]["grams"]


def test_result_reports_before_after_and_targets(diet):
    r = diet_engine.log_ate_different(diet, [], [_scaled(410, 200)], "meal-2")
    for key in ("macros_before", "macros_after", "targets"):
        assert key in r
    assert "protein_pct" in r["macros_after"]
    assert r["targets"]["protein_g"] > 0


def test_multiple_foods_summed(diet):
    meal = next(m for m in diet["meals"] if m["id"] == "meal-2")
    all_names = [f["name"] for f in meal["foods"]]
    foods = [_scaled(3, 150), _scaled(561, 100)]
    r = diet_engine.log_ate_different(diet, all_names, foods, "meal-2")
    almoco = next(m for m in r["adjusted_meals"] if m["id"] == "meal-2")
    assert len(almoco["foods"]) == 2


def test_last_meal_has_no_rebalance(diet):
    meal = next(m for m in diet["meals"] if m["id"] == "meal-4")
    all_names = [f["name"] for f in meal["foods"]]
    big = _scaled(3, 600)
    r = diet_engine.log_ate_different(diet, all_names, [big], "meal-4")
    assert r["rebalanced"] is False
    assert "não havia refeições seguintes" in r["suggestion"].lower()
    assert r["remaining_calories"] < 0  # fechou o dia acima da meta


def test_will_eat_different_adjusts_pending_regardless_of_order(diet):
    # meal-1 (café, vem ANTES de meal-3 na lista) ainda não foi comida hoje ->
    # é ajustável. meal-4 (jantar, vem DEPOIS) já foi comida -> fica travada,
    # mesmo estando posicionalmente após a refeição trocada.
    lanche = next(m for m in diet["meals"] if m["id"] == "meal-3")
    skipped_name = lanche["foods"][0]["name"]
    big_substitute = _scaled(410, 400)  # bem proteico, força reajuste
    orig_meal1 = next(m for m in diet["meals"] if m["id"] == "meal-1")
    orig_meal4 = next(m for m in diet["meals"] if m["id"] == "meal-4")

    r = diet_engine.log_will_eat_different(
        diet, [skipped_name], [big_substitute], "meal-3", already_eaten_ids=["meal-4"],
    )

    meal1_after = next(m for m in r["adjusted_meals"] if m["id"] == "meal-1")
    meal4_after = next(m for m in r["adjusted_meals"] if m["id"] == "meal-4")
    assert meal1_after["foods"][0]["grams"] != orig_meal1["foods"][0]["grams"]
    assert meal4_after == orig_meal4  # travada: não foi tocada


def test_apply_meal_changes_adds_and_removes(diet):
    meal = next(m for m in diet["meals"] if m["id"] == "meal-4")
    removed_name = meal["foods"][0]["name"]
    new_food = {"name": "Batata doce cozida", "calories": 150, "protein_g": 2,
                "carbs_g": 35, "fat_g": 0, "grams": 150, "quantity": "150g"}
    updated = diet_engine.apply_meal_changes(diet["meals"], "Jantar", [new_food], [removed_name])
    jantar = next(m for m in updated if m["id"] == "meal-4")
    names = [f["name"] for f in jantar["foods"]]
    assert removed_name not in names
    assert "Batata doce cozida" in names
    assert len(names) == len(meal["foods"])  # removeu 1, adicionou 1


def test_apply_meal_changes_unknown_meal_returns_none(diet):
    result = diet_engine.apply_meal_changes(diet["meals"], "Refeição Inexistente", [], [])
    assert result is None


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
