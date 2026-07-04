"""
Interpreta porções em texto livre em português e devolve uma estimativa em
gramas. A TACO é por 100g, então precisamos converter "2 fatias de pão",
"1 colher de sopa de arroz", "meio prato", etc. em gramas para escalar.

Os pesos por unidade são aproximações de porções caseiras típicas — o objetivo
é uma estimativa razoável, não precisão de balança. Quando nada é reconhecido,
devolve None e o chamador decide o fallback.
"""
import re
import unicodedata


def _normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9 ]", " ", text)


# Quantidades escritas por extenso (frações e inteiros comuns).
_WORD_QTY = {
    "meia": 0.5, "meio": 0.5,
    "um": 1, "uma": 1,
    "dois": 2, "duas": 2,
    "tres": 3, "quatro": 4, "cinco": 5, "seis": 6,
    "sete": 7, "oito": 8, "nove": 9, "dez": 10,
}

# Unidade (normalizada, singular) -> gramas por unidade.
_UNIT_GRAMS = {
    "g": 1, "grama": 1, "gramas": 1,
    "kg": 1000, "quilo": 1000, "quilos": 1000,
    "ml": 1, "mililitro": 1, "mililitros": 1,  # aprox. densidade da água
    "l": 1000, "litro": 1000, "litros": 1000,
    "fatia": 25, "fatias": 25,
    "unidade": 60, "unidades": 60, "un": 60, "und": 60,
    "colher": 15, "colheres": 15,  # colher de sopa (padrão)
    "concha": 80, "conchas": 80,
    "xicara": 120, "xicaras": 120,
    "copo": 200, "copos": 200,
    "pote": 170, "potes": 170,
    "prato": 400, "pratos": 400,
    "porcao": 120, "porcoes": 120,
    "punhado": 30, "punhados": 30,
    "lata": 350, "latas": 350,
    "pedaco": 80, "pedacos": 80,
    "bola": 60, "bolas": 60,  # sorvete
    "filet": 120, "file": 120, "files": 120,
}

# Ajustes de colher por qualificador.
_SPOON_OVERRIDE = {
    "cha": 5,      # colher de chá
    "sobremesa": 10,
    "sopa": 15,
}


def parse_portion(text: str) -> float | None:
    """Devolve gramas estimadas a partir do texto, ou None se não reconhecer."""
    norm = _normalize(text)

    # 1) Número seguido de unidade: "150 g", "2 fatias", "1.5 xicara".
    for match in re.finditer(r"(\d+(?:[.,]\d+)?)\s*([a-z]+)", norm):
        qty = float(match.group(1).replace(",", "."))
        unit = match.group(2)
        grams = _unit_to_grams(unit, norm, match.end())
        if grams is not None:
            return round(qty * grams, 1)

    # 2) Quantidade por extenso seguida de unidade: "duas fatias", "meia xicara".
    tokens = norm.split()
    for i, tok in enumerate(tokens[:-1]):
        if tok in _WORD_QTY:
            unit = tokens[i + 1]
            grams = _unit_to_grams(unit, norm, None)
            if grams is not None:
                return round(_WORD_QTY[tok] * grams, 1)

    return None


def _unit_to_grams(unit: str, full_norm: str, after_index: int | None) -> float | None:
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
