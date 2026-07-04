"""
Motor de ajuste de dieta.

Ideia geral: cada refeição do dia tem um alvo de macros (soma dos seus
alimentos planejados). Quando o usuário reporta um desvio (comeu/vai comer
algo diferente, ou está sem um ingrediente), calculamos a diferença de macros
entre o que foi planejado e o que foi de fato consumido/disponível, e
redistribuímos essa diferença nas refeições restantes do dia — reduzindo ou
aumentando as porções de carboidrato/gordura primeiro, preservando a proteína
o quanto possível.
"""
from datetime import datetime, time as dt_time

from backend.app.services import food_matcher

_MIN_FACTOR = 0.5
_MAX_FACTOR = 1.5
_MIN_REMAINING_SHARE = 0.4  # nunca zera as refeições restantes


def _parse_time(value: str) -> dt_time:
    return dt_time.fromisoformat(value)


def _meal_totals(meal: dict) -> tuple[float, float, float, float]:
    kcal = sum(f["calories"] for f in meal["foods"])
    protein = sum(f["protein_g"] for f in meal["foods"])
    carbs = sum(f["carbs_g"] for f in meal["foods"])
    fat = sum(f["fat_g"] for f in meal["foods"])
    return kcal, protein, carbs, fat


def _pick_default_meal(diet: dict, forward_looking: bool) -> dict:
    now = datetime.now().time()
    meals = diet["meals"]
    if forward_looking:
        upcoming = [m for m in meals if _parse_time(m["time"]) > now]
        return upcoming[0] if upcoming else meals[-1]
    already = [m for m in meals if _parse_time(m["time"]) <= now]
    return already[-1] if already else meals[0]


def _rebalance_remaining(meals: list[dict], from_meal_id: str, delta_kcal: float) -> tuple[list[dict], bool]:
    """
    Redistribui `delta_kcal` nas refeições após `from_meal_id`.
    Devolve (refeições, rebalanceou?) — o segundo valor é False quando não há
    refeições seguintes (ex: substituição na última refeição do dia) ou quando
    o desvio é desprezível, para o chamador dar uma mensagem honesta.
    """
    idx = next(i for i, m in enumerate(meals) if m["id"] == from_meal_id)
    remaining = meals[idx + 1:]
    if not remaining or abs(delta_kcal) < 1:
        return meals, False

    remaining_kcal = sum(_meal_totals(m)[0] for m in remaining)
    if remaining_kcal <= 0:
        return meals, False

    target_remaining_kcal = max(remaining_kcal - delta_kcal, remaining_kcal * _MIN_REMAINING_SHARE)
    factor = max(_MIN_FACTOR, min(_MAX_FACTOR, target_remaining_kcal / remaining_kcal))

    adjusted = []
    for m in meals:
        if m not in remaining:
            adjusted.append(m)
            continue
        new_foods = [
            {
                **f,
                "calories": round(f["calories"] * factor, 1),
                "carbs_g": round(f["carbs_g"] * factor, 1),
                "fat_g": round(f["fat_g"] * factor, 1),
                # proteína é protegida: escala bem menos que o resto
                "protein_g": round(f["protein_g"] * (1 - (1 - factor) * 0.3), 1),
            }
            for f in m["foods"]
        ]
        adjusted.append({**m, "foods": new_foods})
    return adjusted, True


def _adjustment_sentence(rebalanced: bool, delta_kcal: float, remaining_kcal: float) -> str:
    """Frase sobre o ajuste no restante do dia, honesta quando não há como compensar."""
    if rebalanced:
        return "Redistribuímos a diferença nas refeições seguintes de hoje."
    if abs(delta_kcal) < 1:
        return "Sem ajuste necessário no restante do dia."
    # Não há refeições seguintes para compensar (ex: última refeição do dia).
    if remaining_kcal < 0:
        return (
            f"Não há refeições seguintes hoje para compensar — você fechou o dia "
            f"~{abs(round(remaining_kcal))} kcal acima da meta."
        )
    return (
        f"Não há refeições seguintes hoje para compensar — você fechou o dia "
        f"~{round(remaining_kcal)} kcal abaixo da meta."
    )


