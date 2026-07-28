"""
Top-up do dia: última rede de segurança quando o rebalanceamento normal
(diet_engine._rebalance, incluindo o teto de crescimento por alimento e o
fechamento de calorias dentro da tolerância) não consegue fechar a meta
sozinho, geralmente porque os alimentos ajustáveis já bateram no próprio
teto/piso e não sobra mais quantidade pra mexer.

Compartilhado pelas 3 funções manuais (substitutions.py) e pelo Noo (noo.py),
pra que os dois caminhos garantam a mesma tolerância de calorias.
"""
from backend.app.auth import CurrentUser
from backend.app.services import ai, diet_engine, food_matcher, repository

# Lacuna mínima de proteína pra valer a pena pedir um ajuste extra (adicionar
# ou remover alimento) pra IA. A de calorias usa diet_engine.calorie_tolerance
# (2%, ou 10 kcal): o dia não pode fechar fora disso.
_TOPUP_PROTEIN_THRESHOLD = 10.0


def try_day_topup(result: dict, user: CurrentUser) -> None:
    """
    Depois de escalar as quantidades das refeições ajustáveis, se o dia ainda
    ficar fora da tolerância de calorias (ou longe na proteína), pede pra IA
    um ajuste extra, adicionar e/ou remover um alimento de UMA refeição
    ajustável, e aplica se ela sugerir algo. Muda `result` in-place. Não
    bloqueia: se não houver refeição ajustável, a diferença já estiver dentro
    da tolerância, ou a IA não sugerir nada bom, o resultado do escalonamento
    normal é mantido.
    """
    if not result.get("can_top_up"):
        return
    remaining_cal = result["remaining_calories"]
    remaining_prot = result["remaining_protein_g"]
    tolerance = diet_engine.calorie_tolerance(result["targets"]["calories"])
    if abs(remaining_cal) <= tolerance and abs(remaining_prot) < _TOPUP_PROTEIN_THRESHOLD:
        return

    adjustable_ids = set(result.get("adjustable_meal_ids") or [])
    pending_meals = [m for m in result["adjusted_meals"] if m["id"] in adjustable_ids]
    prefs = repository.get_preferences(user) or {}
    preferred_ids = food_matcher.preferred_taco_ids([*prefs.get("likes", []), *prefs.get("pantry", [])])
    tie_resolver = ai.build_country_tie_resolver((repository.get_profile(user) or {}).get("country") or "BR")
    topup = ai.suggest_day_topup(pending_meals, remaining_cal, remaining_prot, prefs)
    if not topup:
        return

    allergies = prefs.get("allergies") or []
    resolved_additions = []
    for item in topup["additions"]:
        match = food_matcher.find_food(
            f'{item["quantity"]} {item["name"]}'.strip(), preferred=preferred_ids, tie_resolver=tie_resolver,
        )
        # Última barreira determinística: mesmo com a instrução no prompt,
        # nunca confia só na IA pra alergia (ver food_matcher.matches_allergen).
        if food_matcher.matches_allergen(match.name, allergies):
            continue
        grams = match.grams or 100.0
        resolved_additions.append({
            "name": match.name, "calories": match.calories, "protein_g": match.protein_g,
            "carbs_g": match.carbs_g, "fat_g": match.fat_g,
            "grams": grams, "quantity": f"{round(grams)}g" if match.grams else "1 porção",
        })
    if not resolved_additions and not topup["removals"]:
        return

    updated_meals = diet_engine.apply_meal_changes(
        result["adjusted_meals"], topup["meal_name"], resolved_additions, topup["removals"],
    )
    if updated_meals is None:
        return

    after = diet_engine.day_macros(updated_meals)
    tgt = result["targets"]
    result["adjusted_meals"] = updated_meals
    result["macros_after"] = after
    result["remaining_calories"] = round(tgt["calories"] - after["calories"])
    result["remaining_protein_g"] = round(tgt["protein_g"] - after["protein_g"])
    result["topup_applied"] = {
        "meal_name": topup["meal_name"],
        "additions": [a["name"] for a in resolved_additions],
        "removals": topup["removals"],
    }
