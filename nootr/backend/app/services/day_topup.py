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

# Lacuna mínima de proteína/gordura pra valer a pena pedir um ajuste extra
# (adicionar ou remover alimento) pra IA. A de calorias usa
# diet_engine.calorie_tolerance (2%, ou 10 kcal): o dia não pode fechar fora
# disso. Gordura usa um limiar menor que proteína porque a meta de gordura em
# gramas já é bem menor (tipicamente 40-70g vs 100-150g de proteína).
_TOPUP_PROTEIN_THRESHOLD = 10.0
_TOPUP_FAT_THRESHOLD = 6.0


def try_day_topup(result: dict, user: CurrentUser, original_meals: list[dict] | None = None) -> None:
    """
    Depois de escalar as quantidades das refeições ajustáveis, se o dia ainda
    ficar fora da tolerância de calorias (ou longe na proteína/gordura), pede
    pra IA um ajuste extra: ADICIONAR alimento (nunca remover, ver
    _DAY_TOPUP_PROMPT) em uma ou mais refeições ajustáveis, e aplica se ela
    sugerir algo. Muda `result` in-place. Não bloqueia: se não houver
    refeição ajustável, a diferença já estiver dentro da tolerância, ou a IA
    não sugerir nada bom, o resultado do escalonamento normal é mantido.

    Gordura entra aqui (e não só no rebalanceamento por quantidade,
    diet_engine._rebalance) porque às vezes NENHUM alimento ajustável do dia
    é gorduroso o bastante pra cobrir a lacuna só escalando porção (ex: o
    alimento gorduroso do dia foi justamente o que a pessoa não comeu), só um
    alimento novo resolve.

    Também dispara quando a meta numérica bateu mas à custa de uma porção
    pouco realista (`near_ceiling_foods`, ex: leite virando 750ml pra fechar
    calorias sozinho): matematicamente certo, mas ninguém bebe isso de uma
    vez. Como esse mecanismo só adiciona, ele não "conserta" a porção
    grande, só evita piorar (não sugere mais do mesmo alimento) e cobre o
    resto com algo diferente, ver `_NEAR_CEILING_BLOCK`.

    E dispara quando uma refeição ficou com proteína bem abaixo da própria
    fatia-alvo (`protein_poor_meals`, ex: jantar com 106g de proteína e
    lanche com 15g): o rebalanceamento por quantidade só redistribui
    proteína ENTRE refeições que já têm algum alimento proteico pra trocar,
    se a refeição pobre não tem nenhum (ex: só pão e fruta), a única saída é
    adicionar um alimento proteico a ela de verdade.
    """
    if not result.get("can_top_up"):
        return
    remaining_cal = result["remaining_calories"]
    remaining_prot = result["remaining_protein_g"]
    remaining_fat = result.get("remaining_fat_g", 0)
    near_ceiling = result.get("near_ceiling_foods") or []
    protein_poor = result.get("protein_poor_meals") or []
    tolerance = diet_engine.calorie_tolerance(result["targets"]["calories"])
    if (
        abs(remaining_cal) <= tolerance
        and abs(remaining_prot) < _TOPUP_PROTEIN_THRESHOLD
        and abs(remaining_fat) < _TOPUP_FAT_THRESHOLD
        and not near_ceiling
        and not protein_poor
    ):
        return

    adjustable_ids = set(result.get("adjustable_meal_ids") or [])
    pending_meals = [m for m in result["adjusted_meals"] if m["id"] in adjustable_ids]
    prefs = repository.get_preferences(user) or {}
    preferred_ids = food_matcher.preferred_taco_ids([*prefs.get("likes", []), *prefs.get("pantry", [])])
    tie_resolver = ai.build_country_tie_resolver((repository.get_profile(user) or {}).get("country") or "BR")
    topup = ai.suggest_day_topup(
        pending_meals, remaining_cal, remaining_prot, remaining_fat, near_ceiling, protein_poor, prefs,
    )
    if not topup:
        return

    allergies = prefs.get("allergies") or []
    pre_topup_meals = result["adjusted_meals"]
    meals = pre_topup_meals
    applied: list[dict] = []
    for change in topup["changes"]:
        target_meal = next((m for m in meals if m["name"].lower() == change["meal_name"].lower()), None)
        resolved_additions = []
        for item in change["additions"]:
            match = food_matcher.find_food(
                f'{item["quantity"]} {item["name"]}'.strip(), preferred=preferred_ids, tie_resolver=tie_resolver,
            )
            # Última barreira determinística: mesmo com a instrução no prompt,
            # nunca confia só na IA pra alergia (ver food_matcher.matches_allergen).
            # Checa o nome que a IA propôs JUNTO com o alimento casado
            # (concatenados, não um OR de duas checagens separadas): sem
            # isso, um "sem X" que só a descrição original declarava (ex:
            # "hambúrguer sem pão" casando com o item genérico "Hamburguer",
            # que por padrão conta como glúten) se perdia, e a checagem
            # isolada em `match.name` bloqueava mesmo com a ausência
            # declarada (ver mesmo raciocínio em ai._match_items).
            if food_matcher.matches_allergen(f"{match.name} {item['name']}", allergies):
                continue
            # Se já existe um alimento de mesmo nome na refeição e ele é de
            # baixa densidade calórica (salada, folha), "adicionar mais" só
            # funde e infla a porção sem ganho real de caloria (mesma regra
            # do rebalanceamento normal, ver diet_engine.is_low_density_food),
            # a IA deveria ter escolhido outro alimento pra cobrir a diferença.
            existing = next(
                (f for f in (target_meal or {}).get("foods", []) if f["name"].lower() == match.name.lower()), None,
            )
            if existing and diet_engine.is_low_density_food(existing):
                continue
            grams = match.grams or 100.0
            resolved_additions.append({
                "name": match.name, "calories": match.calories, "protein_g": match.protein_g,
                "carbs_g": match.carbs_g, "fat_g": match.fat_g,
                "grams": grams, "quantity": f"{round(grams)}g" if match.grams else "1 porção",
            })
        if not resolved_additions:
            continue
        updated_meals = diet_engine.apply_meal_changes(
            meals, change["meal_name"], resolved_additions, [],
        )
        if updated_meals is None:
            continue
        meals = updated_meals
        applied.append({
            "meal_name": change["meal_name"],
            "additions": [a["name"] for a in resolved_additions],
        })

    if not applied:
        return

    # Mesmo teto de porção do rebalanceamento normal (diet_engine._MAX_FACTOR
    # sobre a porção ORIGINAL do dia): sem isso, "adicione mais arroz" em cima
    # de um arroz que o rebalanceamento já tinha crescido passava longe do
    # teto (ex: 270g -> 675g, 2,5x, mesmo com o teto configurado em 2x), já
    # que apply_meal_changes/merge_foods funde sem limite nenhum.
    if original_meals:
        meals = diet_engine.cap_meal_growth(original_meals, meals, fallback_meals=pre_topup_meals)

    after = diet_engine.day_macros(meals)
    tgt = result["targets"]

    # Rede determinística: como isso só adiciona alimento, o desvio de
    # calorias quase sempre melhora sozinho, mas não confia cegamente (ex: a
    # IA pode ter adicionado mais do que o necessário e estourado pro lado
    # oposto). Rejeita só se o desvio piorou de verdade E ainda ficou fora da
    # tolerância, não bloqueia por uma piora pequena e sem consequência.
    new_remaining_cal = tgt["calories"] - after["calories"]
    if abs(new_remaining_cal) > abs(remaining_cal) + 1 and abs(new_remaining_cal) > tolerance:
        return

    result["adjusted_meals"] = meals
    result["macros_after"] = after
    result["remaining_calories"] = round(tgt["calories"] - after["calories"])
    result["remaining_protein_g"] = round(tgt["protein_g"] - after["protein_g"])
    result["remaining_fat_g"] = round(tgt["fat_g"] - after["fat_g"])
    result["topup_applied"] = applied