def _remaining_targets(diet: dict, meals: list[dict], up_to_meal_id: str) -> tuple[float, float]:
    idx = next(i for i, m in enumerate(meals) if m["id"] == up_to_meal_id)
    consumed_kcal = sum(_meal_totals(m)[0] for m in meals[: idx + 1])
    consumed_protein = sum(_meal_totals(m)[1] for m in meals[: idx + 1])
    return (
        round(diet["daily_calories"] - consumed_kcal, 1),
        round(diet["daily_protein_g"] - consumed_protein, 1),
    )


def _apply_deviation(diet: dict, meal: dict, foods: list[dict]) -> dict:
    """
    Substitui a refeição inteira pelos alimentos informados (já com macros
    calculados da TACO) e redistribui o delta nas refeições seguintes.
    """
    planned_kcal, planned_protein, planned_carbs, planned_fat = _meal_totals(meal)
    eaten_kcal = sum(f["calories"] for f in foods)
    delta_kcal = eaten_kcal - planned_kcal

    replaced_meal = {**meal, "foods": foods}
    meals = [replaced_meal if m["id"] == meal["id"] else m for m in diet["meals"]]
    adjusted_meals, rebalanced = _rebalance_remaining(meals, meal["id"], delta_kcal)
    remaining_kcal, remaining_protein = _remaining_targets(diet, adjusted_meals, meal["id"])

    names = ", ".join(f["name"] for f in foods)
    direction = "acima" if delta_kcal > 0 else "abaixo"
    ident = (
        f"Registramos {names} (~{round(eaten_kcal)} kcal), "
        f"{abs(round(delta_kcal))} kcal {direction} do planejado para {meal['name']}."
    )
    suggestion = f"{ident} {_adjustment_sentence(rebalanced, delta_kcal, remaining_kcal)}"

    return {
        "adjusted_meals": adjusted_meals,
        "suggestion": suggestion,
        "remaining_calories": remaining_kcal,
        "remaining_protein_g": remaining_protein,
        "matched_food": names,
        "match_confidence": "alta",  # alimentos escolhidos direto da TACO
        "delta_calories": round(delta_kcal, 1),
    }


def log_ate_different(diet: dict, foods: list[dict], meal_id: str | None) -> dict:
    meal = next((m for m in diet["meals"] if m["id"] == meal_id), None) or _pick_default_meal(diet, forward_looking=False)
    return _apply_deviation(diet, meal, foods)


def log_will_eat_different(diet: dict, foods: list[dict], meal_id: str | None) -> dict:
    meal = next((m for m in diet["meals"] if m["id"] == meal_id), None) or _pick_default_meal(diet, forward_looking=True)
    return _apply_deviation(diet, meal, foods)


def log_missing_food(diet: dict, missing_food_name: str, meal_id: str, substitutes: list[dict]) -> dict:
    """
    Troca um alimento específico da refeição (`missing_food_name`) pelos
    substitutos escolhidos pelo usuário (já com macros da TACO).
    """
    meal = next((m for m in diet["meals"] if m["id"] == meal_id), None)
    if meal is None:
        raise ValueError("Refeição não encontrada")
    missing_food = next((f for f in meal["foods"] if f["name"] == missing_food_name), None)
    if missing_food is None:
        raise ValueError("Alimento não encontrado na refeição")

    substitutes_kcal = sum(f["calories"] for f in substitutes)
    delta_kcal = substitutes_kcal - missing_food["calories"]

    new_foods: list[dict] = []
    for f in meal["foods"]:
        if f["name"] == missing_food_name:
            new_foods.extend(substitutes)
        else:
            new_foods.append(f)
    updated_meal = {**meal, "foods": new_foods}

    meals = [updated_meal if m["id"] == meal["id"] else m for m in diet["meals"]]
    adjusted_meals, rebalanced = _rebalance_remaining(meals, meal["id"], delta_kcal)
    remaining_kcal, remaining_protein = _remaining_targets(diet, adjusted_meals, meal["id"])

    names = ", ".join(f["name"] for f in substitutes)
    suggestion = (
        f"Trocamos {missing_food['name']} por {names} em {meal['name']} "
        f"(diferença de {abs(round(delta_kcal))} kcal). "
        f"{_adjustment_sentence(rebalanced, delta_kcal, remaining_kcal)}"
    )

    return {
        "adjusted_meals": adjusted_meals,
        "suggestion": suggestion,
        "remaining_calories": remaining_kcal,
        "remaining_protein_g": remaining_protein,
        "matched_food": names,
        "match_confidence": "alta",
        "delta_calories": round(delta_kcal, 1),
    }
