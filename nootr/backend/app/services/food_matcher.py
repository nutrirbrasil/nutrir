"""
Casa uma descrição em texto livre (ex: "comi um hambúrguer") com um alimento
e devolve as macros estimadas.

A TACO é uma tabela de alimentos in natura/preparações caseiras — não cobre
itens de rede de fast-food/industrializados. Por isso mantemos uma tabela de
itens comuns fora do plano (`_COMMON_FOODS`, valores por porção típica) que é
consultada antes da TACO. Quando nada bate, caímos para uma estimativa
genérica ancorada na refeição original, para nunca travar o fluxo.
"""
import re
import unicodedata
from dataclasses import dataclass

from backend.app.data.taco import TacoFood, load_taco_foods
from backend.app.services.nutrition import scale_food
from backend.app.services.portion import parse_portion
from backend.app.services.portion import _WORD_QTY  # reuso das quantidades por extenso

# nome (normalizado) -> (kcal, protein_g, carbs_g, fat_g) por PORÇÃO típica (não por 100g).
# Itens de fast-food/lanche/industrializados que a TACO não cobre bem.
_COMMON_FOODS: dict[str, tuple[float, float, float, float]] = {
    # lanches / fast-food
    "cheeseburger": (520, 26, 36, 28),
    "x tudo": (700, 35, 45, 42),
    "x salada": (480, 24, 35, 26),
    "x burguer": (450, 22, 35, 24),
    "hamburguer": (450, 22, 35, 24),
    "cachorro quente": (300, 11, 32, 14),
    "hot dog": (300, 11, 32, 14),
    "hotdog": (300, 11, 32, 14),
    "misto quente": (300, 14, 28, 15),
    "sanduiche natural": (250, 12, 30, 8),
    "pizza": (280, 12, 33, 11),          # por fatia
    "batata frita": (330, 4, 42, 16),    # porção média
    "nuggets": (280, 14, 18, 17),        # ~6 unidades
    "lasanha": (400, 20, 35, 20),        # porção
    "macarronada": (400, 12, 60, 12),
    "macarrao": (400, 12, 60, 12),
    "feijoada": (500, 28, 30, 28),
    "strogonoff": (400, 25, 18, 25),
    "tapioca": (200, 4, 40, 3),
    "crepe": (350, 12, 30, 18),
    "temaki": (350, 15, 45, 12),
    "sushi": (45, 2, 7, 1),              # por peça
    # salgados
    "pao de queijo": (110, 3, 10, 6),    # unidade
    "coxinha": (250, 9, 22, 14),
    "quibe": (200, 9, 12, 12),
    "esfiha": (180, 8, 20, 7),
    "esfirra": (180, 8, 20, 7),
    "pastel": (280, 7, 25, 17),
    "empada": (280, 6, 24, 17),
    "pao frances": (150, 5, 30, 1),
    # doces / sobremesas
    "sorvete": (220, 4, 28, 10),         # 2 bolas
    "milkshake": (450, 9, 68, 15),
    "chocolate": (260, 3, 28, 15),       # barra ~50g
    "brigadeiro": (90, 1, 12, 4),
    "bolo": (300, 4, 45, 12),            # fatia
    "torta": (300, 8, 30, 17),           # fatia
    "brownie": (240, 3, 30, 12),
    "donut": (250, 4, 30, 13),
    "waffle": (300, 6, 40, 13),
    "panqueca": (250, 8, 30, 11),
    "biscoito recheado": (150, 2, 22, 6),
    # bebidas / snacks
    "refrigerante": (140, 0, 36, 0),     # lata 350ml
    "suco": (120, 0, 30, 0),             # copo
    "cerveja": (150, 1, 12, 0),          # lata 350ml
    "salgadinho": (150, 2, 16, 9),
    "pipoca": (120, 2, 15, 6),
    "acai": (400, 3, 60, 16),            # tigela média com acompanhamentos
}

