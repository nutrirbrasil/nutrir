"""
Camada de IA do Nootr, interpretação de refeição em linguagem natural.

Contrato deliberadamente mínimo e portável: a IA recebe um texto livre
("comi um pão com dois ovos e um café") e devolve APENAS uma lista de
itens estruturados [{"name", "quantity"}]. Todo o resto (casar com a TACO,
calcular macros) fica no nosso código, não no provedor.

Por isso trocar de provedor (Gemini -> Claude) é reescrever só um arquivo
(`gemini.py` -> `claude.py`) e mudar `IA_PROVIDER` no .env.
"""
from typing import Callable

from backend.app.config import get_settings
from backend.app.data.taco import TacoFood


class AIError(RuntimeError):
    pass


def _provider():
    name = get_settings().ia_provider.lower()
    if name == "gemini":
        from backend.app.services.ai import gemini
        return gemini
    # Espaço reservado para o adapter do Claude (fase futura):
    # if name == "claude":
    #     from backend.app.services.ai import claude
    #     return claude
    raise AIError(f"Provedor de IA desconhecido: {name!r}")


def converse_meal(
    history: list[dict], meal_name: str, meal_foods: list[str], preferences: dict | None = None,
    force_finalize: bool = False, recipes: list[dict] | None = None,
) -> dict:
    """
    Turno conversacional pra registrar um DESVIO de uma refeição específica já
    planejada (`meal_name` + `meal_foods`, os nomes dos alimentos do plano). A
    IA pode devolver uma pergunta de esclarecimento em vez de fechar direto,
    a menos que `force_finalize=True` (limite de perguntas atingido), quando
    ela é instruída a fechar com a melhor estimativa em vez de insistir.
    `recipes`: receitas salvas do usuário [{"name","ingredients":[{"name","quantity"}]}]
, quando um prato citado bate com uma delas, a IA usa os ingredientes
    salvos direto, sem perguntar de novo.
    Devolve:
      {"needs_question": bool, "question": str, "question_kind": "text"|"confirm_ingredients"|"",
       "skipped_names": [str, ...],        # itens de `meal_foods` que não foram comidos
       "new_items": [{"name","quantity"}], # o que foi comido no lugar (ou a mais)
       "proposed_dish_name": str,          # nome do prato decomposto agora (pra oferecer salvar)
       "proposed_ingredients": [{"name","quantity"}]}  # ingredientes propostos/confirmados desse prato
    `history` é uma lista de turnos [{"role": "user"|"assistant", "text": str}].
    """
    return _provider().converse_meal(
        history, meal_name, meal_foods, preferences or {}, force_finalize, recipes,
    )


def parse_diet_document(text: str) -> dict:
    """
    Interpreta o texto extraído de um PDF de dieta (montada por nutricionista):
    os cardápios do documento (normalmente um só; às vezes mais de um, ex:
    "dia de treino"/"dia de descanso"), o contexto do paciente que o documento
    carregar, alergias/restrições, substituições sugeridas pela nutricionista,
    alimentos que o paciente gosta/não gosta, e as metas nutricionais diárias,
    se mencionadas (calorias totais e % ou gramas de macro). Devolve:
      {
        "menus": [{"label": str, "days": [0-6, ...] (vazio se não especificado),
                    "meals": [...]}, ...],
        "preferences": {"allergies","dislikes","likes","notes"},
        "targets": {"daily_calories","protein_pct","carbs_pct","fat_pct",
                     "protein_g","carbs_g","fat_g"},  # cada um None se não mencionado
      }
    """
    return _provider().parse_diet_document(text)


def generate_diet(
    target_calories: float, protein_g: float, carbs_g: float, fat_g: float,
    preferences: dict, country: str,
) -> dict:
    """
    Gera uma dieta básica de um dia batendo as metas informadas (Pro, ver
    POST /nootr/diets/generate), sempre passa por revisão de um
    nutricionista parceiro antes de chegar ao usuário (fila em /aprovar), por
    isso não precisa ser sofisticada, só coerente e segura (nunca inclui
    alergia, reforçado no prompt e checado de novo, de forma determinística,
    em food_matcher.matches_allergen). Devolve {"meals": [{"meal","time","foods":[{"name","quantity"}]}]}.
    """
    return _provider().generate_diet(target_calories, protein_g, carbs_g, fat_g, preferences, country)


