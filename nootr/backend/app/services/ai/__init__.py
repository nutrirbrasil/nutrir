"""
Camada de IA do Nootr — interpretação de refeição em linguagem natural.

Contrato deliberadamente mínimo e portável: a IA recebe um texto livre
("comi um pão com dois ovos e um café") e devolve APENAS uma lista de
itens estruturados [{"name", "quantity"}]. Todo o resto (casar com a TACO,
calcular macros) fica no nosso código, não no provedor.

Por isso trocar de provedor (Gemini -> Claude) é reescrever só um arquivo
(`gemini.py` -> `claude.py`) e mudar `IA_PROVIDER` no .env.
"""
from backend.app.config import get_settings


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


def parse_meal(text: str) -> list[dict]:
    """Devolve [{"name": str, "quantity": str}] a partir do texto livre."""
    return _provider().parse_meal(text)


def converse_meal(history: list[dict], preferences: dict | None = None) -> dict:
    """
    Turno conversacional: a IA pode devolver uma pergunta de esclarecimento
    (quantidade ambígua, ou "caseiro / marca / lanchonete local") em vez de
    fechar a lista de itens direto. Devolve:
      {"needs_question": bool, "question": str, "items": [{"name","quantity"}]}
    `history` é uma lista de turnos [{"role": "user"|"assistant", "text": str}].
    """
    return _provider().converse_meal(history, preferences or {})


def parse_diet(text: str) -> list[dict]:
    """Interpreta uma dieta inteira colada em texto -> [{meal, time, foods:[{name, quantity}]}]."""
    return _provider().parse_diet(text)


def parse_diet_document(text: str) -> dict:
    """
    Interpreta o texto extraído de um PDF de dieta (montada por nutricionista):
    os cardápios do documento (normalmente um só; às vezes mais de um, ex:
    "dia de treino"/"dia de descanso"), o contexto do paciente que o documento
    carregar — alergias/restrições, substituições sugeridas pela nutricionista,
    alimentos que o paciente gosta/não gosta — e as metas nutricionais diárias,
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


def suggest_wildcard(meal_name: str, current_foods: list[str], gap_macro: str, pantry: list[str]) -> str | None:
    """
    Depois de repor o alimento em falta, se a refeição ainda ficar bem abaixo
    do que o alimento original contribuía num macro (proteína/gordura/carboidrato),
    pergunta pra IA se algum item da despensa combina com o resto da refeição e
    cobre essa lacuna — sem forçar uma combinação que não faça sentido. NÃO
    bloqueia: se a IA falhar ou não houver despensa, devolve None e o app segue
    só com o rebalanceamento normal.
    """
    if not pantry:
        return None
    try:
        return _provider().suggest_wildcard(meal_name, current_foods, gap_macro, pantry)
    except AIError:
        return None