# Preparações preferidas / evitadas ao desempatar resultados da TACO quando a
# consulta NÃO especifica o preparo (ex: "frango" deve preferir cozido a frito).
_PREP_PREFERRED = {
    "cozido", "cozida", "grelhado", "grelhada", "assado", "assada",
    "cru", "crua", "natural", "refogado", "refogada",
}
_PREP_DISFAVORED = {
    "frito", "frita", "fritas", "conserva", "salgada", "salgado",
    "torrada", "torrado", "defumado", "defumada",
}
# Miúdos/vísceras: raramente o que a pessoa quer dizer com o nome genérico do
# animal (ex: "frango" != "coração de frango"). Só penaliza se a query não citar.
_OFFAL = {
    "coracao", "figado", "moela", "miolo", "miolos", "lingua",
    "rim", "rins", "bucho", "sangue", "tripa", "dobradinha",
}


@dataclass
class MatchResult:
    name: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    grams: float | None
    source: str  # "common" | "taco" | "estimate"
    confidence: str  # "alta" | "media" | "baixa"


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9 ]", " ", text)


def tokens(text: str) -> set[str]:
    return {t for t in normalize(text).split() if len(t) > 2}


def score_match(query_tokens: set[str], candidate_norm: str) -> int:
    """Pontuação simples (usada também pelo diet_engine): contagem de tokens que batem."""
    candidate_tokens = set(candidate_norm.split())
    return sum(1 for t in query_tokens if t in candidate_tokens or any(t in c for c in candidate_tokens))


def _rank_key(query_tokens: set[str], food: TacoFood) -> tuple:
    """
    Chave de ordenação (maior = melhor via negação nos desempates).
    - match: tokens exatos valem o dobro de tokens por substring;
    - preparo: preferido > neutro > evitado (só quando a query não cita preparo);
    - especificidade: nomes mais curtos (menos palavras) ganham;
    - estável por id.
    """
    cand_words = normalize(food.name).split()
    cand_tokens = set(cand_words)
    exact = sum(1 for t in query_tokens if t in cand_tokens)
    partial = sum(1 for t in query_tokens if t not in cand_tokens and any(t in c for c in cand_tokens))
    match_score = exact * 2 + partial

    # O ingrediente principal da TACO é a primeira palavra do nome. Se ela está
    # na query, é forte sinal de que é o alimento em si (ex: "Frango, peito...")
    # e não um derivado que apenas cita o ingrediente ("Linguiça, frango...").
    head_match = 1 if cand_words and cand_words[0] in query_tokens else 0

    query_specifies_prep = bool(query_tokens & (_PREP_PREFERRED | _PREP_DISFAVORED))
    if query_specifies_prep:
        prep_rank = 0
    elif cand_tokens & _PREP_DISFAVORED:
        prep_rank = 2
    elif cand_tokens & _PREP_PREFERRED:
        prep_rank = 0
    else:
        prep_rank = 1

    # Miúdos são fortemente despreferidos como default do nome genérico do animal.
    offal_penalty = 1 if (cand_tokens & _OFFAL) and not (query_tokens & _OFFAL) else 0

    # Ordena por: match desc, ingrediente-principal, sem-miúdo, preparo asc,
    # nº de palavras asc, id asc.
    return (match_score, head_match, -offal_penalty, -prep_rank, -len(cand_tokens), -food.id)


def search_taco(query: str, limit: int = 5) -> list[TacoFood]:
    query_tokens = tokens(query)
    if not query_tokens:
        return []
    scored = [
        (_rank_key(query_tokens, food), food)
        for food in load_taco_foods()
        if score_match(query_tokens, normalize(food.name)) > 0
    ]
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [food for _, food in scored[:limit]]


def _match_common(query: str) -> tuple[str, tuple[float, float, float, float], float] | None:
    """Devolve (nome, macros_por_porção, quantidade) do item comum encontrado."""
    query_norm = normalize(query)
    # Checa chaves mais específicas (mais longas) primeiro para evitar que uma
    # chave curta "roube" o match de uma composta (ex: "x tudo" vs "x salada").
    for name in sorted(_COMMON_FOODS, key=len, reverse=True):
        if name in query_norm:
            return name, _COMMON_FOODS[name], _extract_count(query_norm, name)
    return None


