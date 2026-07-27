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
    substitute = _scaled(315, 300)  # macarrão no lugar do frango (item novo na refeição)
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
    r = diet_engine.log_ate_different(diet, [], [_scaled(315, 200)], "meal-2")
    almoco = next(m for m in r["adjusted_meals"] if m["id"] == "meal-2")
    names = [f["name"] for f in almoco["foods"]]
    assert all(n in names for n in planned_names)
    assert len(names) == len(planned_names) + 1


def test_eating_more_of_a_planned_food_merges_instead_of_duplicating(diet):
    # "Comi mais 100g de arroz" numa refeição que já tem arroz vira UM arroz
    # maior, não duas linhas de arroz (duplicata também quebrava o diff, que
    # indexa por nome).
    almoco_antes = next(m for m in diet["meals"] if m["id"] == "meal-2")
    arroz = next(f for f in almoco_antes["foods"] if "Arroz" in f["name"])
    r = diet_engine.log_ate_different(diet, [], [_scaled(3, 100)], "meal-2")
    almoco = next(m for m in r["adjusted_meals"] if m["id"] == "meal-2")
    arroz_depois = [f for f in almoco["foods"] if f["name"] == arroz["name"]]
    assert len(arroz_depois) == 1
    assert arroz_depois[0]["grams"] > arroz["grams"]


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


def test_rebalance_favors_meal_furthest_below_its_own_target(diet):
    # Café da manhã e Lanche têm o MESMO peso-alvo (ambos "outros", ~20% cada
    # no dia inteiro), mas partem de quantidades diferentes. Ao reajustar por
    # um desvio futuro no almoço (que libera café/lanche/jantar como
    # ajustáveis, ver log_will_eat_different), quem começa mais abaixo do
    # próprio alvo deve crescer proporcionalmente MAIS, não o fator uniforme
    # de antes (que cresceria os dois na mesma proporção).
    cafe_before = _total_kcal([m for m in diet["meals"] if m["id"] == "meal-1"])
    lanche_before = _total_kcal([m for m in diet["meals"] if m["id"] == "meal-3"])
    assert cafe_before != lanche_before  # pré-condição: partem de bases diferentes

    meal = next(m for m in diet["meals"] if m["id"] == "meal-2")
    bigger_addition = _scaled(410, 250)  # bastante proteína/caloria a mais no almoço
    r = diet_engine.log_will_eat_different(diet, [], [bigger_addition], "meal-2", already_eaten_ids=[])
    assert r["rebalanced"] is True

    cafe_after = _total_kcal([m for m in r["adjusted_meals"] if m["id"] == "meal-1"])
    lanche_after = _total_kcal([m for m in r["adjusted_meals"] if m["id"] == "meal-3"])

    cafe_growth = cafe_after / cafe_before
    lanche_growth = lanche_after / lanche_before
    lower_growth, higher_growth = sorted([cafe_growth, lanche_growth])
    lower_before, _ = sorted([cafe_before, lanche_before])
    # Quem partiu de MENOS deve ter crescido proporcionalmente MAIS (peso
    # igual, mas base menor puxa mais forte em direção ao alvo comum).
    assert (cafe_before == lower_before) == (cafe_growth == higher_growth)


