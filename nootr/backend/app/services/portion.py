"""
Interpreta porções em texto livre em português e devolve uma estimativa em
gramas. A TACO é por 100g, então precisamos converter "2 fatias de pão",
"1 colher de sopa de arroz", "meio prato", etc. em gramas para escalar.

Os pesos por unidade são aproximações de porções caseiras típicas, o objetivo
é uma estimativa razoável, não precisão de balança. Quando nada é reconhecido,
devolve None e o chamador decide o fallback.
"""
import re
import unicodedata


def _normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    # Frações "N/M" (ex: "1/4 unidade", "3/4 xícara") precisam virar decimal
    # ANTES da barra ser trocada por espaço abaixo, senão "1/4" vira "1 4" e
    # o regex de quantidade pega só o "4", tratando "1/4" como "4" (ou "1/2"
    # como "2"): o dobro/quádruplo da porção real, e no sentido errado.
    text = re.sub(
        r"(\d+)\s*/\s*(\d+)",
        lambda m: str(round(int(m.group(1)) / int(m.group(2)), 4)),
        text,
    )
    return re.sub(r"[^a-z0-9. ]", " ", text)


# Quantidades escritas por extenso (frações e inteiros comuns).
_WORD_QTY = {
    "meia": 0.5, "meio": 0.5,
    "um": 1, "uma": 1,
    "dois": 2, "duas": 2,
    "tres": 3, "quatro": 4, "cinco": 5, "seis": 6,
    "sete": 7, "oito": 8, "nove": 9, "dez": 10,
}

# Unidade (normalizada, singular) -> gramas por unidade. Só ficam aqui as
# medidas cujo tamanho real-mundo é razoavelmente padronizado (copo, xícara,
# pote, lata, concha), o suficiente pra um único valor genérico não ser um
# exagero pra nenhum alimento comum. "fatia", "pedaço", "porção", "prato" e
# "bola" variam demais por alimento pra ter peso único; têm tabela própria
# por alimento logo abaixo (sem fallback genérico).
_UNIT_GRAMS = {
    "g": 1, "grama": 1, "gramas": 1,
    "kg": 1000, "quilo": 1000, "quilos": 1000,
    "ml": 1, "mililitro": 1, "mililitros": 1,  # aprox. densidade da água
    "l": 1000, "litro": 1000, "litros": 1000,
    "colher": 15, "colheres": 15,  # colher de sopa (padrão)
    "concha": 80, "conchas": 80,
    "xicara": 120, "xicaras": 120,
    "copo": 200, "copos": 200,
    "pote": 170, "potes": 170,
    "punhado": 30, "punhados": 30,
    "lata": 350, "latas": 350,
    "filet": 120, "file": 120, "files": 120,
}

# Ajustes de colher por qualificador.
_SPOON_OVERRIDE = {
    "cha": 5,      # colher de chá
    "sobremesa": 10,
    "sopa": 15,
}

