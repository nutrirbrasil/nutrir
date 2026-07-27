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
NOO_DAILY_MESSAGES = {"basic": 3, "pro": 25}


def is_pro(profile: dict | None) -> bool:
    return (profile or {}).get("plan") == "pro"


def noo_daily_limit(profile: dict | None) -> int:
    return NOO_DAILY_MESSAGES["pro" if is_pro(profile) else "basic"]