def explain_change(context: dict) -> str:
    """
    Explicação curta e humana do ajuste feito. NÃO bloqueia: se a IA falhar,
    devolve string vazia e o app segue com o resultado numérico.
    """
    try:
        return _provider().explain_change(context)
    except AIError:
        return ""


def suggest_substitutes(missing_food: str, preferences: dict | None = None) -> list[str]:
    """
    "Buscar outros alimentos" em Estou em falta: quando nada na despensa bate
    o perfil do alimento que falta, pergunta pra IA o que pode substituí-lo
    (mesma função nutricional), respeitando alergias/preferências.
    """
    return _provider().suggest_substitutes(missing_food, preferences or {})


def suggest_wildcard(
    meal_name: str, current_foods: list[str], gap_macro: str, preferences: dict | None = None,
) -> str | None:
    """
    Depois de repor o alimento em falta, se a refeição ainda ficar bem abaixo
    do que o alimento original contribuía num macro (proteína/gordura/carboidrato),
    pergunta pra IA se algum item da despensa combina com o resto da refeição e
    cobre essa lacuna, respeitando alergias e condições médicas de `preferences`
    (a checagem de alergia é reforçada depois, de forma determinística, em
    `food_matcher.matches_allergen`, ver routes/nootr/substitutions.py). NÃO
    bloqueia: se a IA falhar ou não houver despensa, devolve None e o app segue
    só com o rebalanceamento normal.
    """
    preferences = preferences or {}
    if not preferences.get("pantry"):
        return None
    try:
        return _provider().suggest_wildcard(meal_name, current_foods, gap_macro, preferences)
    except AIError:
        return None


def suggest_day_topup(
    pending_meals: list[dict], gap_calories: float, gap_protein: float, preferences: dict | None = None,
) -> dict | None:
    """
    Quando só escalar as quantidades das refeições seguintes não é (ou não
    seria de forma realista) suficiente pra bater a meta do dia depois de um
    desvio, pergunta pra IA se dá pra fechar mais a diferença adicionando
    e/ou removendo um alimento de UMA das refeições ainda ajustáveis, sempre
    com quantidades realistas e alimentos que combinem entre si. Devolve
    {"meal_name": str, "additions": [{"name","quantity"}], "removals": [str]}
    ou None (se a IA achar que nada realista resolve, ou se falhar, não
    bloqueia o resultado principal do ajuste).
    """
    try:
        return _provider().suggest_day_topup(pending_meals, gap_calories, gap_protein, preferences or {})
    except AIError:
        return None


# Cache em memória (processo), a mesma pergunta ("esses N alimentos empatados,
# qual o mais comum nesse país?") não precisa bater na IA de novo toda vez que
# aparecer o mesmo empate (ex: "azeite" aparece várias vezes numa dieta importada).
_common_variant_cache: dict[tuple, str | None] = {}


def resolve_common_variant(query: str, candidates: list[str], country: str) -> str | None:
    """
    Quando várias opções da base batem igualmente bem numa busca sem
    qualificador (ex: "azeite" -> de oliva vs de dendê, ambos empatados),
    pergunta pra IA qual é a variedade mais comum no país do usuário. Devolve
    o texto exato de uma das `candidates`, ou None se a IA não conseguir
    decidir ou falhar, quem chamou cai de volta no desempate padrão. NÃO
    bloqueia o fluxo principal.
    """
    if len(candidates) < 2:
        return None
    key = (query.strip().lower(), tuple(sorted(candidates)), country)
    if key in _common_variant_cache:
        return _common_variant_cache[key]
    try:
        result = _provider().resolve_common_variant(query, candidates, country)
    except AIError:
        result = None
    _common_variant_cache[key] = result
    return result


def build_country_tie_resolver(country: str) -> Callable[[str, list[TacoFood]], TacoFood | None]:
    """
    Devolve uma função pronta pra passar como `tie_resolver` do food_matcher
    (`search_taco`/`find_food`): quando o matching encontra um empate de
    verdade entre variedades de um alimento, pergunta pra IA qual é a mais
    comum no `country` informado.
    """
    def resolve(query: str, tied: list[TacoFood]) -> TacoFood | None:
        names = [f.display_name for f in tied]
        choice = resolve_common_variant(query, names, country)
        if not choice:
            return None
        return next((f for f in tied if f.display_name == choice), None)
    return resolve