# "Unidade" não tem peso genérico, cada alimento tem o seu (uma castanha e
# uma manga não pesam nada parecido), então NÃO existe fallback: se o
# alimento não está mapeado abaixo, "unidade" simplesmente não é reconhecida
# como medida pra ele (devolve None, o chamador decide outro jeito de
# estimar). Peso médio da unidade inteira, aproximação de referência
# nutricional comum, não pesagem de balança.
#
# Revisado item a item contra a base TACO (frutas, verduras, ovos, nozes),
# só entram aqui alimentos genuinamente descritos por "unidade" numa dieta
# real. Alimentos cozidos/processados/por peso (arroz, feijão, carnes em
# geral, laticínios, açúcares) não têm entrada aqui de propósito.
#
# Ordem importa: chaves mais específicas (ex: "codorna") ficam ANTES de
# chaves genéricas que seriam substring delas (ex: "ovo de codorna" contém
# "ovo"), a primeira que bater no texto vale.
_UNIT_OVERRIDE_BY_FOOD = {
    # ovos (específico antes do genérico)
    "codorna": 9,
    "ovo": 50,
    # castanhas/oleaginosas
    "castanha do para": 5, "castanha-do-para": 5, "castanha do brasil": 5,
    "castanha de caju": 1.5,
    "amendoa": 1.2,
    "avela": 1.5,
    "noz": 5,
    "pinhao": 5,
    "azeitona": 4,
    "amendoim": 1,
    # frutas (peso médio da fruta inteira, com casca quando aplicável)
    "abacate": 200,
    "abiu": 100,
    "ameixa": 30,
    "atemoia": 200,
    "banana": 70,
    "caja manga": 150,
    "caju": 80,
    "caqui": 150,
    "carambola": 100,
    "ciriguela": 10,
    "goiaba": 170,
    "jabuticaba": 2,
    "jambo": 15,
    "jamelao": 2,
    "kiwi": 70,
    "laranja": 180,
    "limao": 60,
    "maca": 130,
    "manga": 200,
    "maracuja": 100,
    "morango": 12,
    "nespera": 15,
    "pequi": 30,
    "pera": 120,
    "pessego": 100,
    "pinha": 150,
    "pitanga": 5,
    "roma": 200,
    "tamarindo": 20,
    "tangerina": 100, "mexerica": 100, "bergamota": 100,
    "tucuma": 15,
    "umbu": 10,
    "uva": 5,
    # verduras/hortaliças (peso médio da unidade inteira)
    "alho": 3,  # dente, não o bulbo inteiro
    "berinjela": 250,
    "cebola": 100,
    "cenoura": 80,
    "chuchu": 200,
    "inhame": 100,
    "jilo": 15,
    "maxixe": 30,
    "pepino": 150,
    "pimentao": 150,
    "quiabo": 10,
    "rabanete": 10,
    "tomate": 90,
    "batata": 130,
    # pães/salgados unitários (fatias/pratos por peso ficam de fora)
    "pao frances": 50,
    "pao de queijo": 20,
    "hamburguer": 90,
    "pastel": 50,
    "coxinha": 70,
    # "bola de carne" (almôndega) é 1 unidade de almôndega, não sorvete,
    # "bola" sozinha (sem alimento) continua sendo sorvete, tratado à parte.
    "almondega": 30,
    "bola de carne": 30,
}

# "Fatia" varia demais por alimento pra ter peso único (fatia de pão ~25g,
# fatia de mamão ~150g, fatia de queijo ~20g), mesma lógica de
# _UNIT_OVERRIDE_BY_FOOD, sem fallback genérico.
_FATIA_OVERRIDE = {
    "pao": 25,
    "torrada": 10,
    "bolo": 60,
    "torta": 100,
    "pizza": 100,
    "queijo": 20,
    "presunto": 15,
    "mortadela": 15,
    "peito de peru": 15,
    "peru defumado": 15,
    "mamao": 150,
    "melancia": 150,
    "abacaxi": 100,
    "melao": 100,
    "rosca": 30,
    "baguete": 30,
}

# "Pedaço", mesma lógica: sem fallback, tabela por alimento.
_PEDACO_OVERRIDE = {
    "bolo": 80,
    "torta": 100,
    "queijo": 30,
    "mamao": 150,
    "melancia": 150,
    "abacaxi": 100,
    "pao": 50,
    "carne": 100,
    "frango": 100,
    "peixe": 100,
}

# "Porção", sem fallback. Nozes/castanhas/sementes em especial: uma "porção"
# de 120g seria um punhado gigante (dezenas de castanhas), bem diferente de
# uma porção de arroz ou carne.
_PORCAO_OVERRIDE = {
    "castanha": 20, "amendoa": 20, "noz": 20, "avela": 20, "amendoim": 30,
    "azeitona": 30,
    "arroz": 100, "macarrao": 100, "batata": 100,
    "feijao": 80, "leguminosa": 80,
    "carne": 100, "frango": 100, "peixe": 100,
    "salada": 100, "legume": 100, "verdura": 80,
}

# "Prato", sem fallback. Refeição completa (arroz+feijão+carne) vs prato
# leve (salada) têm ordem de grandeza diferente.
_PRATO_OVERRIDE = {
    "salada": 150,
    "sopa": 300,
    "macarrao": 250,
    "mingau": 250,
    "arroz e feijao": 350, "arroz com feijao": 350,
    "feijao": 200,
}


def _match_keyword_table(combined: str, table: dict[str, float]) -> float | None:
    """Busca a primeira chave da tabela que aparece em `combined`, respeitando
    limite de palavra (evita, ex: "pera" bater dentro de "temperado")."""
    for keyword, grams in table.items():
        pattern = r"\s+".join(re.escape(w) for w in keyword.split())
        if re.search(rf"\b{pattern}\b", combined):
            return grams
    return None


