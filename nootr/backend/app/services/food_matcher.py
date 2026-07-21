"""
Casa uma descrição em texto livre (ex: "comi um hambúrguer") com um alimento
e devolve as macros estimadas.

A TACO é uma tabela de alimentos in natura/preparações caseiras, não cobre
itens de rede de fast-food/industrializados. Por isso mantemos uma tabela de
itens comuns fora do plano (`_COMMON_FOODS`, valores por porção típica) que é
consultada antes da TACO. Quando nada bate, caímos para uma estimativa
genérica ancorada na refeição original, para nunca travar o fluxo.
"""
import re
import unicodedata
from dataclasses import dataclass
from typing import Callable

from backend.app.data.taco import TacoFood, load_taco_foods
from backend.app.services.nutrition import scale_food
from backend.app.services.portion import parse_portion
from backend.app.services.portion import _WORD_QTY  # reuso das quantidades por extenso

# nome (normalizado) -> (kcal, protein_g, carbs_g, fat_g, gramas_da_porcao) por
# PORÇÃO típica (não por 100g), "gramas_da_porcao" é o peso de referência
# dessa porção (comentado antes item a item), usado pra escalar quando a
# pessoa informa um peso explícito (ex: "25g de chocolate" escala a partir
# da barra de 50g, em vez de tratar o "25" como "quantas porções", ver
# find_food). Itens de fast-food/lanche/industrializados que a TACO não cobre bem.
_COMMON_FOODS: dict[str, tuple[float, float, float, float, float]] = {
    # lanches / fast-food
    "cheeseburger": (520, 26, 36, 28, 150),
    "x tudo": (700, 35, 45, 42, 350),
    "x salada": (480, 24, 35, 26, 220),
    "x burguer": (450, 22, 35, 24, 180),
    "hamburguer": (450, 22, 35, 24, 150),
    "cachorro quente": (300, 11, 32, 14, 150),
    "hot dog": (300, 11, 32, 14, 150),
    "hotdog": (300, 11, 32, 14, 150),
    "misto quente": (300, 14, 28, 15, 120),
    "sanduiche natural": (250, 12, 30, 8, 150),
    "pizza": (280, 12, 33, 11, 100),           # por fatia
    "batata frita": (330, 4, 42, 16, 150),     # porção média
    "nuggets": (280, 14, 18, 17, 100),         # ~6 unidades
    "lasanha": (400, 20, 35, 20, 350),         # porção
    "macarronada": (400, 12, 60, 12, 350),
    "macarrao": (400, 12, 60, 12, 350),
    "feijoada": (500, 28, 30, 28, 400),
    "strogonoff": (400, 25, 18, 25, 300),
    "tapioca": (200, 4, 40, 3, 150),
    "crepe": (350, 12, 30, 18, 150),
    "temaki": (350, 15, 45, 12, 180),
    "sushi": (45, 2, 7, 1, 30),                # por peça
    # salgados
    "pao de queijo": (110, 3, 10, 6, 40),      # unidade
    "coxinha": (250, 9, 22, 14, 90),
    "quibe": (200, 9, 12, 12, 70),
    "esfiha": (180, 8, 20, 7, 60),
    "esfirra": (180, 8, 20, 7, 60),
    "pastel": (280, 7, 25, 17, 90),
    "empada": (280, 6, 24, 17, 80),
    "pao frances": (150, 5, 30, 1, 50),
    # doces / sobremesas
    "sorvete": (220, 4, 28, 10, 120),          # 2 bolas
    "milkshake": (450, 9, 68, 15, 300),
    "chocolate": (260, 3, 28, 15, 50),         # barra ~50g
    "brigadeiro": (90, 1, 12, 4, 20),
    "bolo": (300, 4, 45, 12, 80),              # fatia
    "torta": (300, 8, 30, 17, 100),            # fatia
    "brownie": (240, 3, 30, 12, 60),
    "donut": (250, 4, 30, 13, 60),
    "waffle": (300, 6, 40, 13, 80),
    "panqueca": (250, 8, 30, 11, 100),
    "biscoito recheado": (150, 2, 22, 6, 30),
    # bebidas / snacks
    "refrigerante": (140, 0, 36, 0, 350),      # lata 350ml
    "suco": (120, 0, 30, 0, 200),              # copo
    "cerveja": (150, 1, 12, 0, 350),           # lata 350ml
    "salgadinho": (150, 2, 16, 9, 50),
    "pipoca": (120, 2, 15, 6, 30),
    "acai": (400, 3, 60, 16, 500),             # tigela média com acompanhamentos
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
# Sabores de chá da TACO, só desempatam a favor da variedade específica se a
# pessoa pedir de verdade (ver _is_excluded).
_TEA_FLAVORS = {"mate", "preto", "doce"}
# Variedades/qualificadores menos comuns, só fazem sentido se a pessoa pediu
# explicitamente (ex: "arroz" sozinho deve preferir tipo 1, não integral;
# "feijão" sozinho deve preferir carioca/preto, não broto/jalo/rajado).
_VARIETY_DISFAVORED = {
    "integral", "integrais", "broto", "jalo", "rajado", "roxo", "fradinho", "guandu",
    "condensado", "fermentado", "cabra", "coco", "achocolatado", "po",
    # partes de frango, sem especificar, o padrão em dieta é peito
    "coxa", "sobrecoxa", "asa",
    # "ovo" sozinho é sempre de galinha, não de codorna, e é sempre o ovo
    # inteiro, não a clara ou a gema isoladas (isso não varia por país, por
    # isso não fica pro desempate via IA).
    "codorna", "clara", "gema",
    # "mistura para X" é o produto cru/em pó pra preparar, quem fala "bolo"
    # quer dizer o bolo pronto, não a mistura em pó pra fazer um.
    "mistura",
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
    taco_id: int | None = None  # preenchido quando source == "taco"


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9 ]", " ", text)


def _singular(token: str) -> str:
    """Singularização leve PT: 'ovos'->'ovo', 'fatias'->'fatia', 'pães'->'pão' (aprox)."""
    if len(token) > 4 and token.endswith("oes"):  # ex: feijoes -> feijao
        return token[:-3] + "ao"
    if len(token) > 3 and token.endswith("s"):
        return token[:-1]
    return token


# Temperos puros (sem uso relevante como alimento por si só), se aparecerem
# JUNTO de outra palavra na busca (ex: "peito de frango com açafrão"), são
# ignorados pra não desviar o casamento pra um prato pronto que leve o mesmo
# tempero (ex: "Frango, com açafrão"). Isolados (busca só "açafrão"), continuam
# valendo normalmente.
_SEASONING_WORDS = {"acafrao", "oregano", "cominho", "canela", "louro", "colorau", "curcuma"}

# Conectores sem valor de busca, "com" em particular é perigoso: se sobrar
# sozinho na query (ex: depois de remover um tempero de "... com açafrão"),
# ele bate por acaso com qualificadores de outros alimentos (ex: "com pele").
# NÃO inclui "sem": esse carrega negação relevante (distingue "sem pele").
_STOPWORDS = {"com", "para", "por", "uma", "um", "dos", "das"}


def tokens(text: str) -> set[str]:
    toks = {_singular(t) for t in normalize(text).split() if len(t) > 2}
    toks -= _STOPWORDS
    if len(toks) > 1:
        without_seasoning = toks - _SEASONING_WORDS
        if without_seasoning:
            return without_seasoning
    return toks


_MIN_PARTIAL_LEN = 4  # abaixo disso, "cha" vira substring de "charque" à toa


def score_match(query_tokens: set[str], candidate_norm: str) -> int:
    """Pontuação simples (usada também pelo diet_engine): contagem de tokens que batem."""
    candidate_tokens = set(candidate_norm.split())
    return sum(
        1 for t in query_tokens
        if t in candidate_tokens or (len(t) >= _MIN_PARTIAL_LEN and any(t in c for c in candidate_tokens))
    )


def _rank_key(query_tokens: set[str], food: TacoFood, preferred: set[int] = frozenset()) -> tuple:
    """
    Chave de ordenação (maior = melhor via negação nos desempates).
    - preferência do usuário: se o alimento está na despensa/gosta do perfil,
      vence qualquer desempate de variedade (ex: query genérica "banana" com
      "Banana, nanica" na despensa do usuário prefere nanica a figo/prata);
    - match: tokens exatos valem o dobro de tokens por substring, considera
      tanto o nome original da TACO quanto o nome de exibição curado (um
      apelido comum, tipo "Castanha do pará", pode não bater com o nome
      científico original "Castanha-do-Brasil");
    - preparo: preferido > neutro > evitado (só quando a query não cita preparo);
    - variedade: penaliza qualificador que a pessoa não pediu (ex: "integral",
      "com pele", variedades incomuns de feijão), evita defaults arbitrários;
    - especificidade: nomes mais curtos (menos palavras) ganham;
    - estável por id.
    """
    preferred_match = 1 if food.id in preferred else 0
    name_words = normalize(food.name).split()
    display_words = normalize(food.display_name).split()
    cand_tokens = set(name_words) | set(display_words)
    exact = sum(1 for t in query_tokens if t in cand_tokens)
    partial = sum(
        1 for t in query_tokens
        if t not in cand_tokens and len(t) >= _MIN_PARTIAL_LEN and any(t in c for c in cand_tokens)
    )
    match_score = exact * 2 + partial

    # Um candidato cujo nome de exibição é EXATAMENTE a query (nem mais, nem
    # menos palavras) é o que a pessoa quis dizer de verdade, bate acima de
    # um nome composto mais longo que só contém as mesmas palavras "no meio"
    # (ex: "fruta" deve preferir um item chamado só "Fruta" a "Fruta-pão").
    # TAMBÉM: se o nome é uma palavra só E essa palavra está na query (mesmo que
    # a query tenha mais palavras depois, como "2 frutas médias"), ganha, porque
    # a pessoa falou claramente o alimento, e a query tem só contexto extra.
    # Ignora conectores curtos ("de") na comparação, sem isso, "pão de forma"
    # nunca batia exato contra o display "Pão de forma" (a query não tem "de",
    # que é filtrado por ser palavra curta) e caía num empate de desempate por
    # id com qualquer outro "pão ... forma" que também citasse "forma".
    display_tokens_full = {w for w in display_words if len(w) > 2}
    exact_full_match = 0
    if display_tokens_full == query_tokens:
        exact_full_match = 1
    elif len(display_tokens_full) == 1 and next(iter(display_tokens_full)) in query_tokens:
        exact_full_match = 1

    # O ingrediente principal da TACO é a primeira palavra do nome ORIGINAL
    # (convenção da tabela, ex: "Frango, peito..."). Se ela está na query, é
    # forte sinal de que é o alimento em si, não um derivado que só cita o
    # ingrediente ("Linguiça, frango...").
    head_match = 1 if name_words and name_words[0] in query_tokens else 0

    query_specifies_prep = bool(query_tokens & (_PREP_PREFERRED | _PREP_DISFAVORED))
    # "Ovo" sozinho nunca quer dizer cru, é sempre cozido/mexido na dieta.
    # "cru" está em _PREP_PREFERRED pensando em vegetais/saladas; sem essa
    # exceção, "Ovo, de galinha, inteiro, cru" venceria "...cozido" por padrão.
    is_raw_egg_default = name_words[:1] == ["ovo"] and "cru" in cand_tokens
    if query_specifies_prep:
        prep_rank = 0
    elif is_raw_egg_default:
        prep_rank = 2
    elif cand_tokens & _PREP_DISFAVORED:
        prep_rank = 2
    elif cand_tokens & _PREP_PREFERRED:
        prep_rank = 0
    else:
        prep_rank = 1

    # Miúdos são fortemente despreferidos como default do nome genérico do animal.
    offal_penalty = 1 if (cand_tokens & _OFFAL) and not (query_tokens & _OFFAL) else 0

    variety_penalty = 0
    disfavored_hit = cand_tokens & _VARIETY_DISFAVORED
    # "Integral" é o padrão do LEITE no Brasil (leite integral = leite comum),
    # ao contrário de arroz/pão, onde integral é a variedade especial, não
    # penaliza esse caso específico.
    is_default_whole_milk = name_words[:1] == ["leite"] and disfavored_hit == {"integral"}
    if disfavored_hit and not (query_tokens & _VARIETY_DISFAVORED) and not is_default_whole_milk:
        variety_penalty = 1
    bigrams = set(zip(name_words, name_words[1:])) | set(zip(display_words, display_words[1:]))
    if ("com", "pele") in bigrams and "pele" not in query_tokens:
        variety_penalty = 1
    # "Frango" sem especificar a peça deve preferir peito (mais comum em
    # dieta), sem isso, "frango inteiro" venceria só por não estar na lista
    # de partes desfavorecidas (coxa/asa/sobrecoxa já são, mas "inteiro" não
    # pode ser desfavorecido de forma genérica: ovo usa "inteiro" como padrão
    # correto). Penaliza só quando o alimento é frango e nenhuma parte foi
    # pedida.
    if (
        name_words[:1] == ["frango"]
        and "inteiro" in cand_tokens
        and not (query_tokens & {"inteiro", "peito", "coxa", "sobrecoxa", "asa"})
    ):
        variety_penalty = 1
    # "Pão" sozinho não pode ser "pão de queijo", é um produto bem diferente
    # (feito de polvilho, sem glúten) que só ganhava aqui porque "assado" bate
    # em _PREP_PREFERRED (irrelevante pra pão: toda descrição de pão da TACO
    # "é assada", isso não é uma escolha de preparo real como em carnes).
    if name_words[:1] == ["pao"] and "queijo" in cand_tokens and "queijo" not in query_tokens:
        variety_penalty = 1

    # Ordena por: match desc, preferência do usuário, nome-igual-à-query,
    # ingrediente-principal, sem-miúdo, sem-variedade-não-pedida, preparo asc,
    # nº de palavras (nome original) asc, id asc.
    return (
        match_score, preferred_match, exact_full_match, head_match,
        -offal_penalty, -variety_penalty, -prep_rank, -len(name_words), -food.id,
    )


def _is_excluded(food: TacoFood, query_tokens: set[str]) -> bool:
    """
    Exclusão total (não só desempate) pra candidatos que só batem por palavras
    genéricas coincidentes, mas nunca são o que a query realmente quer dizer.
    "Cereais, mistura para vitamina, trigo, cevada e aveia" é um produto
    industrializado específico: "vitamina de frutas"/"vitamina com aveia" (a
    bebida caseira de fruta batida com leite) bate 2 palavras nele (vitamina +
    aveia) e venceria no match_score mesmo com desempate contra, só um filtro
    duro resolve. Só entra na disputa se a query citar de verdade trigo/cevada.
    """
    name_tokens = set(normalize(food.name).split())
    if {"trigo", "cevada"} <= name_tokens and not ({"trigo", "cevada"} & query_tokens):
        return True
    # "Bife à cavalo" é um prato específico (bife + ovo frito), é o ÚNICO
    # item da TACO com a palavra "bife" no nome, então sem essa exclusão ele
    # vencia SEMPRE que a pessoa dizia só "bife" (sem pedir "cavalo" de
    # verdade). Só entra na disputa se a query citar "cavalo" explicitamente;
    # caso contrário "bife" cai no sinônimo genérico de carne bovina (ver
    # search_taco), que escolhe o corte mais comum ou um favorito do usuário.
    if {"bife", "cavalo"} <= name_tokens and "cavalo" not in query_tokens:
        return True
    # A TACO só tem chá com sabor específico (mate/preto/erva-doce), nenhuma
    # tem esse sabor, então "chá" sozinho SEMPRE batia num deles à toa (o
    # primeiro por id). Sem o sabor pedido, nenhuma variedade específica entra
    # na disputa; "chá" sozinho cai no fallback sintético de 0 kcal (ver
    # find_food) em vez de uma variedade arbitrária.
    if "cha" in name_tokens and (name_tokens & _TEA_FLAVORS) and not (query_tokens & _TEA_FLAVORS):
        return True
    return False


def preferred_taco_ids(names: list[str] | None) -> set[int]:
    """
    Resolve uma lista de nomes de preferência (gosto/despensa do perfil,
    escolhidos via busca na TACO, ver /nootr/foods/search) pros taco_ids
    correspondentes. Nomes que não batem em nada são ignorados silenciosamente
    (não travam o resto do matching).
    """
    if not names:
        return set()
    ids = set()
    for name in names:
        match = search_taco(name, limit=1)
        if match:
            ids.add(match[0].id)
    return ids


def search_taco(
    query: str, limit: int = 5, preferred: set[int] = frozenset(),
    tie_resolver: Callable[[str, list[TacoFood]], TacoFood | None] | None = None,
) -> list[TacoFood]:
    """
    `tie_resolver`, se informado, é chamado quando o topo do ranking tem um
    EMPATE de verdade, mesma pontuação em tudo que reflete conhecimento real
    do alimento (match, preferência do usuário, preparo, variedade indesejada,
    miúdo, ingrediente principal), e só os critérios ESTRUTURAIS/arbitrários
    (nome mais curto, id menor) que decidiriam. Esses dois últimos não dizem
    nada sobre qual variedade é mais comum de verdade (ex: "Azeite, de oliva,
    extra virgem" perde de "Azeite, de dendê" só por ter um nome mais longo,
    o que é irrelevante), por isso são ignorados na hora de decidir se é um
    empate "de verdade". Recebe a query e os candidatos empatados, devolve
    qual usar (ou None pra manter o desempate padrão). Deixa a decisão "qual
    é a variedade mais comum" pra quem chama (normalmente perguntando pra IA,
    com o país do usuário), ver `services/ai.build_country_tie_resolver`.
    """
    query_tokens = tokens(query)
    if not query_tokens:
        return []
    # "Bife" sozinho não bate em nada além do prato "Bife à cavalo" (excluído
    # acima quando não pedido), sem sinônimo, "bife"/"bife a role"/"bife de
    # fígado" não achariam NENHUM corte de carne bovina genérico. Com "carne"
    # embutido, cai no mesmo ranking de "carne" (favorito do usuário desempata
    # primeiro; sem favorito, o corte mais comum vence por padrão).
    if "bife" in query_tokens:
        query_tokens = query_tokens | {"carne"}
    scored = [
        (_rank_key(query_tokens, food, preferred), food)
        for food in load_taco_foods()
        if score_match(query_tokens, normalize(food.name)) > 0 and not _is_excluded(food, query_tokens)
    ]
    scored.sort(key=lambda pair: pair[0], reverse=True)

    if tie_resolver and len(scored) > 1:
        top_key = scored[0][0]
        tied = [food for key, food in scored if key[:-2] == top_key[:-2]]
        if len(tied) > 1:
            chosen = tie_resolver(query, tied)
            if chosen is not None and chosen.id != scored[0][1].id:
                scored = [pair for pair in scored if pair[1].id != chosen.id]
                scored.insert(0, (top_key, chosen))

    return [food for _, food in scored[:limit]]


def _match_common(query: str) -> tuple[str, tuple[float, float, float, float, float], float] | None:
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


def find_food(
    description: str, anchor_kcal: float | None = None, preferred: set[int] = frozenset(),
    tie_resolver: Callable[[str, list[TacoFood]], TacoFood | None] | None = None,
) -> MatchResult:
    """
    Estima as macros do alimento descrito.
    `anchor_kcal`, quando informado, ancora a quantidade (gramas) de itens da
    TACO à refeição sendo substituída, na ausência de porção explícita no texto.
    `preferred`: taco_ids da despensa/gosta do usuário (ver preferred_taco_ids)
, desempata a favor do que a pessoa já tem/gosta. `tie_resolver`: ver
    search_taco, desempata empates de verdade (ex: "azeite" -> pergunta pra
    IA se é o de oliva ou de dendê, considerando o país do usuário).
    """
    common = _match_common(description)
    if common:
        name, (kcal, protein, carbs, fat, default_grams), count = common
        # Peso explícito (ex: "25g de chocolate") escala proporcionalmente a
        # partir da porção de referência, em vez de contar como "quantas
        # porções", sem isso "25 g" era lido como o número "25" precedendo o
        # nome e virava um multiplicador (25 porções, capado em 10).
        explicit_grams = parse_portion(description)
        if explicit_grams is not None:
            factor = explicit_grams / default_grams
            grams = round(explicit_grams, 1)
        else:
            factor = count
            grams = round(default_grams * count, 1)
        return MatchResult(
            name=name.capitalize(),
            calories=round(kcal * factor, 1), protein_g=round(protein * factor, 1),
            carbs_g=round(carbs * factor, 1), fat_g=round(fat * factor, 1),
            grams=grams, source="common", confidence="alta",
        )

    matches = search_taco(description, limit=1, preferred=preferred, tie_resolver=tie_resolver)
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
            name=scaled["name"], calories=scaled["calories"], protein_g=scaled["protein_g"],
            carbs_g=scaled["carbs_g"], fat_g=scaled["fat_g"], grams=grams,
            source="taco", confidence="alta" if len(tokens(description)) > 1 else "media",
            taco_id=food.id,
        )

    # Nenhuma correspondência: estimativa genérica ancorada na refeição original.
    kcal = anchor_kcal or 500.0
    return MatchResult(
        name=description.strip().capitalize(), calories=round(kcal, 1),
        protein_g=round(kcal * 0.15 / 4, 1), carbs_g=round(kcal * 0.5 / 4, 1),
        fat_g=round(kcal * 0.35 / 9, 1), grams=None, source="estimate", confidence="baixa",
    )


