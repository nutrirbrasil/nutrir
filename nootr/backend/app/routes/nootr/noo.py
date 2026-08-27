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
import base64

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from backend.app.auth import CurrentUser, CurrentUserDep
from backend.app.services import (
    ai, day_topup, diet_engine, energy, food_matcher, plan_limits, repository,
)
from backend.app.routes.nootr.diets import FoodIn
from backend.app.services.nutrition import resolve_food
from backend.app.services.portion import parse_portion

router = APIRouter(prefix="/nootr/noo", tags=["Nootr - Noo"])

# Formatos que os navegadores de fato gravam com MediaRecorder (webm/ogg no
# Chrome/Firefox, mp4/aac no Safari) e que o Gemini aceita como inline_data.
_AUDIO_MIME_TYPES = {
    "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/aac", "audio/wav",
}
# ~2 minutos de voz comprimida com folga. É um recado curto ("comi X e Y no
# almoço"), não um áudio longo, e o limite protege o custo da transcrição.
_MAX_AUDIO_BYTES = 4 * 1024 * 1024


class NooMessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


def _targets_for(profile: dict | None, day_plan: dict) -> dict:
    """Metas do dia (mesma fonte das substituições manuais, ver energy.day_targets)."""
    profile = profile or {}
    return energy.day_targets(
        profile, day_plan["daily_calories"], day_plan["daily_protein_g"],
        day_plan["daily_carbs_g"], day_plan["daily_fat_g"],
    )


def _resolve_added(
    items: list[dict], prefs: dict, country: str, text_norm: str, unresolved: list[str],
) -> list[dict]:
    """Casa os alimentos que o Noo propôs com a TACO.

    O filtro de alergia (matches_allergen) só é aplicado a um item se a
    PRÓPRIA PESSOA não citou esse alimento na mensagem atual: nesse caso é o
    Nootr escolhendo por conta própria (ex: "quero algo a mais no jantar" ->
    a IA decide o quê), e aí a barreira de segurança vale. Se a pessoa citou
    o alimento (ex: "comi amendoim"), ela já decidiu por conta própria, não
    faz sentido bloquear o registro do que ela mesma disse que comeu/vai
    comer, só porque bate com uma alergia cadastrada.

    `unresolved`: lista (compartilhada entre chamadas) onde entram os nomes
    de alimentos que nem a busca determinística nem a IA de estimativa
    souberam identificar, pra send_message avisar a pessoa a cadastrar em
    "Meus Alimentos" em vez de aplicar um chute genérico sem relação com o
    alimento real."""
    preferred = food_matcher.preferred_taco_ids([*prefs.get("likes", []), *prefs.get("pantry", [])])
    tie_resolver = ai.build_country_tie_resolver(country)
    allergies = prefs.get("allergies") or []

    out: list[dict] = []
    for item in items:
        # Quantidade vazia = o próprio Noo não soube que porção assumir e já
        # perguntou na `reply` (ver regra 11/quantity vazio do prompt), não
        # aplica esse item agora, só quando a pessoa responder a quantidade.
        if not item["quantity"].strip():
            continue
        match = food_matcher.find_food(item["name"], preferred=preferred, tie_resolver=tie_resolver)
        # Alimento que a busca determinística não cobre (nem TACO, nem extra,
        # nem lista de itens comuns): em vez do placeholder genérico ancorado
        # só na caloria da refeição, pede uma estimativa nutricional real pra
        # IA (ex: "kingcrab"). Se a IA também não reconhecer, não aplica nada
        # (chutar macros de um alimento que ninguém identificou seria pior
        # que não registrar), avisa a pessoa a cadastrar em Meus Alimentos.
        if match.source == "estimate":
            estimated = ai.estimate_unknown_food(item["name"])
            if not estimated:
                unresolved.append(item["name"])
                continue
            match = food_matcher.MatchResult(
                name=item["name"].strip().capitalize(),
                calories=estimated["kcal_100g"], protein_g=estimated["protein_100g"],
                carbs_g=estimated["carbs_100g"], fat_g=estimated["fat_100g"],
                grams=100.0, source="ai_estimate", confidence="media",
            )
        # Confere tanto o nome que a IA propôs quanto o nome REAL do alimento
        # casado: a IA às vezes reformula o que a pessoa disse (ex: pessoa
        # disse "danoninho", IA propõe "petit suisse", o nome real casado é
        # "Queijo 'petit suisse' (Danoninho)"), então só olhar pro texto da
        # IA perdia a menção que a pessoa realmente fez.
        candidate_words = [
            w for w in food_matcher.normalize(item["name"] + " " + match.name).split() if len(w) > 3
        ]
        user_named_it = any(w in text_norm for w in candidate_words)
        if not user_named_it and food_matcher.matches_allergen(match.name, allergies):
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
    return _run_turn(body.text, user)


