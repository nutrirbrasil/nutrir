from backend.app.services import meal_planning


def test_meal_role_detects_lunch_and_dinner_with_accents():
    assert meal_planning.meal_role("Almoço") == "lunch"
    assert meal_planning.meal_role("almoco") == "lunch"
    assert meal_planning.meal_role("Jantar") == "dinner"
    assert meal_planning.meal_role("Café da manhã") == "other"
    assert meal_planning.meal_role("Lanche da tarde") == "other"


def test_role_weights_lunch_dinner_get_30_pct_each():
    weights = meal_planning.role_weights(["Café da manhã", "Almoço", "Lanche da tarde", "Jantar"])
    by_name = dict(zip(["cafe", "almoco", "lanche", "jantar"], weights))
    assert abs(by_name["almoco"] - 0.30) < 1e-9
    assert abs(by_name["jantar"] - 0.30) < 1e-9
    # As duas "outras" dividem os 40% restantes igualmente.
    assert abs(by_name["cafe"] - 0.20) < 1e-9
    assert abs(by_name["lanche"] - 0.20) < 1e-9
    assert abs(sum(weights) - 1.0) < 1e-9


def test_role_weights_renormalize_when_lunch_already_locked():
    # Só jantar + 1 lanche ainda ajustáveis (almoço já foi comido): os pesos
    # devem manter a proporção que tinham no dia INTEIRO (30% jantar vs 20%
    # lanche), renormalizados pra somar 1 só entre os dois, não recalculados
    # do zero como se o dia fosse só essas duas refeições.
    all_names = ["Café da manhã", "Almoço", "Lanche da tarde", "Jantar"]
    weights = meal_planning.role_weights(["Lanche da tarde", "Jantar"], all_meal_names=all_names)
    lanche_w, jantar_w = weights
    assert jantar_w > lanche_w  # jantar (papel principal) pesa mais
    assert abs(jantar_w - 0.6) < 1e-9  # 30/(30+20)
    assert abs(lanche_w - 0.4) < 1e-9  # 20/(30+20)
    assert abs(sum(weights) - 1.0) < 1e-9


def test_role_weights_six_meals_others_hit_10_pct_floor():
    names = ["Café da manhã", "Lanche da manhã", "Almoço", "Lanche da tarde", "Jantar", "Ceia"]
    weights = meal_planning.role_weights(names)
    other_weights = [w for n, w in zip(names, weights) if meal_planning.meal_role(n) == "other"]
    for w in other_weights:
        assert abs(w - 0.10) < 1e-9


def test_meal_template_clamps_below_4_to_4():
    assert len(meal_planning.meal_template(1)) == 4
    assert len(meal_planning.meal_template(3)) == 4


def test_meal_template_known_counts():
    names4 = [n for n, _ in meal_planning.meal_template(4)]
    assert names4 == ["Café da manhã", "Almoço", "Lanche da tarde", "Jantar"]
    names6 = [n for n, _ in meal_planning.meal_template(6)]
    assert "Ceia" in names6
    assert len(names6) == 6


def test_meal_plan_targets_every_meal_has_calories_and_protein():
    targets = meal_planning.meal_plan_targets(4, total_calories=2000, total_protein_g=150)
    assert len(targets) == 4
    for t in targets:
        assert t["calories"] > 0
        assert t["protein_g"] > 0
    total_cal = sum(t["calories"] for t in targets)
    total_prot = sum(t["protein_g"] for t in targets)
    # Soma bate a meta do dia (dentro do arredondamento).
    assert abs(total_cal - 2000) <= 4
    assert abs(total_prot - 150) <= 4
    lunch = next(t for t in targets if t["name"] == "Almoço")
    dinner = next(t for t in targets if t["name"] == "Jantar")
    assert 0.25 <= lunch["calories"] / 2000 <= 0.35
    assert 0.25 <= dinner["calories"] / 2000 <= 0.35
    assert 0.25 <= lunch["protein_g"] / 150 <= 0.35
