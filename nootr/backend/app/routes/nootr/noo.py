"""
Rotas do Noo, o chat do Nootr.

É a "quarta porta" das substituições: as três funções manuais (comi diferente,
vou comer diferente, estou em falta) continuam existindo como o caminho de
precisão, e o Noo é o caminho conversacional que faz as três de uma vez. A
pessoa descreve em texto livre o que mudou em QUALQUER combinação de refeições
e ele aplica tudo junto (ver diet_engine.apply_changes), explicando o que fez.

Limite diário por plano (ver services/plan_limits.NOO_DAILY_MESSAGES): cada
mensagem é uma chamada de IA, então nem o Pro é ilimitado aqui.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.auth import CurrentUser, CurrentUserDep
from backend.app.services import (
    ai, diet_engine, energy, food_matcher, plan_limits, repository,
)
from backend.app.routes.nootr.diets import FoodIn
from backend.app.services.nutrition import resolve_food
from backend.app.services.portion import parse_portion

router = APIRouter(prefix="/nootr/noo", tags=["Nootr - Noo"])


class NooMessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


def _targets_for(user: CurrentUser, day_plan: dict) -> dict:
    """Metas do dia (mesma fonte das substituições manuais, ver energy.day_targets)."""
    profile = repository.get_profile(user) or {}
    return energy.day_targets(
        profile, day_plan["daily_calories"], day_plan["daily_protein_g"],
        day_plan["daily_carbs_g"], day_plan["daily_fat_g"],
    )


def _resolve_added(items: list[dict], prefs: dict, country: str) -> list[dict]:
    """Casa os alimentos que o Noo propôs com a TACO, barrando alergia (o
    prompt já proíbe, isso é a rede determinística por baixo)."""
    preferred = food_matcher.preferred_taco_ids([*prefs.get("likes", []), *prefs.get("pantry", [])])
    tie_resolver = ai.build_country_tie_resolver(country)
    allergies = prefs.get("allergies") or []

    out: list[dict] = []
    for item in items:
        match = food_matcher.find_food(item["name"], preferred=preferred, tie_resolver=tie_resolver)
        if food_matcher.matches_allergen(match.name, allergies):
            continue
        grams = parse_portion(item["quantity"], food_hint=item["name"]) or match.grams or 100.0
        label = item["quantity"][:60] or None
        if match.taco_id is not None:
            resolved = resolve_food(FoodIn(taco_id=match.taco_id, grams=grams, quantity_label=label))
            if resolved:
                out.append(resolved)
            continue
        # Fora da TACO (item comum ou estimativa): entra como alimento próprio
        # com as macros por 100g que o matcher estimou.
        base = match.grams or 100.0
        ratio = 100.0 / base
        resolved = resolve_food(FoodIn(
            name=match.name[:120], grams=grams, quantity_label=label,
            kcal_100g=round(match.calories * ratio, 1),
            protein_100g=round(match.protein_g * ratio, 1),
            carbs_100g=round(match.carbs_g * ratio, 1),
            fat_100g=round(match.fat_g * ratio, 1),
        ))
        if resolved:
            out.append(resolved)
    return out


@router.get("")
def get_conversation(user: CurrentUser = CurrentUserDep):
    """Conversa de hoje + quanto ainda resta de mensagens no plano."""
    profile = repository.get_profile(user)
    day_plan = repository.get_or_create_day_plan(user)
    used = (day_plan or {}).get("noo_messages_used") or 0
    limit = plan_limits.noo_daily_limit(profile, (day_plan or {}).get("noo_reset_count") or 0)
    return {
        "messages": repository.list_noo_messages_today(user),
        "used": used,
        "limit": limit,
        "remaining": max(limit - used, 0),
        "plan": (profile or {}).get("plan", "basic"),
    }


@router.post("")
def send_message(body: NooMessageIn, user: CurrentUser = CurrentUserDep):
    """
    Um turno de conversa. Quando o Noo entende que algo mudou no dia, as
    mudanças são aplicadas na hora sobre o plano do dia (nunca na dieta
    template, igual às substituições manuais) e a resposta já volta com o dia
    ajustado e o diff do que mudou.
    """
    profile = repository.get_profile(user)
    day_plan = repository.get_or_create_day_plan(user)
    if day_plan is None:
        raise HTTPException(status_code=409, detail="Monte sua dieta primeiro em /dieta.")

    used = day_plan.get("noo_messages_used") or 0
    limit = plan_limits.noo_daily_limit(profile, day_plan.get("noo_reset_count") or 0)
    if used >= limit:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Você usou suas {limit} mensagens do Noo hoje. "
                + ("O limite renova amanhã, ou reinicie o Noo pra ganhar mais uma (até o teto do dia)."
                   if plan_limits.is_pro(profile)
                   else "No Pro são 20 por dia (+5 reiniciando), com um modelo de IA mais avançado.")
            ),
        )

    prefs = repository.get_preferences(user) or {}
    country = (profile or {}).get("country") or "BR"
    targets = _targets_for(user, day_plan)

    history = [
        {"role": m["role"], "text": m["text"]}
        for m in repository.list_noo_messages_today(user)
    ] + [{"role": "user", "text": body.text}]

    try:
        answer = ai.noo_chat(
            history, day_plan["meals"], targets,
            diet_engine.day_macros(day_plan["meals"]), prefs,
        )
    except ai.AIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    # A mensagem do usuário só é gravada depois da IA responder: se a chamada
    # falhar, ela não consome uma das mensagens do dia.
    repository.insert_noo_message(user, "user", body.text)

    # Casa os nomes de refeição que o Noo citou com as refeições reais.
    def find_meal(label: str) -> dict | None:
        """Casa pelo nome normalizado. Tolera o Noo devolver o rótulo da
        tabela inteiro ("Café da manhã (07:00)") em vez de só o nome."""
        key = food_matcher.normalize(label)
        for meal in day_plan["meals"]:
            name = food_matcher.normalize(meal["name"])
            if key == name or key.startswith(name) or name.startswith(key):
                return meal
        return None

    def new_meal(name: str, time: str) -> dict:
        """Cria uma refeição que ainda não existe no dia (ver regra 8 do
        prompt do Noo: sobremesa/lanche depois da última refeição planejada,
        por exemplo). Anexada em `day_plan["meals"]` na hora, pra apply_changes
        já enxergar como parte do dia, o desfazer sozinho não a remove, mas o
        próximo dia recomeça da dieta original, sem ela."""
        meal = {"id": f"meal-noo-{len(day_plan['meals']) + 1}", "name": name, "time": time, "foods": []}
        day_plan["meals"].append(meal)
        return meal

    changes: list[dict] = []
    for change in answer["changes"]:
        meal = find_meal(change["meal"])
        if meal is None:
            # Refeição nova: só vale a pena criar se há algo de fato pra
            # adicionar, senão não há o que fazer com uma refeição vazia.
            if not change["added"]:
                continue
            meal = new_meal(change["meal"], change.get("time") or "")
        changes.append({
            "meal_id": meal["id"],
            "skipped_names": [
                f["name"] for f in meal["foods"]
                if any(food_matcher.normalize(s) == food_matcher.normalize(f["name"]) for s in change["skipped"])
            ],
            "new_foods": _resolve_added(change["added"], prefs, country),
        })

    result = None
    day_view = None
    if changes:
        already_eaten = [m["id"] for m in (find_meal(n) for n in answer["already_eaten"]) if m]
        result = diet_engine.apply_changes(day_plan, changes, already_eaten, targets)
        # Dia inteiro + o que mudou item a item, pronto pra tela (a pessoa
        # precisa ver o plano completo, não só um extrato das alterações).
        day_view = diet_engine.build_day_view(day_plan["meals"], result["adjusted_meals"])
        repository.update_day_plan_meals(user, day_plan["id"], result["adjusted_meals"])
        repository.insert_substitution_log(user, day_plan["id"], day_plan["plan_date"], {
            "action": "noo_chat",
            "description": body.text[:500],
            "meal_id": None,
            "matched_food": None,
            "match_confidence": None,
            "delta_calories": result.get("delta_calories"),
            "remaining_calories": result.get("remaining_calories"),
            "remaining_protein_g": result.get("remaining_protein_g"),
        })

    # O snapshot do dia é guardado junto da resposta pra conversa reabrir
    # mostrando exatamente o que a pessoa viu quando o ajuste foi feito.
    repository.insert_noo_message(user, "assistant", answer["reply"], day_view)
    new_used = used + 1
    repository.record_noo_message_used(user, day_plan["id"], new_used)
    return {
        "reply": answer["reply"],
        "day": day_view,
        "targets": (result or {}).get("targets"),
        "remaining": max(limit - new_used, 0),
        "limit": limit,
    }


@router.delete("")
def reset_noo(user: CurrentUser = CurrentUserDep):
    """
    "Reiniciar Noo": limpa a conversa do dia E desfaz todos os ajustes feitos
    hoje, voltando a dieta pra porção original (ver repository.reset_day_plan).
    Pode ser feito quantas vezes a pessoa quiser, mas só rende +1 mensagem no
    limite diário até um teto por plano (NÃO devolve as mensagens já gastas,
    ver record_noo_message_used, senão reiniciar viraria um jeito de furar o
    limite).
    """
    repository.delete_noo_messages_today(user)
    profile = repository.get_profile(user)
    day_plan = repository.get_or_create_day_plan(user)
    reset_count = 0
    used = 0
    if day_plan is not None:
        original = day_plan.get("original_meals") or day_plan["meals"]
        reset_count = (day_plan.get("noo_reset_count") or 0) + 1
        repository.reset_day_plan(user, day_plan["id"], original, reset_count)
        used = day_plan.get("noo_messages_used") or 0
    limit = plan_limits.noo_daily_limit(profile, reset_count)
    return {"ok": True, "remaining": max(limit - used, 0), "limit": limit}
