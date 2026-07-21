"""
Limites do plano Basic (o Pro é ilimitado). Fonte única de verdade dos números,
o frontend espelha os mesmos valores em lib/plan.ts (mantidos em sincronia à
mão, sem codegen). Ver enforcement em routes/nootr/substitutions.py e recipes.py.
"""

# Substituições ("Descrever com IA" / troca manual) por dia no Basic.
BASIC_DAILY_SUBSTITUTIONS = 3
# Receitas salvas no Basic.
BASIC_MAX_RECIPES = 5


def is_pro(profile: dict | None) -> bool:
    return (profile or {}).get("plan") == "pro"
