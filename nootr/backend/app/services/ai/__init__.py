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
    meal_targets: list[dict], carbs_g: float, fat_g: float,
    preferences: dict, country: str,
) -> dict:
    """
    Gera uma dieta básica de um dia batendo, refeição por refeição, os alvos
    de calorias/proteína em `meal_targets` (ver services/meal_planning.
    meal_plan_targets, calculado no nosso código, não pela IA, pra garantir
    almoço/jantar com 25-35% do dia cada e as demais refeições com no mínimo
    10%, todas com proteína). Sempre passa por revisão de um nutricionista
    parceiro antes de chegar ao usuário (fila em /aprovar, ver POST
    /nootr/diets/generate), por isso não precisa ser sofisticada, só
    coerente, balanceada e segura (nunca inclui alergia, reforçado no prompt
    e checado de novo, de forma determinística, em
    food_matcher.matches_allergen). Devolve {"meals": [{"meal","time","foods":[{"name","quantity"}]}]}.
    """
    return _provider().generate_diet(meal_targets, carbs_g, fat_g, preferences, country)


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
    missing_food: str = "",
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

    `missing_food`: nome do alimento que a pessoa acabou de dizer que está em
    falta AGORA (achado testando ao vivo: sem isso, o coringa podia sugerir de
    volta o MESMO alimento que faltou, ex: "estou sem peito de frango" ->
    coringa sugere "peito de frango" da despensa geral, porque a despensa
    ("costumo ter em casa") é uma lista separada e não diz nada sobre hoje).
    """
    preferences = preferences or {}
    if not preferences.get("pantry"):
        return None
    try:
        return _provider().suggest_wildcard(meal_name, current_foods, gap_macro, preferences, missing_food)
    except AIError:
        return None


def suggest_day_topup(
    pending_meals: list[dict], gap_calories: float, gap_protein: float, gap_fat: float = 0.0,
    near_ceiling_foods: list[str] | None = None, protein_poor_meals: list[str] | None = None,
    preferences: dict | None = None,
) -> dict | None:
    """
    Quando só escalar as quantidades das refeições seguintes não é (ou não
    seria de forma realista, ver `near_ceiling_foods`/`protein_poor_meals`)
    suficiente pra bater a meta do dia depois de um desvio, pergunta pra IA
    se dá pra fechar mais a diferença ADICIONANDO alimento (nunca remove) em
    uma ou mais das refeições ainda ajustáveis, sempre com quantidades
    realistas e alimentos que combinem entre si. Devolve
    {"changes": [{"meal_name", "additions": [{"name","quantity"}]}, ...]}
    ou None (se a IA achar que nada realista resolve, ou se falhar, não
    bloqueia o resultado principal do ajuste).
    """
    try:
        return _provider().suggest_day_topup(
            pending_meals, gap_calories, gap_protein, gap_fat,
            near_ceiling_foods or [], protein_poor_meals or [], preferences or {},
        )
    except AIError:
        return None


def noo_chat(
    history: list[dict], meals: list[dict], targets: dict, current: dict,
    preferences: dict | None = None, already_eaten_names: list[str] | None = None,
) -> dict:
    """
    Um turno do Noo, o chat do Nootr: a pessoa conta o que mudou (em qualquer
    combinação de refeições) e ele devolve a resposta + as mudanças a aplicar.
    Diferente das três funções manuais, um único turno pode mexer em várias
    refeições de uma vez (ver diet_engine.apply_changes).
    `already_eaten_names`: refeições já travadas de verdade (checklist inicial
    + turnos anteriores), pra IA não sugerir mexer nelas nem perguntar de novo.
    Devolve {"reply", "changes", "already_eaten"}.
    """
    return _provider().noo_chat(history, meals, targets, current, preferences or {}, already_eaten_names or [])


def transcribe_audio(audio: bytes, mime_type: str) -> str:
    """
    Transcreve um áudio do Noo (recurso do Pro, ver
    plan_limits.NOO_AUDIO_PLANS). O texto resultante segue exatamente o mesmo
    caminho de uma mensagem digitada, o áudio não é guardado em lugar nenhum.
    """
    return _provider().transcribe_audio(audio, mime_type)


def estimate_unknown_food(name: str) -> dict | None:
    """
    Estimativa nutricional (kcal/protein/carbs/fat por 100g) via IA pra um
    alimento que a busca determinística não cobre (ver
    food_matcher.find_food, source == "estimate"). Devolve None se a IA não
    reconhecer o alimento ou falhar, nunca propaga erro (ver docstring do
    adapter), quem chama decide o fallback.
    """
    return _provider().estimate_unknown_food(name)


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
