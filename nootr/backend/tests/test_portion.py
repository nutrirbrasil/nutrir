from backend.app.services.portion import parse_portion


def test_explicit_grams():
    assert parse_portion("150g de arroz") == 150.0
    assert parse_portion("150 gramas") == 150.0
    assert parse_portion("1kg de carne") == 1000.0


def test_units():
    assert parse_portion("2 fatias de pao") == 50.0
    assert parse_portion("3 unidades") == 180.0
    assert parse_portion("1 pote de iogurte") == 170.0
    assert parse_portion("1 prato de feijao") == 400.0


def test_spoon_qualifiers():
    assert parse_portion("1 colher de sopa de azeite") == 15.0
    assert parse_portion("1 colher de cha de acucar") == 5.0
    assert parse_portion("1 colher de sobremesa") == 10.0


def test_written_quantities():
    assert parse_portion("meia xicara de arroz") == 60.0
    assert parse_portion("duas fatias") == 50.0


def test_unrecognized_returns_none():
    assert parse_portion("sem quantidade nenhuma") is None
    assert parse_portion("") is None