def test_rebalance_floor_pass_raises_meal_far_below_role_floor():
    # Jantar (papel "dinner", piso de 25% do dia) começa artificialmente
    # pequeno (50 kcal) num dia de 2000 kcal, o piso é 500 kcal. As passadas 1
    # e 2 sozinhas (fator 0.3x-2.5x relativo ao que a refeição JÁ tinha) não
    # conseguem levá-lo além de ~2.5x seu tamanho original em cada rodada, bem
    # abaixo do piso. A passada 3 (piso) empresta calorias do café da manhã
    # (que sobra bem acima do próprio piso de 10%) pra aproximar o jantar do
    # piso, sem violar a meta do dia.
    cafe_food = {"name": "Aveia", "calories": 800.0, "protein_g": 20.0, "carbs_g": 140.0, "fat_g": 10.0, "grams": 200.0, "quantity": "200g"}
    almoco_food = {"name": "Arroz e feijão", "calories": 400.0, "protein_g": 15.0, "carbs_g": 60.0, "fat_g": 8.0, "grams": 300.0, "quantity": "300g"}
    jantar_food = {"name": "Sopa", "calories": 50.0, "protein_g": 2.0, "carbs_g": 8.0, "fat_g": 1.0, "grams": 200.0, "quantity": "200g"}
    diet = {
        "id": "d", "user_id": "u", "name": "Teste",
        "daily_calories": 2000, "daily_protein_g": 100, "daily_carbs_g": 0, "daily_fat_g": 0,
        "meals": [
            {"id": "meal-1", "name": "Café da manhã", "time": "07:00", "foods": [cafe_food]},
            {"id": "meal-2", "name": "Almoço", "time": "12:00", "foods": [almoco_food]},
            {"id": "meal-3", "name": "Jantar", "time": "20:00", "foods": [jantar_food]},
        ],
    }
    big_addition = {"name": "Feijoada extra", "calories": 100.0, "protein_g": 5.0, "carbs_g": 10.0, "fat_g": 3.0, "grams": 100.0, "quantity": "100g"}
    r = diet_engine.log_will_eat_different(diet, [], [big_addition], "meal-2", already_eaten_ids=[])

    jantar_after = next(m for m in r["adjusted_meals"] if m["id"] == "meal-3")
    cafe_after = next(m for m in r["adjusted_meals"] if m["id"] == "meal-1")
    jantar_kcal = sum(f["calories"] for f in jantar_after["foods"])
    cafe_kcal = sum(f["calories"] for f in cafe_after["foods"])

    # A passada de piso empurra o jantar pra cima emprestando do café da
    # manhã, que sobra bem acima do próprio piso de 200 kcal (10% de 2000).
    # O quanto ele sobe é limitado por _cap_total_growth (no máximo 2,5x as
    # 50 kcal originais): porção irreal seria pior que meta imperfeita.
    assert jantar_kcal > 100          # cresceu de verdade
    assert jantar_kcal <= 50 * 2.5 + 1  # mas dentro do teto de crescimento
    assert cafe_kcal > 200            # o doador continua acima do próprio piso


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


def test_diff_meals_reports_each_kind_of_change(diet):
    before = diet["meals"]
    after = [
        # Café: um alimento sai, outro entra.
        {**before[0], "foods": [before[0]["foods"][0], _scaled(561, 60)]},
        # Almoço: um alimento cresce.
        {**before[1], "foods": [_scaled(410, 300), *before[1]["foods"][1:]]},
        # Lanche: intacto, não deve aparecer no diff.
        before[2],
        # Jantar: um alimento encolhe.
        {**before[3], "foods": [_scaled(308, 80), *before[3]["foods"][1:]]},
    ]
    diff = diet_engine.diff_meals(before, after)
    by_meal = {d["meal"]: d["changes"] for d in diff}

    assert "Lanche" not in by_meal  # refeição sem mudança não entra
    kinds = {(c["kind"], c["name"]) for c in by_meal["Café da manhã"]}
    assert any(k == "removed" for k, _ in kinds)
    assert any(k == "added" for k, _ in kinds)
    assert by_meal["Almoço"][0]["kind"] == "increased"
    assert by_meal["Jantar"][0]["kind"] == "decreased"


def test_diff_meals_ignores_rounding_noise(diet):
    # Diferença menor que 1g é ruído de arredondamento, não uma alteração
    # que valha mostrar pro usuário como "aumentou". Todos os alimentos
    # continuam presentes, só as gramas variam um triz.
    before = [diet["meals"][0]]
    after = [{
        **before[0],
        "foods": [{**f, "grams": (f["grams"] or 0) + 0.4} for f in before[0]["foods"]],
    }]
    assert diet_engine.diff_meals(before, after) == []


def test_substitution_result_carries_changes(diet):
    r = diet_engine.log_ate_different(diet, [], [_scaled(410, 200)], "meal-2")
    assert "changes" in r
    # A própria refeição alterada aparece no diff (o alimento adicionado).
    almoco = next((c for c in r["changes"] if c["meal"] == "Almoço"), None)
    assert almoco is not None


