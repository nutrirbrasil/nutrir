"""
Cálculo de gasto energético diário (TDEE) a partir do perfil do usuário.

Duas fórmulas de TMB (taxa metabólica basal), multiplicadas pelo fator de
atividade. O usuário também pode simplesmente informar as calorias à mão
(formula = "manual"), caso já tenha o alvo do nutricionista.
"""

ACTIVITY_FACTORS = {
    "sedentario": 1.2,
    "leve": 1.375,
    "moderado": 1.55,
    "intenso": 1.725,
    "atleta": 1.9,
}


def bmr_mifflin_st_jeor(sex: str, weight_kg: float, height_cm: float, age: int) -> float:
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    return base + 5 if sex == "m" else base - 161


def bmr_harris_benedict(sex: str, weight_kg: float, height_cm: float, age: int) -> float:
    # Harris-Benedict revisada (Roza & Shizgal, 1984)
    if sex == "m":
        return 88.362 + 13.397 * weight_kg + 4.799 * height_cm - 5.677 * age
    return 447.593 + 9.247 * weight_kg + 3.098 * height_cm - 4.330 * age


def macro_targets_g(calories: float, protein_pct: float, carbs_pct: float, fat_pct: float) -> dict:
    """Converte calorias + % de macros em metas de gramas (prot/carb=4kcal/g, gord=9kcal/g)."""
    return {
        "protein_g": round(calories * (protein_pct / 100) / 4),
        "carbs_g": round(calories * (carbs_pct / 100) / 4),
        "fat_g": round(calories * (fat_pct / 100) / 9),
    }


# Faixas por quilo de peso corporal, a forma como nutricionista prescreve na
# prática. Percentual puro do total calórico distorce nos extremos: 35% de
# proteína num plano de 2600 kcal dá 2,85 g/kg, quase o dobro do necessário,
# enquanto o mesmo percentual num plano de 1200 kcal ficaria abaixo do mínimo.
# Proteína e gordura são fixadas por peso (necessidade fisiológica) e o
# carboidrato fica com o que sobrar das calorias, que é o macro flexível.
PROTEIN_G_PER_KG = (1.6, 2.0)
FAT_G_PER_KG = (0.7, 1.0)


def _midpoint(faixa: tuple[float, float]) -> float:
    return (faixa[0] + faixa[1]) / 2


def macro_targets_from_weight(
    calories: float, weight_kg: float,
    protein_g_per_kg: float | None = None, fat_g_per_kg: float | None = None,
) -> dict:
    """
    Metas de macro em gramas a partir do PESO, não de percentual: proteína e
    gordura no meio das faixas de referência (ver PROTEIN_G_PER_KG e
    FAT_G_PER_KG) por padrão, e carboidrato fechando as calorias que sobram.

    `protein_g_per_kg`/`fat_g_per_kg`: quando o usuário já ajustou essas metas
    à mão (ver profiles.protein_g_per_kg/fat_g_per_kg), usa o valor dele em
    vez do meio da faixa, sem clampar à faixa de referência, é uma faixa
    típica, não um limite físico.

    Devolve também os limites da faixa (`*_min_g`/`*_max_g`) e o g/kg
    resultante, usados pra mostrar ao nutricionista na fila de revisão (ver
    /aprovar) o espaço que ele tem pra ajustar.

    Em plano muito restrito o carboidrato pode não fechar (proteína + gordura
    já consomem tudo): nesse caso as duas são reduzidas proporcionalmente até
    sobrar pelo menos 10% das calorias pra carboidrato, em vez de devolver
    um valor negativo.
    """
    protein_g = round(weight_kg * (protein_g_per_kg if protein_g_per_kg is not None else _midpoint(PROTEIN_G_PER_KG)))
    fat_g = round(weight_kg * (fat_g_per_kg if fat_g_per_kg is not None else _midpoint(FAT_G_PER_KG)))

    # Piso de carboidrato: nunca deixa proteína+gordura comerem o dia todo.
    min_carbs_kcal = calories * 0.10
    used_kcal = protein_g * 4 + fat_g * 9
    if used_kcal > calories - min_carbs_kcal:
        shrink = (calories - min_carbs_kcal) / used_kcal
        protein_g = max(round(weight_kg * PROTEIN_G_PER_KG[0] * shrink), 1)
        fat_g = max(round(weight_kg * FAT_G_PER_KG[0] * shrink), 1)

    carbs_g = max(round((calories - protein_g * 4 - fat_g * 9) / 4), 0)
    return {
        "protein_g": protein_g,
        "carbs_g": carbs_g,
        "fat_g": fat_g,
        "protein_min_g": round(weight_kg * PROTEIN_G_PER_KG[0]),
        "protein_max_g": round(weight_kg * PROTEIN_G_PER_KG[1]),
        "fat_min_g": round(weight_kg * FAT_G_PER_KG[0]),
        "fat_max_g": round(weight_kg * FAT_G_PER_KG[1]),
        "protein_g_per_kg": round(protein_g / weight_kg, 2),
        "fat_g_per_kg": round(fat_g / weight_kg, 2),
        # A faixa de referência em si, pra UI rotular a linha ("1.6–2 g/kg")
        # sem repetir as constantes do lado do frontend.
        "protein_per_kg_range": list(PROTEIN_G_PER_KG),
        "fat_per_kg_range": list(FAT_G_PER_KG),
    }


