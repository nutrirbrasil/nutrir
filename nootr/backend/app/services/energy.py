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