@router.post("/audio")
async def send_audio(file: UploadFile = File(...), user: CurrentUser = CurrentUserDep):
    """
    Mesmo turno de conversa, só que falado (recurso do Pro, ver
    plan_limits.NOO_AUDIO_PLANS): o áudio é transcrito e o texto segue
    EXATAMENTE o mesmo caminho de uma mensagem digitada, inclusive
    consumindo uma mensagem do limite do dia.

    O áudio em si não é guardado em lugar nenhum: só a transcrição vira
    mensagem da conversa. A resposta devolve `transcript` pro chat mostrar
    o que foi entendido (a pessoa precisa poder conferir e corrigir).
    """
    profile = repository.get_profile(user)
    if not plan_limits.can_use_noo_audio(profile):
        raise HTTPException(status_code=403, detail="Mandar áudio pro Noo é um recurso do plano Pro.")
    # O MediaRecorder do navegador manda o codec junto ("audio/webm;codecs=opus"),
    # o tipo base é o que interessa aqui e é o que o Gemini espera.
    mime = (file.content_type or "").split(";")[0].strip().lower()
    if mime not in _AUDIO_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Formato de áudio não suportado.")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Áudio vazio.")
    if len(raw) > _MAX_AUDIO_BYTES:
        raise HTTPException(status_code=400, detail="Áudio muito longo (máximo 2 minutos).")

    # Limite do dia conferido ANTES de transcrever: a transcrição é uma
    # chamada de IA à parte, não faz sentido gastá-la num turno que o
    # _run_turn vai recusar logo depois de qualquer jeito.
    day_plan = repository.get_or_create_day_plan(user)
    if day_plan is None:
        raise HTTPException(status_code=409, detail="Monte sua dieta primeiro em /dieta.")
    _check_daily_limit(profile, day_plan)

    try:
        transcript = ai.transcribe_audio(raw, mime)
    except ai.AIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    transcript = transcript.strip()[:1000]
    if not transcript:
        raise HTTPException(status_code=422, detail="Não consegui entender o áudio. Tenta de novo?")

    # O áudio vai junto da mensagem pra pessoa conseguir reouvir o que ela
    # mesma falou (estilo WhatsApp) e conferir contra a transcrição. Some com
    # a conversa no fim do dia, ver repository.insert_noo_message.
    audio_url = f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"
    result = _run_turn(transcript, user, profile=profile, audio=audio_url)
    return {**result, "transcript": transcript, "audio": audio_url}


def _check_daily_limit(profile: dict | None, day_plan: dict) -> tuple[int, int]:
    """(usadas, limite) do dia, levantando 403 se a pessoa já bateu o teto."""
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
    return used, limit