def _parse_quantity_and_unit(text: str, food_hint: str = "") -> tuple[float, str, float] | None:
    """(quantidade, CHAVE CANÔNICA da unidade, gramas por unidade), ou None se
    não reconhecer. A chave canônica (ver `_resolve_unit`) já resolve
    singular/plural e qualificadores (ex: "colheres de chá" -> "colher_cha",
    não só "colher"), pra `rescale_quantity` conseguir reconstruir o rótulo
    certo depois de recalcular a contagem, sem perder o qualificador."""
    norm = _normalize(text)
    hint_norm = _normalize(food_hint)

    # 1) Número seguido de unidade: "150 g", "2 fatias", "1.5 xicara".
    for match in re.finditer(r"(\d+(?:[.,]\d+)?)\s*([a-z]+)", norm):
        qty = float(match.group(1).replace(",", "."))
        unit = match.group(2)
        resolved = _resolve_unit(unit, norm, match.end(), hint_norm)
        if resolved is not None:
            grams, key = resolved
            return qty, key, grams

    # 2) Quantidade por extenso seguida de unidade: "duas fatias", "meia xicara".
    tokens = norm.split()
    for i, tok in enumerate(tokens[:-1]):
        if tok in _WORD_QTY:
            unit = tokens[i + 1]
            resolved = _resolve_unit(unit, norm, None, hint_norm)
            if resolved is not None:
                grams, key = resolved
                return _WORD_QTY[tok], key, grams

    return None


def parse_portion(text: str, food_hint: str = "") -> float | None:
    """
    Devolve gramas estimadas a partir do texto, ou None se não reconhecer.
    `food_hint` (opcional) é o nome do alimento já casado, usado só para
    corrigir o peso de "unidade" quando o padrão genérico (60g) é claramente
    errado pro alimento em questão (ex: castanhas, azeitonas).
    """
    parsed = _parse_quantity_and_unit(text, food_hint)
    if parsed is None:
        return None
    qty, _unit, grams_per_unit = parsed
    return round(qty * grams_per_unit, 1)


# Rótulo (singular, plural) por CHAVE CANÔNICA (ver `_resolve_unit`), usado
# por `rescale_quantity` pra reconstruir o texto depois de recalcular a
# contagem. As três variantes de colher têm chave própria (colher_sopa/
# _cha/_sobremesa) pra não perder o qualificador no rótulo final.
_UNIT_LABELS: dict[str, tuple[str, str]] = {
    "unidade": ("unidade", "unidades"),
    "fatia": ("fatia", "fatias"),
    "pedaco": ("pedaço", "pedaços"),
    "porcao": ("porção", "porções"),
    "prato": ("prato", "pratos"),
    "bola": ("bola", "bolas"),
    "colher_sopa": ("colher de sopa", "colheres de sopa"),
    "colher_cha": ("colher de chá", "colheres de chá"),
    "colher_sobremesa": ("colher de sobremesa", "colheres de sobremesa"),
    "xicara": ("xícara", "xícaras"),
    "copo": ("copo", "copos"),
    "concha": ("concha", "conchas"),
    "pote": ("pote", "potes"),
    "punhado": ("punhado", "punhados"),
    "lata": ("lata", "latas"),
}

# Unidades "de gente": não faz sentido meia unidade (meio ovo, meia fatia),
# arredonda pra inteiro. As demais (colher, xícara, copo...) toleram meio
# (1.5 colher, meia xícara), arredonda de 0.5 em 0.5.
_WHOLE_STEP_UNITS = {"unidade", "fatia", "pedaco", "bola"}

# Unidades de peso/volume puro (não são "medida caseira" de verdade, só
# gramas/ml disfarçados), nesse caso não há o que preservar além do número.
_WEIGHT_UNITS = {"g", "kg", "ml", "l"}


def _round_plain_grams(grams: float) -> float:
    return max(5.0, round(grams / 5) * 5)


# Crescimento máximo (fator sobre o que já tinha) permitido numa única
# correção de quantidade. "Discreto" (ovo, fatia, pedaço, bola) é mais
# conservador que "contínuo" (colher, xícara, copo...) porque colher/xícara a
# mais é discreto de servir, unidade inteira a mais de um alimento grande
# (ovo, banana) muda a refeição de forma mais perceptível.
_DISCRETE_GROWTH_CAP = 2.0
_CONTINUOUS_GROWTH_CAP = 2.5

