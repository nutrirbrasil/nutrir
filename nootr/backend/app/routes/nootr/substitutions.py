"""Rotas Nootr, substituições com alimentos estruturados da TACO."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.auth import CurrentUser, CurrentUserDep
from backend.app.services import ai, diet_engine, energy, food_matcher, plan_limits, repository
from backend.app.services.nutrition import resolve_food

router = APIRouter(prefix="/nootr/substitutions", tags=["Nootr - Substituições"])

ACTION_LABELS = {
    "ate_different": "Comi algo diferente",
    "will_eat_different": "Vou comer algo diferente",
    "missing_food": "Estou em falta",
}

# Lacuna mínima (em gramas) pra considerar que vale a pena tentar um "coringa",
# abaixo disso não compensa incomodar a IA por uma diferença irrelevante.
_MIN_GAP_G = {"proteína": 5.0, "gordura": 5.0, "carboidrato": 10.0}
_GAP_LABELS = {"protein": "proteína", "fat": "gordura", "carb": "carboidrato"}

# Lacuna mínima (depois de escalar as quantidades das refeições ajustáveis)
# pra valer a pena pedir um ajuste extra (adicionar/remover alimento) pra IA,
# abaixo disso a diferença é pequena demais pra incomodar por isso.
_TOPUP_CAL_THRESHOLD = 150.0
_TOPUP_PROTEIN_THRESHOLD = 10.0


def _match_to_dict(m: food_matcher.MatchResult) -> dict:
    return {
        "taco_id": m.taco_id,
        "name": m.name,
        "grams": m.grams,
        "calories": m.calories,
        "protein_g": m.protein_g,
        "carbs_g": m.carbs_g,
        "fat_g": m.fat_g,
        "match_confidence": m.confidence,
    }


class FoodIn(BaseModel):
    grams: float = Field(gt=0, le=3000)
    quantity_label: str | None = Field(default=None, max_length=60)
    # Alimento da TACO...
    taco_id: int | None = None
    # ...ou customizado (ex: código de barras): nome + macros por 100g.
    name: str | None = Field(default=None, max_length=120)
    kcal_100g: float | None = Field(default=None, ge=0, le=1000)
    protein_100g: float | None = Field(default=None, ge=0, le=100)
    carbs_100g: float | None = Field(default=None, ge=0, le=100)
    fat_100g: float | None = Field(default=None, ge=0, le=100)


class SubstitutionRequest(BaseModel):
    action: str = Field(description="ate_different | will_eat_different | missing_food")
    meal_id: str | None = None
    foods: list[FoodIn] = Field(default_factory=list, max_length=15)
    # ate_different / will_eat_different: nomes (como salvos na refeição) dos
    # alimentos planejados que a pessoa NÃO comeu, o resto da refeição
    # continua igual. `foods` é o que ela comeu no lugar (pode ficar vazio =
    # "nada no lugar"). Se `skipped_food_names` vier vazio e `foods` tiver
    # itens, é uma adição por cima do planejado (não uma troca).
    skipped_food_names: list[str] = Field(default_factory=list, max_length=15)
    # Só para will_eat_different: refeições que a pessoa já comeu hoje (não
    # dá pra inferir só pelo horário planejado), ficam de fora do reajuste.
    already_eaten_meal_ids: list[str] = Field(default_factory=list, max_length=10)
    # Só para missing_food: nome (exibido) do alimento da refeição que falta.
    missing_food_name: str | None = Field(default=None, max_length=120)


def _scale_foods(foods_in: list[FoodIn]) -> list[dict]:
    scaled = []
    for food_in in foods_in:
        resolved = resolve_food(food_in)
        if resolved is None:
            raise HTTPException(status_code=400, detail=f"Alimento TACO {food_in.taco_id} não existe")
        scaled.append(resolved)
    return scaled


def _targets_from_profile(user: CurrentUser, day_plan: dict) -> dict:
    """Metas do dia: calorias e macros do perfil (% -> gramas); fallback na dieta."""
    profile = repository.get_profile(user) or {}
    calories = profile.get("target_calories") or day_plan["daily_calories"]
    if profile.get("target_calories"):
        macros = energy.macro_targets_g(
            float(calories),
            float(profile.get("protein_pct") or 30),
            float(profile.get("carbs_pct") or 40),
            float(profile.get("fat_pct") or 30),
        )
    else:
        macros = {
            "protein_g": day_plan["daily_protein_g"],
            "carbs_g": day_plan["daily_carbs_g"],
            "fat_g": day_plan["daily_fat_g"],
        }
    return {"calories": float(calories), **macros}


@router.get("/missing-food-options")
def missing_food_options(food_name: str, user: CurrentUser = CurrentUserDep):
    """
    Para "Estou em falta": resolve o perfil de macro do alimento que falta
    (proteína/carboidrato/gordura/misto) e filtra a despensa (preferências
    "costumo ter em casa") por itens do mesmo perfil, essas são as primeiras
    opções mostradas, antes de cair pra busca genérica ou sugestão da IA.
    """
    prefs = repository.get_preferences(user) or {}
    pantry_names = prefs.get("pantry", [])
    preferred_ids = food_matcher.preferred_taco_ids([*prefs.get("likes", []), *pantry_names])
    tie_resolver = ai.build_country_tie_resolver((repository.get_profile(user) or {}).get("country") or "BR")
    missing = food_matcher.find_food(food_name, preferred=preferred_ids, tie_resolver=tie_resolver)
    profile = food_matcher.macro_profile(missing.calories, missing.protein_g, missing.carbs_g, missing.fat_g)

    matches = []
    for name in pantry_names:
        m = food_matcher.find_food(
            name, anchor_kcal=missing.calories or None, preferred=preferred_ids, tie_resolver=tie_resolver,
        )
        m_profile = food_matcher.macro_profile(m.calories, m.protein_g, m.carbs_g, m.fat_g)
        if profile == "balanced" or m_profile == profile:
            matches.append(_match_to_dict(m))

    return {"missing_food": missing.name, "profile": profile, "pantry_matches": matches}


class AlternativesRequest(BaseModel):
    missing_food_name: str = Field(min_length=1, max_length=120)


@router.post("/alternatives")
def suggest_alternatives(body: AlternativesRequest, user: CurrentUser = CurrentUserDep):
    """"Buscar outros alimentos": pergunta pra IA o que pode substituir o item em falta (mesma função nutricional) e casa cada sugestão na TACO."""
    prefs = repository.get_preferences(user) or {}
    preferred_ids = food_matcher.preferred_taco_ids([*prefs.get("likes", []), *prefs.get("pantry", [])])
    tie_resolver = ai.build_country_tie_resolver((repository.get_profile(user) or {}).get("country") or "BR")
    try:
        names = ai.suggest_substitutes(body.missing_food_name, prefs)
    except ai.AIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    allergies = prefs.get("allergies") or []
    matches = [
        _match_to_dict(food_matcher.find_food(name, preferred=preferred_ids, tie_resolver=tie_resolver))
        for name in names
    ]
    # Última barreira determinística: mesmo com a instrução no prompt, nunca
    # confia só na IA pra alergia (ver food_matcher.matches_allergen).
    matches = [m for m in matches if not food_matcher.matches_allergen(m["name"], allergies)]
    return {"suggestions": matches}


def _macro_gap(missing_food: dict | None, substitute_foods: list[dict]) -> str | None:
    """
    Compara o que os substitutos escolhidos cobrem vs o que o alimento em
    falta contribuía. Devolve o macro (rótulo em português) que ficou mais
    abaixo da metade do que era, ou None se não houver lacuna relevante.
    """
    if not missing_food:
        return None
    sub = {
        "protein": sum(f["protein_g"] for f in substitute_foods),
        "carb": sum(f["carbs_g"] for f in substitute_foods),
        "fat": sum(f["fat_g"] for f in substitute_foods),
    }
    orig = {"protein": missing_food["protein_g"], "carb": missing_food["carbs_g"], "fat": missing_food["fat_g"]}
    gaps = []
    for key, label in _GAP_LABELS.items():
        if orig[key] >= _MIN_GAP_G[label] and sub[key] < orig[key] * 0.5:
            gaps.append((label, orig[key] - sub[key]))
    if not gaps:
        return None
    return max(gaps, key=lambda g: g[1])[0]


def _try_day_topup(result: dict, user: CurrentUser) -> None:
    """
    Depois de escalar as quantidades das refeições ajustáveis, se o dia ainda
    ficar significativamente longe da meta (calorias ou proteína), pede pra
    IA um ajuste extra, adicionar e/ou remover um alimento de UMA refeição
    ajustável, e aplica se ela sugerir algo. Muda `result` in-place. Não
    bloqueia: se não houver refeição ajustável, a diferença for pequena, ou a
    IA não sugerir nada bom, o resultado do escalonamento normal é mantido.
    """
    if not result.get("can_top_up"):
        return
    remaining_cal = result["remaining_calories"]
    remaining_prot = result["remaining_protein_g"]
    if abs(remaining_cal) < _TOPUP_CAL_THRESHOLD and abs(remaining_prot) < _TOPUP_PROTEIN_THRESHOLD:
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


@router.post("")
def suggest_substitution(body: SubstitutionRequest, user: CurrentUser = CurrentUserDep):
    # O plano do dia já reflete substituições anteriores de hoje: novos ajustes
    # compõem em cima dele, não sobre o template original.
    day_plan = repository.get_or_create_day_plan(user)
    if day_plan is None:
        raise HTTPException(status_code=409, detail="Monte sua dieta primeiro em /dieta.")

    # Basic: no máximo N substituições por dia (Pro é ilimitado). Conta as de
    # hoje ANTES de fazer o trabalho, pra não gastar chamadas de IA à toa.
    profile = repository.get_profile(user)
    if not plan_limits.is_pro(profile):
        used = repository.count_substitutions_on(user, day_plan["plan_date"])
        if used >= plan_limits.BASIC_DAILY_SUBSTITUTIONS:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Você atingiu o limite de {plan_limits.BASIC_DAILY_SUBSTITUTIONS} "
                    "substituições por dia do plano Basic. No Pro, são ilimitadas."
                ),
            )

    if body.meal_id and not any(m["id"] == body.meal_id for m in day_plan["meals"]):
        raise HTTPException(status_code=404, detail="Refeição não encontrada")

    if body.action in ("ate_different", "will_eat_different") and not body.skipped_food_names and not body.foods:
        raise HTTPException(status_code=400, detail="Sinalize o que não comeu ou o que comeu a mais.")

    foods = _scale_foods(body.foods)
    targets = _targets_from_profile(user, day_plan)

    if body.action == "ate_different":
        result = diet_engine.log_ate_different(day_plan, body.skipped_food_names, foods, body.meal_id, targets)
        _try_day_topup(result, user)
    elif body.action == "will_eat_different":
        result = diet_engine.log_will_eat_different(
            day_plan, body.skipped_food_names, foods, body.meal_id, body.already_eaten_meal_ids, targets,
        )
        _try_day_topup(result, user)
    elif body.action == "missing_food":
        if not body.meal_id or not body.missing_food_name:
            raise HTTPException(status_code=400, detail="Informe a refeição e o alimento em falta")

        # "Coringa": se os substitutos escolhidos deixarem a refeição bem
        # abaixo do que o alimento em falta contribuía num macro, pergunta pra
        # IA se algum item da despensa combina com o resto e cobre a lacuna.
        # Não bloqueia, se a IA não achar nada bom, segue só com o que o
        # usuário escolheu.
        meal = next((m for m in day_plan["meals"] if m["id"] == body.meal_id), None)
        missing_food_dict = next((f for f in (meal["foods"] if meal else []) if f["name"] == body.missing_food_name), None)
        wildcard_added = None
        gap_macro = _macro_gap(missing_food_dict, foods)
        if gap_macro and meal:
            wildcard_prefs = repository.get_preferences(user) or {}
            pantry = wildcard_prefs.get("pantry", [])
            allergies = wildcard_prefs.get("allergies") or []
            if pantry:
                current_names = [f["name"] for f in foods] + [
                    f["name"] for f in meal["foods"] if f["name"] != body.missing_food_name
                ]
                wildcard_name = ai.suggest_wildcard(meal["name"], current_names, gap_macro, wildcard_prefs)
                if wildcard_name:
                    anchor = max((missing_food_dict or {}).get("calories", 0) * 0.3, 50.0)
                    wildcard_preferred = food_matcher.preferred_taco_ids([*wildcard_prefs.get("likes", []), *pantry])
                    wildcard_tie_resolver = ai.build_country_tie_resolver(
                        (repository.get_profile(user) or {}).get("country") or "BR"
                    )
                    wildcard = food_matcher.find_food(
                        wildcard_name, anchor_kcal=anchor, preferred=wildcard_preferred,
                        tie_resolver=wildcard_tie_resolver,
                    )
                    # Última barreira determinística: mesmo com a instrução no
                    # prompt, nunca confia só na IA pra alergia (ver
                    # food_matcher.matches_allergen).
                    if not food_matcher.matches_allergen(wildcard.name, allergies):
                        grams = wildcard.grams or 50.0
                        foods.append({
                            "name": wildcard.name, "calories": wildcard.calories,
                            "protein_g": wildcard.protein_g, "carbs_g": wildcard.carbs_g, "fat_g": wildcard.fat_g,
                            "grams": grams, "quantity": f"{round(grams)}g",
                        })
                        wildcard_added = wildcard.name

        try:
            result = diet_engine.log_missing_food(day_plan, body.missing_food_name, body.meal_id, foods, targets)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        if wildcard_added:
            result["wildcard_added"] = wildcard_added
    else:
        raise HTTPException(status_code=400, detail="Ação inválida")

    eaten_description = ", ".join(f'{f["name"]} ({f["quantity"]})' for f in foods)
    if body.action in ("ate_different", "will_eat_different") and body.skipped_food_names:
        skipped_description = ", ".join(body.skipped_food_names)
        description = (
            f"não comeu {skipped_description}, comeu {eaten_description} no lugar"
            if eaten_description else f"não comeu {skipped_description}"
        )
    else:
        description = eaten_description

    # Explicação humana da IA (não bloqueia se a IA estiver fora do ar).
    result["ai_explanation"] = ai.explain_change({
        "acao": ACTION_LABELS.get(body.action, body.action),
        "comeu": description,
        "antes": result["macros_before"],
        "depois": result["macros_after"],
        "metas": result["targets"],
    })

    # Persiste o plano ajustado do dia e registra a substituição.
    repository.update_day_plan_meals(user, day_plan["id"], result["adjusted_meals"])
    repository.insert_substitution_log(
        user,
        day_plan["id"],
        day_plan["plan_date"],
        {
            "action": body.action,
            "description": description,
            "meal_id": body.meal_id,
            "matched_food": result.get("matched_food"),
            "match_confidence": result.get("match_confidence"),
            "delta_calories": result.get("delta_calories"),
            "remaining_calories": result.get("remaining_calories"),
            "remaining_protein_g": result.get("remaining_protein_g"),
        },
    )

    return {
        "action": body.action,
        "action_label": ACTION_LABELS.get(body.action, body.action),
        "input": description,
        **result,
    }
