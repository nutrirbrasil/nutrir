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


def parse_portion(text: str, food_hint: str = "") -> float | None:
    """
    Devolve gramas estimadas a partir do texto, ou None se não reconhecer.
    `food_hint` (opcional) é o nome do alimento já casado, usado só para
    corrigir o peso de "unidade" quando o padrão genérico (60g) é claramente
    errado pro alimento em questão (ex: castanhas, azeitonas).
    """
    norm = _normalize(text)
    hint_norm = _normalize(food_hint)

    # 1) Número seguido de unidade: "150 g", "2 fatias", "1.5 xicara".
    for match in re.finditer(r"(\d+(?:[.,]\d+)?)\s*([a-z]+)", norm):
        qty = float(match.group(1).replace(",", "."))
        unit = match.group(2)
        grams = _unit_to_grams(unit, norm, match.end(), hint_norm)
        if grams is not None:
            return round(qty * grams, 1)

    # 2) Quantidade por extenso seguida de unidade: "duas fatias", "meia xicara".
    tokens = norm.split()
    for i, tok in enumerate(tokens[:-1]):
        if tok in _WORD_QTY:
            unit = tokens[i + 1]
            grams = _unit_to_grams(unit, norm, None, hint_norm)
            if grams is not None:
                return round(_WORD_QTY[tok] * grams, 1)

    return None


def _unit_to_grams(unit: str, full_norm: str, after_index: int | None, hint_norm: str = "") -> float | None:
    combined = f"{full_norm} {hint_norm}"

    # "Unidade", "fatia", "pedaço" e "porção" não têm peso genérico, cada
    # alimento tem o seu (uma castanha e uma manga não pesam nada parecido).
    # Só resolvem se o alimento em questão estiver mapeado na tabela própria;
    # senão devolvem None e o chamador decide outro jeito de estimar.
    if unit in ("unidade", "unidades", "un", "und"):
        return _match_keyword_table(combined, _UNIT_OVERRIDE_BY_FOOD)
    if unit in ("fatia", "fatias"):
        return _match_keyword_table(combined, _FATIA_OVERRIDE)
    if unit in ("pedaco", "pedacos"):
        return _match_keyword_table(combined, _PEDACO_OVERRIDE)
    if unit in ("porcao", "porcoes"):
        return _match_keyword_table(combined, _PORCAO_OVERRIDE)
    if unit in ("prato", "pratos"):
        return _match_keyword_table(combined, _PRATO_OVERRIDE)
    if unit in ("bola", "bolas"):
        # "Bola" sozinha (sorvete) tem peso próprio; "bola de carne"
        # (almôndega) é resolvida como 1 unidade de almôndega, não sorvete.
        if re.search(r"\bsorvete\b", combined):
            return 60.0
        return _match_keyword_table(combined, _UNIT_OVERRIDE_BY_FOOD)

    if unit not in _UNIT_GRAMS:
        return None
    if unit.startswith("colher"):
        # Procura o qualificador (chá/sobremesa/sopa) logo após a unidade.
        tail = full_norm[after_index:] if after_index is not None else full_norm
        for qualifier, grams in _SPOON_OVERRIDE.items():
            if qualifier in tail:
                return grams
        return _UNIT_GRAMS[unit]  # colher de sopa por padrão
    return _UNIT_GRAMS[unit]