# Teto ABSOLUTO de bom senso (em GRAMAS, não em unidades) pra um alimento
# discreto contável. É em gramas, não numa contagem fixa de unidades, de
# propósito: 200g são só ~4 ovos (muito) mas são só ~40 uvas (nada de mais),
# o mesmo teto em unidades seria um exagero pra um alimento pequeno e
# arbitrário pra um grande. Só entra em jogo quando o dobro (growth cap)
# ainda ultrapassaria esse bom senso (ex: ovo, banana); pra alimentos
# pequenos por unidade (uva, castanha, azeitona) o growth cap sozinho já é
# mais restritivo que este teto, então ele nunca chega a limitar.
_DISCRETE_GRAMS_CEILING = 200.0

# Colher de sopa/chá/sobremesa, da maior pra menor: usado só pra ESCOLHER o
# tamanho de colher certo (ver _best_spoon), nunca pra virar unidade de
# menu geral.
_SPOON_SIZES = [("colher_sopa", 15.0), ("colher_sobremesa", 10.0), ("colher_cha", 5.0)]
_COLHER_KEYS = {"colher_sopa", "colher_sobremesa", "colher_cha"}


def _cap_growth(original_grams: float, target_grams: float, factor: float) -> float:
    """Só capa CRESCIMENTO (nunca mais que `factor`x o que já tinha); encolher
    (`target_grams` menor que o original) é sempre permitido livremente."""
    if target_grams <= original_grams:
        return target_grams
    return min(target_grams, original_grams * factor)


def _best_spoon(target_grams: float) -> tuple[float, float, str]:
    """
    Escolhe o tamanho de colher (sopa/sobremesa/chá) cujo múltiplo INTEIRO
    mais perto bate `target_grams`, pra nunca precisar de fração ("0,5 colher
    de sopa" não é algo que alguém mede na prática), preferindo a colher
    maior em caso de empate (menos colheres pra descrever a mesma
    quantidade). Devolve (gramas_finais, contagem, chave_canônica).
    """
    best: tuple[float, float, float, str] | None = None  # (erro, gramas, contagem, chave)
    for key, size in _SPOON_SIZES:
        count = max(1.0, round(target_grams / size))
        actual = count * size
        err = abs(actual - target_grams)
        if best is None or err < best[0] - 1e-9:
            best = (err, actual, count, key)
    _, actual, count, key = best
    return actual, count, key


def rescale_quantity(text: str, target_grams: float, food_hint: str = "") -> tuple[float, str]:
    """
    Recalcula a quantidade depois de escalar um alimento (ver
    diet_engine._scale_food, chamado toda vez que uma refeição é reescalada,
    na geração e na substituição), preservando a MEDIDA CASEIRA original em
    vez de descartá-la e só devolver gramas cruas ("339g"). Devolve
    (gramas_finais, rótulo_pronto).

    - Colher (sopa/chá/sobremesa): nunca fração ("0,5 colher de sopa" não dá
      pra medir), troca pro tamanho de colher que bate um número inteiro (ver
      _best_spoon), crescimento capado em `_CONTINUOUS_GROWTH_CAP`.
    - Unidade/fatia/pedaço/bola (discretos, "de gente"): crescimento capado
      em `_DISCRETE_GROWTH_CAP`, E nunca além do teto absoluto de bom senso
      em GRAMAS (`_DISCRETE_GRAMS_CEILING`), não em contagem fixa, pra não
      tratar "10 uvas" como exagero do mesmo jeito que "10 ovos" (ver
      docstring da constante).
    - Demais medidas (xícara, copo, concha, pote...): toleram meio-a-meio
      (0.5 em 0.5, "meia xícara" é normal), crescimento capado em
      `_CONTINUOUS_GROWTH_CAP`.
    - Sem medida caseira reconhecida (só gramas): arredonda pro múltiplo de 5
      mais próximo.
    """
    parsed = _parse_quantity_and_unit(text, food_hint)
    if parsed is None:
        grams = _round_plain_grams(target_grams)
        return grams, f"{round(grams)}g"

    qty, unit, grams_per_unit = parsed
    if unit in _WEIGHT_UNITS or grams_per_unit <= 0:
        grams = _round_plain_grams(target_grams)
        return grams, f"{round(grams)}g"

    original_grams = qty * grams_per_unit

    if unit in _COLHER_KEYS:
        capped_grams = _cap_growth(original_grams, target_grams, _CONTINUOUS_GROWTH_CAP)
        final_grams, count, label_unit = _best_spoon(capped_grams)
    elif unit in _WHOLE_STEP_UNITS:
        ceiling = max(original_grams, _DISCRETE_GRAMS_CEILING)  # nunca reduz por causa do teto
        capped_grams = min(_cap_growth(original_grams, target_grams, _DISCRETE_GROWTH_CAP), ceiling)
        count = max(1.0, round(capped_grams / grams_per_unit))
        final_grams = round(count * grams_per_unit, 1)
        label_unit = unit
    else:
        capped_grams = _cap_growth(original_grams, target_grams, _CONTINUOUS_GROWTH_CAP)
        count = max(0.5, round((capped_grams / grams_per_unit) / 0.5) * 0.5)
        final_grams = round(count * grams_per_unit, 1)
        label_unit = unit

    singular, plural = _UNIT_LABELS.get(label_unit, (label_unit, label_unit))
    label_word = singular if count == 1 else plural
    count_str = str(int(count)) if float(count).is_integer() else str(count).replace(".", ",")
    return final_grams, f"{count_str} {label_word} ({round(final_grams)}g)"


