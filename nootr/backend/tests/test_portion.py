from backend.app.services.portion import parse_portion, rescale_quantity


def test_explicit_grams():
    assert parse_portion("150g de arroz") == 150.0
    assert parse_portion("150 gramas") == 150.0
    assert parse_portion("1kg de carne") == 1000.0


def test_units():
    assert parse_portion("2 fatias de pao") == 50.0
    assert parse_portion("1 pote de iogurte") == 170.0
    assert parse_portion("1 prato de feijao") == 200.0


def test_units_with_no_generic_fallback():
    # "Unidade", "fatia", "pedaço", "porção" e "prato" variam demais por
    # alimento pra ter peso único (castanha vs manga, fatia de pão vs fatia
    # de mamão), só resolvem com um alimento mapeado; sem contexto, ou com
    # um alimento fora da lista, devolvem None em vez de chutar um genérico.
    assert parse_portion("3 unidades") is None
    assert parse_portion("1 unidade", food_hint="Arroz, tipo 1, cozido") is None
    assert parse_portion("1 fatia") is None
    assert parse_portion("1 pedaço", food_hint="coisa aleatória") is None
    assert parse_portion("1 porção", food_hint="coisa aleatória") is None
    assert parse_portion("1 prato", food_hint="coisa aleatória") is None


def test_unidade_food_aware_weights():
    assert parse_portion("2 unidades", food_hint="castanha do Pará") == 10.0
    assert parse_portion("1 unidade", food_hint="Ovo, de galinha, inteiro, cru") == 50.0
    assert parse_portion("2 unidades", food_hint="Ovo, de codorna, inteiro, cru") == 18.0
    assert parse_portion("1 unidade", food_hint="Banana, prata, crua") == 70.0


def test_fatia_pedaco_porcao_prato_food_aware_weights():
    assert parse_portion("1 fatia", food_hint="mamão") == 150.0
    assert parse_portion("1 fatia", food_hint="queijo") == 20.0
    assert parse_portion("1 pedaço", food_hint="bolo") == 80.0
    assert parse_portion("1 porção", food_hint="castanha do pará") == 20.0
    assert parse_portion("1 prato", food_hint="salada") == 150.0


def test_bola_sorvete_vs_almondega():
    # "Bola" sozinha (sorvete) tem peso próprio; "bola de carne" (almôndega)
    # é resolvida como 1 unidade de almôndega, não sorvete.
    assert parse_portion("2 bolas", food_hint="sorvete de morango") == 120.0
    assert parse_portion("1 bola de carne", food_hint="almôndega") == 30.0
    assert parse_portion("3 bolas", food_hint="coisa aleatória sem relação") is None


def test_spoon_qualifiers():
    assert parse_portion("1 colher de sopa de azeite") == 15.0
    assert parse_portion("1 colher de cha de acucar") == 5.0
    assert parse_portion("1 colher de sobremesa") == 10.0


def test_written_quantities():
    assert parse_portion("meia xicara de arroz") == 60.0
    assert parse_portion("duas fatias de pao") == 50.0


def test_unrecognized_returns_none():
    assert parse_portion("sem quantidade nenhuma") is None
    assert parse_portion("") is None


def test_rescale_quantity_preserves_household_measure():
    # "3 unidades" escalado pra ~4 ovos (200g) deve virar "4 unidades (200g)",
    # não só "200g" cru (que perde a medida caseira, ver diet_engine._scale_food).
    grams, label = rescale_quantity("3 unidades", 200.0, food_hint="Ovo, de galinha, inteiro, cru")
    assert grams == 200.0
    assert label == "4 unidades (200g)"


def test_rescale_quantity_caps_discrete_unit_growth():
    # 3 ovos escalando pra um alvo de 339g (quase 7 ovos) não pode virar 7
    # ovos numa refeição só, o cap (2x ou 4 unidades, o menor) trava em 4.
    grams, label = rescale_quantity("3 unidades", 339.0, food_hint="Ovo, de galinha, inteiro, cru")
    assert grams == 200.0
    assert label == "4 unidades (200g)"

    # Já bem pequeno (1 ovo) pode crescer até 2x sem soar estranho.
    grams, label = rescale_quantity("1 unidade", 90.0, food_hint="Ovo, de galinha, inteiro, cru")
    assert grams == 100.0
    assert label == "2 unidades (100g)"


def test_rescale_quantity_never_shrinks_below_one_unit():
    grams, label = rescale_quantity("2 unidades", 10.0, food_hint="Ovo, de galinha, inteiro, cru")
    assert grams == 50.0
    assert label == "1 unidade (50g)"


def test_rescale_quantity_shrinking_is_never_blocked_by_growth_cap():
    # Encolher (não crescer) não deve ser limitado pelo cap de crescimento,
    # só o CRESCIMENTO é capado (ver _cap_growth).
    grams, label = rescale_quantity("6 unidades", 150.0, food_hint="Ovo, de galinha, inteiro, cru")
    assert grams == 150.0
    assert label == "3 unidades (150g)"


def test_rescale_quantity_small_unit_food_not_capped_like_egg():
    # Uva (5g/unidade) não pode ser tratada com o mesmo teto de "poucas
    # unidades" que faz sentido pra ovo, o teto é em GRAMAS (~200g), não numa
    # contagem fixa: 20 uvas (100g) é perfeitamente normal, mesmo crescendo a
    # partir de 10 (dobro, ver _DISCRETE_GROWTH_CAP).
    grams, label = rescale_quantity("10 unidades", 300.0, food_hint="Uva, itália, crua")
    assert grams == 100.0
    assert label == "20 unidades (100g)"


def test_rescale_quantity_spoon_never_shows_fraction():
    # "0,5 colher de sopa" não é algo que dá pra medir na prática, o rótulo
    # final nunca tem colher fracionada (ver _best_spoon).
    grams, label = rescale_quantity("2 colheres de sopa", 25.0, food_hint="Margarina com sal")
    assert "," not in label.split("colher")[0]
    assert label == "5 colheres de chá (25g)"


def test_rescale_quantity_spoon_prefers_larger_size_on_tie():
    # 75g bate exato tanto em colheres de sopa (5x15g) quanto de chá (15x5g),
    # o empate deve preferir a colher maior (menos colheres pra descrever a
    # mesma quantidade, mais fácil de servir/entender).
    grams, label = rescale_quantity("2 colheres de sopa", 75.0, food_hint="Doce de leite")
    assert grams == 75.0
    assert label == "5 colheres de sopa (75g)"


def test_rescale_quantity_plain_grams_rounds_to_multiple_of_five():
    grams, label = rescale_quantity("100g", 339.0)
    assert grams == 340.0
    assert label == "340g"


def test_rescale_quantity_unrecognized_falls_back_to_grams():
    grams, label = rescale_quantity("uma pitada", 53.0)
    assert grams == 55.0
    assert label == "55g"