def _extract_count(query_norm: str, name: str) -> float:
    """Quantidade que precede o nome do item comum (ex: '3 coxinhas' -> 3). Padrão 1."""
    toks = query_norm.split()
    first = name.split()[0]
    # Casa singular/plural: "coxinhas" começa com "coxinha".
    idx = next((i for i, t in enumerate(toks) if t == first or t.startswith(first)), None)
    if idx is None:
        return 1.0
    for j in range(idx - 1, max(-1, idx - 4), -1):
        tok = toks[j]
        if re.fullmatch(r"\d+", tok):
            return min(float(tok), 10.0)  # limita para evitar exageros de parsing
        if tok in _WORD_QTY:
            return float(_WORD_QTY[tok])
    return 1.0


def find_food(description: str, anchor_kcal: float | None = None) -> MatchResult:
    """
    Estima as macros do alimento descrito.
    `anchor_kcal`, quando informado, ancora a quantidade (gramas) de itens da
    TACO à refeição sendo substituída, na ausência de porção explícita no texto.
    """
    common = _match_common(description)
    if common:
        name, (kcal, protein, carbs, fat), count = common
        return MatchResult(
            name=name.capitalize(),
            calories=round(kcal * count, 1), protein_g=round(protein * count, 1),
            carbs_g=round(carbs * count, 1), fat_g=round(fat * count, 1),
            grams=None, source="common", confidence="alta",
        )

    matches = search_taco(description, limit=1)
    if matches:
        food = matches[0]
        parsed_grams = parse_portion(description)
        if parsed_grams is not None:
            grams = parsed_grams
        elif anchor_kcal and food.kcal:
            grams = max(30.0, min(600.0, anchor_kcal / food.kcal * 100))
        else:
            grams = 150.0
        scaled = scale_food(food, grams)
        return MatchResult(
            name=food.name, calories=scaled["calories"], protein_g=scaled["protein_g"],
            carbs_g=scaled["carbs_g"], fat_g=scaled["fat_g"], grams=grams,
            source="taco", confidence="alta" if len(tokens(description)) > 1 else "media",
        )

    # Nenhuma correspondência: estimativa genérica ancorada na refeição original.
    kcal = anchor_kcal or 500.0
    return MatchResult(
        name=description.strip().capitalize(), calories=round(kcal, 1),
        protein_g=round(kcal * 0.15 / 4, 1), carbs_g=round(kcal * 0.5 / 4, 1),
        fat_g=round(kcal * 0.35 / 9, 1), grams=None, source="estimate", confidence="baixa",
    )


def food_from_taco_id(
    taco_id: int, grams: float | None = None, anchor_kcal: float | None = None
) -> MatchResult | None:
    """
    Constrói um MatchResult a partir de um id explícito da TACO — usado quando o
    usuário escolhe manualmente o alimento (item de alta confiança por definição).
    """
    food = next((f for f in load_taco_foods() if f.id == taco_id), None)
    if food is None:
        return None
    if grams is None:
        grams = (
            max(30.0, min(600.0, anchor_kcal / food.kcal * 100))
            if anchor_kcal and food.kcal
            else 150.0
        )
    scaled = scale_food(food, grams)
    return MatchResult(
        name=food.name, calories=scaled["calories"], protein_g=scaled["protein_g"],
        carbs_g=scaled["carbs_g"], fat_g=scaled["fat_g"], grams=grams,
        source="taco", confidence="alta",
    )


def best_available_substitute(available_foods: list[str], target_kcal: float) -> MatchResult:
    """Entre os alimentos disponíveis, escolhe o mais próximo em calorias do item que falta."""
    candidates = [find_food(name, anchor_kcal=target_kcal) for name in available_foods]
    return min(candidates, key=lambda c: abs(c.calories - target_kcal))
