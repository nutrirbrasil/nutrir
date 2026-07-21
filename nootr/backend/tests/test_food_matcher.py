from backend.app.data.taco import load_taco_foods
from backend.app.services import food_matcher as fm


def _raw_name(taco_id: int) -> str:
    """Nome original da TACO (não o `display_name`, que é editável em taco_display_names.csv)."""
    return {f.id: f for f in load_taco_foods()}[taco_id].name


def test_matches_allergen_true_for_direct_mention():
    assert fm.matches_allergen("Amendoim, torrado, salgado", ["amendoim"])
    assert fm.matches_allergen("Paçoca, amendoim", ["Amendoim"])  # case/acento não importam


def test_matches_allergen_false_when_unrelated():
    assert not fm.matches_allergen("Arroz, tipo 1, cozido", ["amendoim", "camarão"])


def test_matches_allergen_false_without_allergies():
    assert not fm.matches_allergen("Amendoim, torrado, salgado", [])


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


def test_common_food_explicit_grams_scales_down():
    # "25g" é peso explícito, não "25 porções", barra de chocolate é 50g
    # de referência, então 25g deve dar metade das calorias.
    m = fm.find_food("comi 25g de chocolate")
    assert m.source == "common"
    assert m.calories == 130.0
    assert m.grams == 25.0


def test_common_food_explicit_grams_space_separated():
    # Caso que gerava 2600kcal: "25 g" (espaço) era lido como o número "25"
    # multiplicando a porção inteira, em vez de peso explícito de 25g.
    m = fm.find_food("comi 25 g de chocolate")
    assert m.source == "common"
    assert m.calories == 130.0
    assert m.grams == 25.0


def test_generic_bife_prefers_common_cut_over_bife_a_cavalo():
    # "Bife à cavalo" é o único item com "bife" no nome, sem pedir "cavalo"
    # de propósito, "bife" sozinho deve cair num corte bovino genérico.
    m = fm.find_food("bife")
    assert m.source == "taco"
    assert "cavalo" not in _raw_name(m.taco_id).lower()


def test_bife_a_cavalo_still_matches_when_asked():
    m = fm.find_food("bife a cavalo")
    assert m.source == "taco"
    assert "cavalo" in _raw_name(m.taco_id).lower()


def test_generic_bife_prefers_user_favorite():
    foods = load_taco_foods()
    patinho = next(f for f in foods if "patinho" in f.name.lower() and "grelhad" in f.name.lower())
    m = fm.find_food("bife", preferred={patinho.id})
    assert m.taco_id == patinho.id


def test_cha_sem_sabor_e_item_generico_zero_kcal():
    # Nenhuma variedade de chá da TACO tem 0 sabor, sem pedir mate/preto/
    # erva-doce, "chá" sozinho não pode bater em nenhuma delas por acaso (era
    # o caso: "cha" batia como substring de "Charque"). Usa o item genérico
    # "Chá" curado em taco_extra.csv (id 9025), precisa ter taco_id de
    # verdade pra funcionar também na importação de dieta (diets.py usa
    # search_taco diretamente, não find_food).
    m = fm.find_food("chá")
    assert m.source == "taco"
    assert m.name == "Chá"
    assert m.calories == 0.0


def test_cha_com_sabor_ainda_bate_na_taco():
    m = fm.find_food("chá mate")
    assert m.source == "taco"
    assert "mate" in _raw_name(m.taco_id).lower()


def test_taco_head_ingredient_preferred():
    # "frango" deve casar um item cujo ingrediente principal é frango,
    # não um derivado (linguiça/coração de frango). Checa o nome ORIGINAL da
    # TACO (via taco_id), não o display_name, esse é editável pelo usuário
    # em taco_display_names.csv e não deve quebrar o teste de ranking.
    m = fm.find_food("frango", anchor_kcal=300)
    assert m.source == "taco"
    assert _raw_name(m.taco_id).lower().startswith("frango")


def test_taco_preparation_from_query():
    m = fm.find_food("frango grelhado", anchor_kcal=300)
    assert "grelhado" in _raw_name(m.taco_id).lower()


def test_taco_uses_parsed_portion():
    m = fm.find_food("150g de arroz")
    assert m.source == "taco"
    assert m.grams == 150.0


def test_estimate_fallback_low_confidence():
    m = fm.find_food("xyzabc inexistente", anchor_kcal=400)
    assert m.source == "estimate"
    assert m.confidence == "baixa"
    assert m.calories == 400.0


def test_tie_resolver_called_only_on_genuine_tie():
    # "frango grelhado" já tem um vencedor claro (match_score maior por
    # "grelhado" bater), não é um empate de verdade, o resolver não deve
    # nem ser chamado.
    calls = []

    def resolver(query, tied):
        calls.append((query, [f.id for f in tied]))
        return None

    fm.search_taco("frango grelhado", limit=1, tie_resolver=resolver)
    assert calls == []


def test_tie_resolver_can_override_default_pick():
    # "azeite" empata entre "de oliva" e "de dendê" (mesma pontuação em tudo
    # menos o id), o resolver deve ser chamado com os dois, e sua escolha
    # deve vencer mesmo não sendo a de menor id.
    tied_ids = set()

    def resolver(query, tied):
        tied_ids.update(f.id for f in tied)
        # escolhe de propósito o de MAIOR id, pra provar que a escolha do
        # resolver (não o desempate padrão por id) que decide.
        return max(tied, key=lambda f: f.id)

    default = fm.search_taco("azeite", limit=1)[0]
    resolved = fm.search_taco("azeite", limit=1, tie_resolver=resolver)[0]

    assert len(tied_ids) >= 2
    assert resolved.id == max(tied_ids)
    assert resolved.id != default.id or default.id == max(tied_ids)


def test_tie_resolver_none_keeps_default():
    # Se o resolver não souber decidir (devolve None), mantém o desempate padrão.
    default = fm.search_taco("azeite", limit=1)[0]
    resolved = fm.search_taco("azeite", limit=1, tie_resolver=lambda q, tied: None)[0]
    assert resolved.id == default.id