_PROFILE_DOMINANCE = 0.4  # macro precisa ser >=40% das calorias pra "dominar" o perfil


def macro_profile(calories: float, protein_g: float, carbs_g: float, fat_g: float) -> str:
    """
    Classifica um alimento pelo macro que domina suas calorias: 'protein' |
    'carb' | 'fat' | 'balanced' (nenhum domina, ex: prato misto). Usado em
    "Estou em falta" pra filtrar a despensa por itens do mesmo "papel" na
    refeição (ex: arroz em falta -> sugere outros carboidratos da despensa).
    """
    if calories <= 0:
        return "balanced"
    shares = {
        "protein": protein_g * 4 / calories,
        "carb": carbs_g * 4 / calories,
        "fat": fat_g * 9 / calories,
    }
    macro, share = max(shares.items(), key=lambda kv: kv[1])
    return macro if share >= _PROFILE_DOMINANCE else "balanced"


def matches_allergen(food_name: str, allergies: list[str]) -> bool:
    """
    Checagem determinística (não depende da IA seguir a instrução do prompt)
    aplicada como última barreira antes de qualquer sugestão AUTOMÁTICA da IA
    (coringa, ajuste de fim de dia, "buscar outros alimentos") chegar no
    usuário, substituição manual não passa por aqui, é escolha da própria
    pessoa. É um match por substring no nome (normalizado, sem acento) contra
    cada alergia cadastrada: cobre o caso comum da TACO nomear o alimento a
    partir do ingrediente-base (ex: alergia "amendoim" bate em "Amendoim,
    torrado" e "Paçoca, amendoim, doce"), mas NÃO é uma base de dados de
    alérgenos/derivados, produtos industrializados que não citam o
    ingrediente no nome, ou reações cruzadas, não são cobertos.
    """
    if not allergies:
        return False
    name_norm = normalize(food_name)
    return any(normalize(a) in name_norm for a in allergies if a.strip())
