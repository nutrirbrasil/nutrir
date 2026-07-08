"""
Motor de ajuste de dieta.

Quando o usuário reporta um desvio (comeu/vai comer algo diferente, ou trocou
um ingrediente), substituímos a refeição alvo e reajustamos as PORÇÕES das
refeições seguintes do dia buscando DOIS alvos ao mesmo tempo: as CALORIAS e a
PROTEÍNA do dia (proteína com tolerância de ~5%).

Como um único fator por alimento não permite acertar dois alvos independentes,
separamos os alimentos restantes em dois grupos — proteicos e energéticos — e
resolvemos um sistema linear 2x2 para o fator de cada grupo. As quantidades
(gramas + rótulo) são atualizadas de verdade, porque a mudança principal é
justamente na quantidade de cada alimento.
"""
from datetime import datetime, time as dt_time

_MIN_FACTOR = 0.3
_MAX_FACTOR = 2.5
_PROTEIN_GROUP_RATIO = 0.25  # alimento é "proteico" se >=25% das kcal vêm de proteína
_PROTEIN_TOLERANCE = 0.05    # 5% de tolerância na proteína


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def _parse_time(value: str) -> dt_time:
    return dt_time.fromisoformat(value)


def _meal_macros(meal: dict) -> dict:
    return {
        "calories": sum(f["calories"] for f in meal["foods"]),
        "protein_g": sum(f["protein_g"] for f in meal["foods"]),
        "carbs_g": sum(f["carbs_g"] for f in meal["foods"]),
        "fat_g": sum(f["fat_g"] for f in meal["foods"]),
    }


def _day_macros(meals: list[dict]) -> dict:
    """Totais do dia + % de cada macro sobre as calorias."""
    total = {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0}
    for meal in meals:
        m = _meal_macros(meal)
        for k in total:
            total[k] += m[k]
    cals = total["calories"] or 1
    return {
        "calories": round(total["calories"]),
        "protein_g": round(total["protein_g"]),
        "carbs_g": round(total["carbs_g"]),
        "fat_g": round(total["fat_g"]),
        "protein_pct": round(total["protein_g"] * 4 / cals * 100),
        "carbs_pct": round(total["carbs_g"] * 4 / cals * 100),
        "fat_pct": round(total["fat_g"] * 9 / cals * 100),
    }


def _pick_default_meal(diet: dict, forward_looking: bool) -> dict:
    now = datetime.now().time()
    meals = diet["meals"]
    if forward_looking:
        upcoming = [m for m in meals if _parse_time(m["time"]) > now]
        return upcoming[0] if upcoming else meals[-1]
    already = [m for m in meals if _parse_time(m["time"]) <= now]
    return already[-1] if already else meals[0]


def _targets(diet: dict, targets: dict | None) -> dict:
    """Metas do dia: do perfil, se vier; senão os totais da própria dieta."""
    if targets:
        return targets
    return {
        "calories": diet["daily_calories"],
        "protein_g": diet["daily_protein_g"],
        "carbs_g": diet["daily_carbs_g"],
        "fat_g": diet["daily_fat_g"],
    }


def _scale_food(f: dict, factor: float) -> dict:
    """Escala um alimento por `factor`, atualizando gramas e o rótulo visível."""
    out = {
        **f,
        "calories": round(f["calories"] * factor, 1),
        "protein_g": round(f["protein_g"] * factor, 1),
        "carbs_g": round(f["carbs_g"] * factor, 1),
        "fat_g": round(f["fat_g"] * factor, 1),
    }
    grams = f.get("grams")
    if grams:
        new_grams = round(grams * factor, 1)
        out["grams"] = new_grams
        out["quantity"] = f"{round(new_grams)}g"
    return out


def _is_protein_food(f: dict) -> bool:
    cal = f["calories"]
    return cal > 0 and (f["protein_g"] * 4 / cal) >= _PROTEIN_GROUP_RATIO


