"""
Distribuição de calorias/proteína entre as refeições do dia.

Regra de negócio (pedida explicitamente): almoço e jantar concentram cada um
25-35% das calorias E da proteína do dia; as demais refeições dividem o
resto igualmente, com no mínimo 10% cada uma (de calorias e de proteína).
Usado em dois lugares:

1. `meal_plan_targets` gera o alvo NUMÉRICO por refeição pra geração de dieta
   por IA (ver services/ai/gemini.generate_diet), passar números prontos pro
   Gemini é muito mais confiável do que pedir pra ele fazer a conta de %
   sozinho, é a causa raiz de gerações desbalanceadas (ex: ceia só com doce,
   200g de frango numa única refeição).
2. `role_weights` dá o mesmo peso-alvo pro motor de substituição (ver
   diet_engine._rebalance) redistribuir favorecendo a refeição que está mais
   abaixo da própria meta, em vez de escalar todas as refeições pelo mesmo
   fator.
"""
import re

from backend.app.services.food_matcher import normalize

MAIN_MEAL_SHARE = 0.30  # ponto médio da faixa 25-35% pedida pra almoço/jantar
MAIN_MEAL_MIN_SHARE = 0.25  # extremo inferior da faixa 25-35%, piso rígido de almoço/jantar
MIN_OTHER_SHARE = 0.10  # piso de calorias/proteína por refeição que não é almoço/jantar

# Templates padrão por quantidade de refeições, nome + horário sugerido. Menos
# de 4 refeições informadas pela pessoa vira 4 mesmo assim (ver
# routes/nootr/diets.py generate_diet_route), por isso não há template < 4.
MEAL_TEMPLATES: dict[int, list[tuple[str, str]]] = {
    4: [("Café da manhã", "07:00"), ("Almoço", "12:00"), ("Lanche da tarde", "16:00"), ("Jantar", "20:00")],
    5: [
        ("Café da manhã", "07:00"), ("Lanche da manhã", "10:00"), ("Almoço", "12:30"),
        ("Lanche da tarde", "16:00"), ("Jantar", "20:00"),
    ],
    6: [
        ("Café da manhã", "07:00"), ("Lanche da manhã", "10:00"), ("Almoço", "12:30"),
        ("Lanche da tarde", "16:00"), ("Jantar", "20:00"), ("Ceia", "22:00"),
    ],
}
_MAX_TEMPLATE_COUNT = max(MEAL_TEMPLATES)


def meal_template(count: int) -> list[tuple[str, str]]:
    """Nomes + horários padrão pra `count` refeições (mínimo 4, ver docstring
    do módulo). Acima do maior template definido, repete "Lanche" extras."""
    count = max(count, 4)
    if count in MEAL_TEMPLATES:
        return MEAL_TEMPLATES[count]
    if count < _MAX_TEMPLATE_COUNT:
        return MEAL_TEMPLATES[_MAX_TEMPLATE_COUNT][:count]
    base = list(MEAL_TEMPLATES[_MAX_TEMPLATE_COUNT])
    while len(base) < count:
        base.append((f"Lanche extra {len(base) - _MAX_TEMPLATE_COUNT + 1}", ""))
    return base


def meal_role(name: str) -> str:
    """Classifica uma refeição pelo nome, em português, tolera acento/caixa."""
    n = normalize(name)
    if re.search(r"almo[cç]o", n):
        return "lunch"
    if "jantar" in n:
        return "dinner"
    return "other"


def meal_floor_share(name: str) -> float:
    """
    Piso mínimo (fração do dia) que uma refeição deve manter: 25% pra
    almoço/jantar (extremo inferior da faixa 25-35% pedida), 10% pras demais
    (MIN_OTHER_SHARE). Usado por diet_engine._rebalance como restrição
    best-effort na redistribuição de um desvio (ver `_apply_floor_pass`), além
    de `role_weights` já usar o mesmo piso como peso inicial na alocação.
    """
    return MAIN_MEAL_MIN_SHARE if meal_role(name) in ("lunch", "dinner") else MIN_OTHER_SHARE


def role_weights(meal_names: list[str], all_meal_names: list[str] | None = None) -> list[float]:
    """
    Peso-alvo (soma 1.0) de cada refeição em `meal_names`, na mesma ordem.

    `all_meal_names`, se informado, é o dia INTEIRO (todas as refeições, não
    só as ajustáveis), usado pra calcular o peso-base de cada uma (almoço/
    jantar MAIN_MEAL_SHARE cada, demais dividem igualmente o resto). Só
    DEPOIS os pesos são renormalizados pra somar 1 entre `meal_names`. Isso
    importa quando uma refeição principal já foi comida, ex: se o almoço já
    foi comido e só sobram jantar + 1 lanche pra reajustar, o jantar mantém a
    proporção que tinha no dia inteiro (30% vs 20% do lanche, renormalizado
    pra 60%/40%), em vez de "ganhar" peso artificial só por ser o único
    principal que sobrou (o que empurraria calorias/proteína demais pro
    jantar). Se omitido, assume que `meal_names` já é o dia inteiro.
    """
    base_names = all_meal_names if all_meal_names is not None else meal_names
    base_roles = [meal_role(n) for n in base_names]
    n_other_total = sum(1 for r in base_roles if r == "other")
    n_main_total = sum(1 for r in base_roles if r in ("lunch", "dinner"))
    other_pool = max(0.0, 1.0 - MAIN_MEAL_SHARE * n_main_total)
    other_each = (other_pool / n_other_total) if n_other_total else 0.0

    raw = [MAIN_MEAL_SHARE if meal_role(n) in ("lunch", "dinner") else other_each for n in meal_names]
    total = sum(raw) or 1.0
    return [w / total for w in raw]


# Densidade calórica típica de uma refeição brasileira mista (prato com
# arroz/feijão/proteína/salada, ou lanche com pão/fruta/laticínio), usada só
# pra estimar o PESO aproximado da refeição em `meal_plan_targets`. É uma
# referência de ordem de grandeza pro prompt ("essa refeição deve dar um prato
# de ~450g, não de 1,5kg"), não uma meta: uma refeição mais seca (pão + queijo)
# pesa menos que uma com sopa/salada pro mesmo valor calórico.
_KCAL_PER_GRAM = 1.3


def meal_plan_targets(
    meal_count: int, total_calories: float, total_protein_g: float,
    total_carbs_g: float = 0.0, total_fat_g: float = 0.0,
) -> list[dict]:
    """
    A CONTA JÁ FEITA por refeição (nome, horário, calorias, proteína, carbo,
    gordura e peso aproximado), pronta pra virar tabela no prompt de geração
    (ver services/ai/gemini.generate_diet).

    A IA é boa em escolher alimentos coerentes e porções realistas, e ruim em
    aritmética: se ela recebe só a meta do dia e as porcentagens, erra a soma
    (mediu-se de +6% a +32% acima do alvo). Entregando os quatro macros já
    divididos por refeição, ela só precisa escolher alimentos que batam
    aqueles gramas, sem calcular nada.
    """
    template = meal_template(meal_count)
    names = [name for name, _ in template]
    weights = role_weights(names)
    return [
        {
            "name": name,
            "time": time,
            "calories": round(total_calories * w),
            "protein_g": round(total_protein_g * w),
            "carbs_g": round(total_carbs_g * w),
            "fat_g": round(total_fat_g * w),
            "grams": round(total_calories * w / _KCAL_PER_GRAM / 10) * 10,
        }
        for (name, time), w in zip(template, weights)
    ]