def test_apply_changes_handles_several_meals_at_once(diet):
    # O caso que o Noo precisa resolver: numa frase só a pessoa mexe em duas
    # refeições diferentes. As duas trocas valem, e o rebalanceamento roda
    # UMA vez (as refeições não mencionadas é que absorvem a diferença).
    cafe = next(m for m in diet["meals"] if m["id"] == "meal-1")
    lanche = next(m for m in diet["meals"] if m["id"] == "meal-3")
    r = diet_engine.apply_changes(diet, [
        {"meal_id": "meal-1", "skipped_names": [cafe["foods"][0]["name"]], "new_foods": []},
        {"meal_id": "meal-3", "skipped_names": [], "new_foods": [_scaled(410, 100)]},
    ])
    cafe_after = next(m for m in r["adjusted_meals"] if m["id"] == "meal-1")
    lanche_after = next(m for m in r["adjusted_meals"] if m["id"] == "meal-3")
    assert cafe["foods"][0]["name"] not in [f["name"] for f in cafe_after["foods"]]
    assert any("Frango" in f["name"] for f in lanche_after["foods"])
    # As refeições mexidas não são reajustadas (seriam "corrigidas" de volta).
    assert "meal-1" not in r["adjustable_meal_ids"]
    assert "meal-3" not in r["adjustable_meal_ids"]


def test_apply_changes_respects_already_eaten(diet):
    # O que já foi comido não pode ser reajustado, mesmo sem ter sido mexido.
    r = diet_engine.apply_changes(
        diet,
        [{"meal_id": "meal-1", "skipped_names": [], "new_foods": [_scaled(410, 200)]}],
        already_eaten_ids=["meal-2"],
    )
    assert "meal-2" not in r["adjustable_meal_ids"]
    almoco_before = next(m for m in diet["meals"] if m["id"] == "meal-2")
    almoco_after = next(m for m in r["adjusted_meals"] if m["id"] == "meal-2")
    assert almoco_after == almoco_before


def test_apply_changes_reports_the_diff(diet):
    r = diet_engine.apply_changes(diet, [
        {"meal_id": "meal-2", "skipped_names": [], "new_foods": [_scaled(315, 80)]},
    ])
    almoco = next((c for c in r["changes"] if c["meal"] == "Almoço"), None)
    assert almoco is not None
    assert any(c["kind"] == "added" for c in almoco["changes"])


def test_rebalance_never_inflates_a_food_beyond_the_growth_cap():
    # Uma refeição com poucos itens tendo que absorver um desvio grande fazia
    # um único alimento explodir (150g de arroz viravam 915g: as 3 passadas
    # compunham 2,5x cada). O teto vale sobre o TOTAL, então sobra diferença
    # no fim do dia em vez de porção irreal.
    arroz = {"name": "Arroz branco", "calories": 128.0, "protein_g": 2.5, "carbs_g": 28.0,
             "fat_g": 0.2, "grams": 150.0, "quantity": "150g"}
    diet = {
        "id": "d", "user_id": "u", "name": "T",
        "daily_calories": 3000, "daily_protein_g": 150, "daily_carbs_g": 0, "daily_fat_g": 0,
        "meals": [
            {"id": "meal-1", "name": "Almoço", "time": "12:00", "foods": [dict(arroz)]},
            {"id": "meal-2", "name": "Jantar", "time": "20:00", "foods": [dict(arroz)]},
        ],
    }
    # Desvio no almoço deixa o jantar sozinho pra cobrir um buraco enorme.
    r = diet_engine.apply_changes(diet, [
        {"meal_id": "meal-1", "skipped_names": ["Arroz branco"], "new_foods": []},
    ])
    jantar = next(m for m in r["adjusted_meals"] if m["id"] == "meal-2")
    assert jantar["foods"][0]["grams"] <= 150 * 2.5 + 1
    # E o app reporta a diferença que sobrou, em vez de fingir que fechou.
    assert r["remaining_calories"] > 0
