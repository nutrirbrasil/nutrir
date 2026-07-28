"""
Limites por plano. Fonte única de verdade dos números, o frontend espelha os
mesmos valores em lib/plan.ts (mantidos em sincronia à mão, sem codegen).
Ver enforcement em routes/nootr/substitutions.py, recipes.py e noo.py.
"""

# Substituições ("Descrever com IA" / troca manual) por dia no Basic.
BASIC_DAILY_SUBSTITUTIONS = 3
# Receitas salvas no Basic.
BASIC_MAX_RECIPES = 5

# Mensagens por dia no Noo (o chat do Nootr). Aqui o Pro NÃO é ilimitado:
# cada mensagem é uma chamada de IA, então o teto separado evita que uma
# conversa longa vire custo aberto, e é a diferença mais visível entre os
# planos.
NOO_DAILY_MESSAGES = {"basic": 3, "pro": 20}

# "Reiniciar Noo" (limpa a conversa E desfaz os ajustes do dia, ver
# routes/nootr/noo.py) pode ser feito quantas vezes a pessoa quiser, mas só
# rende +1 mensagem no limite do dia até esse teto, senão reiniciar vira um
# jeito de contornar o limite. Pro: 20 + até 5 = 25 (o mesmo teto de antes).
# Basic: 3 + até 1 = 4.
NOO_RESET_BONUS_CAP = {"basic": 1, "pro": 5}


def is_pro(profile: dict | None) -> bool:
    return (profile or {}).get("plan") == "pro"


def noo_daily_limit(profile: dict | None, reset_count: int = 0) -> int:
    plan = "pro" if is_pro(profile) else "basic"
    bonus = min(reset_count, NOO_RESET_BONUS_CAP[plan])
    return NOO_DAILY_MESSAGES[plan] + bonus