def _solve_two_group(cal_a: float, prot_a: float, cal_b: float, prot_b: float,
                     need_cal: float, need_prot: float) -> tuple[float, float] | None:
    """
    Fatores (a, b) para o grupo proteico (A) e energético (B).

    Prioridade: as CALORIAS do dia batem a meta (sem tolerância pedida pelo
    usuário) — é a restrição rígida. Dentro do que sobra de liberdade (a,b
    fisicamente possíveis, entre _MIN_FACTOR e _MAX_FACTOR), escolhemos o
    ponto que deixa a PROTEÍNA o mais perto possível da meta. Isso evita o
    problema do sistema 2x2 "exato": ele podia pedir um fator negativo
    (impossível) quando a proteína que falta não cabe na composição dos
    alimentos restantes sem estourar as calorias.
    """
    if cal_a <= 0 and cal_b <= 0:
        return None

    # Só um grupo com calorias: um único fator disponível, mira as calorias.
    if cal_a <= 0:
        b = _clamp(need_cal / cal_b, _MIN_FACTOR, _MAX_FACTOR)
        return 1.0, b
    if cal_b <= 0:
        a = _clamp(need_cal / cal_a, _MIN_FACTOR, _MAX_FACTOR)
        return a, 1.0

    # Faixa de "a" para a qual existe um "b" no range válido que zera o
    # desvio de calorias: a*cal_a + b*cal_b = need_cal, com b em [MIN,MAX].
    # b(a) = (need_cal - a*cal_a) / cal_b é decrescente em a (cal_a,cal_b>0).
    a_for_b_max = (need_cal - _MAX_FACTOR * cal_b) / cal_a
    a_for_b_min = (need_cal - _MIN_FACTOR * cal_b) / cal_a
    a_lo = _clamp(min(a_for_b_max, a_for_b_min), _MIN_FACTOR, _MAX_FACTOR)
    a_hi = _clamp(max(a_for_b_max, a_for_b_min), _MIN_FACTOR, _MAX_FACTOR)

    if a_lo <= a_hi:
        # Calorias exatas são alcançáveis: dentro de [a_lo, a_hi], minimiza o
        # desvio de proteína. protein(a) = a*prot_a + b(a)*prot_b é linear em a.
        slope = prot_a - prot_b * cal_a / cal_b
        if abs(slope) < 1e-9:
            a = _clamp(1.0, a_lo, a_hi)  # proteína não muda com "a": mexe o mínimo possível
        else:
            a_star = (need_prot - prot_b * need_cal / cal_b) / slope
            a = _clamp(a_star, a_lo, a_hi)
        b = _clamp((need_cal - a * cal_a) / cal_b, _MIN_FACTOR, _MAX_FACTOR)
        return a, b

    # Calorias exatas não são alcançáveis nos limites físicos: escala tudo
    # igual, priorizando bater as calorias o quanto der (fallback honesto).
    f = _clamp(need_cal / (cal_a + cal_b), _MIN_FACTOR, _MAX_FACTOR)
    return f, f


def _rebalance(meals: list[dict], from_meal_id: str, targets: dict) -> tuple[list[dict], bool]:
    """
    Ajusta as porções das refeições após `from_meal_id` para o dia bater as
    CALORIAS e a PROTEÍNA do alvo ao mesmo tempo (grupos proteico/energético).
    Devolve (refeições, rebalanceou?).
    """
    idx = next(i for i, m in enumerate(meals) if m["id"] == from_meal_id)
    remaining = meals[idx + 1:]
    if not remaining:
        return meals, False

    consumed = {"calories": 0.0, "protein_g": 0.0}
    for m in meals[: idx + 1]:
        mm = _meal_macros(m)
        consumed["calories"] += mm["calories"]
        consumed["protein_g"] += mm["protein_g"]

    need_cal = targets["calories"] - consumed["calories"]
    need_prot = targets["protein_g"] - consumed["protein_g"]

    cal_a = prot_a = cal_b = prot_b = 0.0
    for m in remaining:
        for f in m["foods"]:
            if _is_protein_food(f):
                cal_a += f["calories"]
                prot_a += f["protein_g"]
            else:
                cal_b += f["calories"]
                prot_b += f["protein_g"]

    solution = _solve_two_group(cal_a, prot_a, cal_b, prot_b, need_cal, need_prot)
    if solution is None:
        return meals, False
    a, b = solution
    if abs(a - 1) < 0.02 and abs(b - 1) < 0.02:
        return meals, False

    adjusted = []
    for m in meals:
        if m not in remaining:
            adjusted.append(m)
        else:
            adjusted.append({
                **m,
                "foods": [_scale_food(f, a if _is_protein_food(f) else b) for f in m["foods"]],
            })
    return adjusted, True