def macro_targets_for_generation(profile: dict, calories: float) -> dict:
    """
    Metas que o NOOTR usa pra montar a dieta: sempre por g/kg de peso, porque
    é o que garante proteína e gordura em faixa fisiológica (percentual puro
    distorce nos extremos, ver macro_targets_from_weight). Independe do
    `macro_mode`, que só governa como o usuário vê e edita as metas depois.

    Sem peso válido não há como calcular por kg, aí cai no percentual. Se o
    usuário já ajustou protein_g_per_kg/fat_g_per_kg à mão (ver
    routes/nootr/profile.py), essa passa a ser a meta usada aqui também, não
    só na tela de perfil, o Nootr monta a dieta pro alvo que a pessoa
    realmente quer.
    """
    weight_kg = profile.get("weight_kg")
    if weight_kg and float(weight_kg) > 0:
        protein_g_per_kg = profile.get("protein_g_per_kg")
        fat_g_per_kg = profile.get("fat_g_per_kg")
        return macro_targets_from_weight(
            calories, float(weight_kg),
            float(protein_g_per_kg) if protein_g_per_kg is not None else None,
            float(fat_g_per_kg) if fat_g_per_kg is not None else None,
        )
    return macro_targets_g(
        calories,
        float(profile.get("protein_pct") or 30),
        float(profile.get("carbs_pct") or 40),
        float(profile.get("fat_pct") or 30),
    )


def macro_targets_for_profile(profile: dict, calories: float) -> dict:
    """
    Metas de macro do perfil, no modo que ele escolheu (`profiles.macro_mode`):

    - "per_kg": proteína/gordura por grama por quilo de peso (ver
      macro_targets_from_weight). É como o Nootr monta a dieta e como o
      nutricionista raciocina.
    - "percent" (padrão): pelos percentuais salvos, mais simples de ajustar na
      tela e o único modo do Basic.

    Cai no percentual também quando o modo é "per_kg" mas não há peso válido
    (0 ou ausente dividiria por zero), em vez de estourar 500 na geração.
    """
    weight_kg = profile.get("weight_kg")
    if profile.get("macro_mode") == "per_kg" and weight_kg and float(weight_kg) > 0:
        protein_g_per_kg = profile.get("protein_g_per_kg")
        fat_g_per_kg = profile.get("fat_g_per_kg")
        return macro_targets_from_weight(
            calories, float(weight_kg),
            float(protein_g_per_kg) if protein_g_per_kg is not None else None,
            float(fat_g_per_kg) if fat_g_per_kg is not None else None,
        )
    return macro_targets_g(
        calories,
        float(profile.get("protein_pct") or 30),
        float(profile.get("carbs_pct") or 40),
        float(profile.get("fat_pct") or 30),
    )


def daily_calories(
    formula: str, sex: str, weight_kg: float, height_cm: float, age: int, activity_level: str
) -> float | None:
    """TDEE arredondado, ou None se a fórmula/atividade não forem calculáveis."""
    factor = ACTIVITY_FACTORS.get(activity_level)
    if factor is None:
        return None
    if formula == "mifflin_st_jeor":
        bmr = bmr_mifflin_st_jeor(sex, weight_kg, height_cm, age)
    elif formula == "harris_benedict":
        bmr = bmr_harris_benedict(sex, weight_kg, height_cm, age)
    else:
        return None
    return round(bmr * factor)