_WEIGHT_UNIT_KEYS = {
    "g": "g", "grama": "g", "gramas": "g",
    "kg": "kg", "quilo": "kg", "quilos": "kg",
    "ml": "ml", "mililitro": "ml", "mililitros": "ml",
    "l": "l", "litro": "l", "litros": "l",
}

# Chave canônica (singular) das demais medidas de _UNIT_GRAMS, pra
# `_UNIT_LABELS` não precisar listar as variantes plurais também.
_GENERIC_UNIT_KEYS = {
    "concha": "concha", "conchas": "concha",
    "xicara": "xicara", "xicaras": "xicara",
    "copo": "copo", "copos": "copo",
    "pote": "pote", "potes": "pote",
    "punhado": "punhado", "punhados": "punhado",
    "lata": "lata", "latas": "lata",
}


def _resolve_unit(unit: str, full_norm: str, after_index: int | None, hint_norm: str = "") -> tuple[float, str] | None:
    """(gramas por unidade, CHAVE CANÔNICA), ou None se a unidade não for
    reconhecida (ou, no caso de unidade/fatia/pedaço/porção/prato/bola, se o
    alimento em questão não estiver na tabela própria, ver docstrings das
    tabelas acima). A chave canônica resolve singular/plural E, no caso de
    colher, o qualificador (chá/sobremesa/sopa), pra `rescale_quantity`
    conseguir reconstruir o rótulo certo depois de recalcular a contagem."""
    combined = f"{full_norm} {hint_norm}"

    if unit in ("unidade", "unidades", "un", "und"):
        g = _match_keyword_table(combined, _UNIT_OVERRIDE_BY_FOOD)
        return (g, "unidade") if g is not None else None
    if unit in ("fatia", "fatias"):
        g = _match_keyword_table(combined, _FATIA_OVERRIDE)
        return (g, "fatia") if g is not None else None
    if unit in ("pedaco", "pedacos"):
        g = _match_keyword_table(combined, _PEDACO_OVERRIDE)
        return (g, "pedaco") if g is not None else None
    if unit in ("porcao", "porcoes"):
        g = _match_keyword_table(combined, _PORCAO_OVERRIDE)
        return (g, "porcao") if g is not None else None
    if unit in ("prato", "pratos"):
        g = _match_keyword_table(combined, _PRATO_OVERRIDE)
        return (g, "prato") if g is not None else None
    if unit in ("bola", "bolas"):
        # "Bola" sozinha (sorvete) tem peso próprio; "bola de carne"
        # (almôndega) é resolvida como 1 unidade de almôndega, não sorvete.
        if re.search(r"\bsorvete\b", combined):
            return 60.0, "bola"
        g = _match_keyword_table(combined, _UNIT_OVERRIDE_BY_FOOD)
        return (g, "bola") if g is not None else None

    if unit in _WEIGHT_UNIT_KEYS:
        return _UNIT_GRAMS[unit], _WEIGHT_UNIT_KEYS[unit]

    if unit not in _UNIT_GRAMS:
        return None
    if unit.startswith("colher"):
        # Procura o qualificador (chá/sobremesa/sopa) logo após a unidade.
        tail = full_norm[after_index:] if after_index is not None else full_norm
        for qualifier, grams in _SPOON_OVERRIDE.items():
            if qualifier in tail:
                return grams, f"colher_{qualifier}"
        return _UNIT_GRAMS[unit], "colher_sopa"  # colher de sopa por padrão
    return _UNIT_GRAMS[unit], _GENERIC_UNIT_KEYS.get(unit, unit)