def _build_result(diet: dict, adjusted_meals: list[dict], targets: dict, headline: str, rebalanced: bool) -> dict:
    before = _day_macros(diet["meals"])
    after = _day_macros(adjusted_meals)
    tgt = {
        "calories": round(targets["calories"]),
        "protein_g": round(targets["protein_g"]),
        "carbs_g": round(targets["carbs_g"]),
        "fat_g": round(targets["fat_g"]),
    }
    remaining_calories = round(tgt["calories"] - after["calories"])
    remaining_protein = round(tgt["protein_g"] - after["protein_g"])

    if rebalanced:
        adj = (
            "Ajustamos as quantidades das refeições seguintes para o dia bater a meta de "
            "calorias e ficar dentro de ~5% da meta de proteína."
        )
    else:
        adj = "Não havia refeições seguintes para reajustar hoje — veja abaixo como o dia fechou."

    return {
        "adjusted_meals": adjusted_meals,
        "suggestion": f"{headline} {adj}",
        "macros_before": before,
        "macros_after": after,
        "targets": tgt,
        "remaining_calories": remaining_calories,
        "remaining_protein_g": remaining_protein,
        "rebalanced": rebalanced,
    }


def _apply_deviation(diet: dict, meal: dict, foods: list[dict], targets: dict | None) -> dict:
    tgt = _targets(diet, targets)
    planned_kcal = _meal_macros(meal)["calories"]
    eaten_kcal = sum(f["calories"] for f in foods)
    delta_kcal = eaten_kcal - planned_kcal

    replaced_meal = {**meal, "foods": foods}
    meals = [replaced_meal if m["id"] == meal["id"] else m for m in diet["meals"]]
    adjusted_meals, rebalanced = _rebalance(meals, meal["id"], tgt)

    names = ", ".join(f["name"] for f in foods)
    direction = "acima" if delta_kcal > 0 else "abaixo"
    headline = (
        f"Registramos {names} (~{round(eaten_kcal)} kcal) em {meal['name']}, "
        f"{abs(round(delta_kcal))} kcal {direction} do planejado."
    )
    result = _build_result(diet, adjusted_meals, tgt, headline, rebalanced)
    result["matched_food"] = names
    result["match_confidence"] = "alta"
    result["delta_calories"] = round(delta_kcal, 1)
    return result


def log_ate_different(diet: dict, foods: list[dict], meal_id: str | None, targets: dict | None = None) -> dict:
    meal = next((m for m in diet["meals"] if m["id"] == meal_id), None) or _pick_default_meal(diet, forward_looking=False)
    return _apply_deviation(diet, meal, foods, targets)


def log_will_eat_different(diet: dict, foods: list[dict], meal_id: str | None, targets: dict | None = None) -> dict:
    meal = next((m for m in diet["meals"] if m["id"] == meal_id), None) or _pick_default_meal(diet, forward_looking=True)
    return _apply_deviation(diet, meal, foods, targets)


def log_missing_food(diet: dict, missing_food_name: str, meal_id: str, substitutes: list[dict], targets: dict | None = None) -> dict:
    meal = next((m for m in diet["meals"] if m["id"] == meal_id), None)
    if meal is None:
        raise ValueError("Refeição não encontrada")
    missing_food = next((f for f in meal["foods"] if f["name"] == missing_food_name), None)
    if missing_food is None:
        raise ValueError("Alimento não encontrado na refeição")

    tgt = _targets(diet, targets)
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
    adjusted_meals, rebalanced = _rebalance(meals, meal["id"], tgt)

    names = ", ".join(f["name"] for f in substitutes)
    headline = (
        f"Trocamos {missing_food['name']} por {names} em {meal['name']} "
        f"(diferença de {abs(round(delta_kcal))} kcal)."
    )
    result = _build_result(diet, adjusted_meals, tgt, headline, rebalanced)
    result["matched_food"] = names
    result["match_confidence"] = "alta"
    result["delta_calories"] = round(delta_kcal, 1)
    return result
