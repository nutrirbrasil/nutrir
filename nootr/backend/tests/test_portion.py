from backend.app.services.portion import parse_portion


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
