from backend.app.services import food_matcher as fm


def test_common_food_match():
    m = fm.find_food("comi um cheeseburger")
    assert m.source == "common"
    assert m.name == "Cheeseburger"
    assert m.calories == 520.0


def test_common_food_count_multiplies():
    m = fm.find_food("comi 3 coxinhas")
    assert m.source == "common"
    assert m.calories == 750.0  # 3 x 250


def test_common_food_count_cap():
    # Contagem é limitada a 10 para evitar exageros de parsing.
    m = fm.find_food("comi 99 coxinhas")
    assert m.calories == 2500.0  # 10 x 250


def test_taco_head_ingredient_preferred():
    # "frango" deve casar um item cujo ingrediente principal é frango,
    # não um derivado (linguiça/coração de frango).
    m = fm.find_food("frango", anchor_kcal=300)
    assert m.source == "taco"
    assert m.name.lower().startswith("frango")


def test_taco_preparation_from_query():
    m = fm.find_food("frango grelhado", anchor_kcal=300)
    assert "grelhado" in m.name.lower()


def test_taco_uses_parsed_portion():
    m = fm.find_food("150g de arroz")
    assert m.source == "taco"
    assert m.grams == 150.0


def test_estimate_fallback_low_confidence():
    m = fm.find_food("xyzabc inexistente", anchor_kcal=400)
    assert m.source == "estimate"
    assert m.confidence == "baixa"
    assert m.calories == 400.0


def test_best_available_substitute_picks_closest_kcal():
    result = fm.best_available_substitute(["alface", "frango grelhado"], target_kcal=240)
    # frango grelhado ancorado em ~240 kcal fica muito mais perto que alface.
    assert "frango" in result.name.lower()