def _run_turn(
    text: str, user: CurrentUser, profile: dict | None = None, audio: str | None = None,
) -> dict:
    """
    O turno de conversa em si, compartilhado pelo texto digitado e pelo áudio
    transcrito (ver send_message/send_audio): a partir daqui os dois são
    exatamente a mesma coisa, uma mensagem de texto da pessoa.
    """
    if profile is None:
        profile = repository.get_profile(user)
    day_plan = repository.get_or_create_day_plan(user)
    if day_plan is None:
        raise HTTPException(status_code=409, detail="Monte sua dieta primeiro em /dieta.")

    used, limit = _check_daily_limit(profile, day_plan)

    prefs = repository.get_preferences(user) or {}
    country = (profile or {}).get("country") or "BR"
    targets = _targets_for(profile, day_plan)

    history = [
        {"role": m["role"], "text": m["text"]}
        for m in repository.list_noo_messages_today(user)
    ] + [{"role": "user", "text": text}]

    try:
        answer = ai.noo_chat(
            history, day_plan["meals"], targets,
            diet_engine.day_macros(day_plan["meals"]), prefs,
        )
    except ai.AIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    # A mensagem do usuário só é gravada depois da IA responder: se a chamada
    # falhar, ela não consome uma das mensagens do dia.
    repository.insert_noo_message(user, "user", text, audio=audio)

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

    text_norm = food_matcher.normalize(text)
    changes: list[dict] = []
    unresolved_foods: list[str] = []
    for change in answer["changes"]:
        meal = find_meal(change["meal"])
        if meal is None:
            # Refeição nova: só vale a pena criar se há algo de fato pra
            # adicionar com quantidade já definida, senão não há o que fazer
            # com uma refeição vazia (ex: único item citado ficou esperando
            # a pessoa responder a quantidade, ver quantity vazio acima).
            if not any(a["quantity"].strip() for a in change["added"]):
                continue
            meal = new_meal(change["meal"], change.get("time") or "")
        skipped_names = [
            f["name"] for f in meal["foods"]
            if any(food_matcher.normalize(s) == food_matcher.normalize(f["name"]) for s in change["skipped"])
        ]
        # Rede de segurança determinística: uma refeição sendo esvaziada por
        # completo (tudo em skipped, nada em added) só faz sentido se a
        # pessoa mencionou essa refeição na mensagem atual. Já vimos o Noo
        # "ajudar" esvaziando refeições nunca citadas (ex: lanche e jantar
        # zerados numa mensagem que só falava de café e almoço), o motor
        # determinístico reajusta quantidade de refeição não tocada sozinho,
        # não precisa (e não pode) vir vazia da IA sem menção nenhuma.
        empties_meal = skipped_names and len(skipped_names) == len(meal["foods"]) and not change["added"]
        meal_words = [w for w in food_matcher.normalize(meal["name"]).split() if len(w) > 3]
        meal_mentioned = any(w in text_norm for w in meal_words)
        if empties_meal and not meal_mentioned:
            continue
        # Nada foi de fato pedido nessa refeição, só um item de "added" com
        # quantidade vazia esperando a pessoa responder (ver quantity vazio
        # acima). Diferente de um pedido que existiu mas foi filtrado depois
        # (ex: bloqueado por alergia): aí sim ainda vale marcar a refeição
        # como tocada e devolver o dia, só pra confirmar que nada mudou.
        had_intent = bool(change["skipped"]) or any(a["quantity"].strip() for a in change["added"])
        if not had_intent:
            continue
        changes.append({
            "meal_id": meal["id"],
            "skipped_names": skipped_names,
            "new_foods": _resolve_added(change["added"], prefs, country, text_norm, unresolved_foods),
        })

    result = None
    day_view = None
    if changes:
        already_eaten = [m["id"] for m in (find_meal(n) for n in answer["already_eaten"]) if m]
        result = diet_engine.apply_changes(day_plan, changes, already_eaten, targets)
        # Se o rebalanceamento normal não fechou a meta de calorias sozinho
        # (ex: teto de crescimento por alimento sem mais espaço, ver
        # diet_engine.calorie_tolerance), tenta um ajuste extra antes de
        # montar a tela, mesma rede de segurança das 3 funções manuais.
        day_topup.try_day_topup(result, user, day_plan.get("original_meals"))
        # Dia inteiro + o que mudou item a item, pronto pra tela (a pessoa
        # precisa ver o plano completo, não só um extrato das alterações).
        day_view = diet_engine.build_day_view(day_plan["meals"], result["adjusted_meals"])
        repository.update_day_plan_meals(user, day_plan["id"], result["adjusted_meals"])
        repository.insert_substitution_log(user, day_plan["id"], day_plan["plan_date"], {
            "action": "noo_chat",
            "description": text[:500],
            "meal_id": None,
            "matched_food": None,
            "match_confidence": None,
            "delta_calories": result.get("delta_calories"),
            "remaining_calories": result.get("remaining_calories"),
            "remaining_protein_g": result.get("remaining_protein_g"),
        })

    # Alimento que nem a TACO/extra nem a IA de estimativa nutricional
    # reconheceram: não dá pra aplicar (chutar macros seria pior que não
    # registrar), avisa a pessoa a cadastrar em Meus Alimentos em vez de só
    # silenciar. A reply da IA já foi gerada assumindo que aplicaria, então
    # o aviso entra à parte, depois.
    reply = answer["reply"]
    if unresolved_foods:
        names = ", ".join(dict.fromkeys(unresolved_foods))  # sem duplicata, mantém ordem
        plural = len(set(unresolved_foods)) > 1
        reply += (
            f"\n\nNão encontrei {'esses alimentos' if plural else 'esse alimento'} ({names}) na minha "
            f"base. Cadastra {'eles' if plural else 'ele'} em Meus Alimentos que na próxima eu já uso "
            "certinho."
        )

    # O snapshot do dia é guardado junto da resposta pra conversa reabrir
    # mostrando exatamente o que a pessoa viu quando o ajuste foi feito.
    repository.insert_noo_message(user, "assistant", reply, day_view)
    new_used = used + 1
    repository.record_noo_message_used(user, day_plan["id"], new_used)
    return {
        "reply": reply,
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
