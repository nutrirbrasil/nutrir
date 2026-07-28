"""
Camada de acesso a dados do Nootr (Supabase/PostgREST).

Todas as funções recebem o `CurrentUser` (que carrega o access_token) e operam
sob o RLS do usuário. O `user_id` é sempre derivado do usuário autenticado,
nunca do corpo do request.

Modelo: `profiles` (plano + dados corporais), `diets` (templates montados pelo
usuário, Basic tem 1 base; Pro pode ter até 7, uma por dia da semana),
`day_plans` (cópia materializada e ajustável do dia, onde as substituições
vivem) e `substitution_logs` (auditoria). A dieta NÃO é provisionada
automaticamente: usuário novo começa vazio e monta a própria dieta.
"""
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from backend.app.auth import CurrentUser
from backend.app import supabase_client

# "Dia" pro usuário é o dia civil no Brasil, não UTC (o servidor roda em UTC
# na VPS): sem isso, o dia viraria às 21h de Brasília (meia-noite UTC), não
# à meia-noite real, confundindo streak, limite diário do Noo e o reset da
# dieta do dia. TODO: quando o app tiver uso relevante fora do Brasil, trocar
# por um fuso por usuário (profile.country); hoje a TACO em si só cobre o
# Brasil, então um fuso fixo é a base certa.
_TZ = ZoneInfo("America/Sao_Paulo")

# E o dia vira às 3h, não à meia-noite: quem janta tarde (perto da meia-noite)
# ainda quer registrar um ajuste daquela refeição como parte do MESMO dia, não
# de um dia novo que mal começou.
_DAY_ROLLOVER_HOUR = 3


def _app_date(now: datetime) -> date:
    return (now - timedelta(hours=_DAY_ROLLOVER_HOUR)).date()

_PROFILE_FIELDS = "user_id,full_name,plan,billing_cycle,country,sex,age,weight_kg,height_cm,activity_level,formula,target_calories,protein_pct,carbs_pct,fat_pct,macro_mode,protein_g_per_kg,fat_g_per_kg,ai_diet_generated_at"
_PREFERENCES_FIELDS = "user_id,allergies,dislikes,likes,pantry,notes,meal_count,meal_times,meal_reminders"
_DIET_FIELDS = "id,name,weekday,daily_calories,daily_protein_g,daily_carbs_g,daily_fat_g,meals,status,source_meals"
_ADMIN_DIET_FIELDS = _DIET_FIELDS + ",user_id,created_at"
_DAY_PLAN_FIELDS = "id,diet_id,plan_date,name,daily_calories,daily_protein_g,daily_carbs_g,daily_fat_g,meals,previous_meals,original_meals"
_CUSTOM_FOOD_FIELDS = "id,user_id,name,kcal_100g,protein_100g,carbs_100g,fat_100g,fiber_100g,sodium_100mg,status,created_at"
_RECIPE_FIELDS = "id,user_id,name,ingredients,status,created_at"


def today_iso() -> str:
    return _app_date(datetime.now(_TZ)).isoformat()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_weekday() -> int:
    """0=segunda ... 6=domingo (convenção usada na coluna diets.weekday)."""
    return _app_date(datetime.now(_TZ)).weekday()


# ---------- profiles ----------

def get_profile(user: CurrentUser) -> dict | None:
    rows = supabase_client.select(
        "profiles",
        user.token,
        {"select": _PROFILE_FIELDS, "user_id": f"eq.{user.id}", "limit": "1"},
    )
    return rows[0] if rows else None


def upsert_profile(user: CurrentUser, patch: dict) -> dict:
    return supabase_client.upsert(
        "profiles",
        user.token,
        {"user_id": user.id, **patch},
        on_conflict="user_id",
    )


# ---------- preferences ----------

def get_preferences(user: CurrentUser) -> dict | None:
    rows = supabase_client.select(
        "preferences",
        user.token,
        {"select": _PREFERENCES_FIELDS, "user_id": f"eq.{user.id}", "limit": "1"},
    )
    return rows[0] if rows else None


def upsert_preferences(user: CurrentUser, patch: dict) -> dict:
    return supabase_client.upsert(
        "preferences",
        user.token,
        {"user_id": user.id, **patch},
        on_conflict="user_id",
    )


# ---------- diets ----------

def list_diets(user: CurrentUser) -> list[dict]:
    # "approved" só, uma dieta gerada por IA aguardando revisão (ver
    # insert_pending_diet) nunca aparece como "a dieta do usuário" enquanto
    # não passa pela fila em /aprovar.
    return supabase_client.select(
        "diets",
        user.token,
        {"select": _DIET_FIELDS, "user_id": f"eq.{user.id}", "status": "eq.approved", "order": "weekday.asc.nullsfirst"},
    )


def get_diet_by_slot(user: CurrentUser, weekday: int | None) -> dict | None:
    params = {"select": _DIET_FIELDS, "user_id": f"eq.{user.id}", "status": "eq.approved", "limit": "1"}
    params["weekday"] = "is.null" if weekday is None else f"eq.{weekday}"
    rows = supabase_client.select("diets", user.token, params)
    return rows[0] if rows else None


def get_pending_diet(user: CurrentUser) -> dict | None:
    """Dieta gerada por IA aguardando revisão do usuário logado, se houver."""
    rows = supabase_client.select(
        "diets",
        user.token,
        {"select": _DIET_FIELDS, "user_id": f"eq.{user.id}", "status": "eq.pending_review", "limit": "1"},
    )
    return rows[0] if rows else None


def insert_pending_diet(user: CurrentUser, payload: dict) -> dict:
    """
    Insere uma dieta gerada por IA aguardando revisão (weekday=None,
    status=pending_review), SEM o upsert-por-slot de `save_diet`: não pode
    sobrescrever a dieta aprovada que já existe nesse slot enquanto a
    revisão não termina, as duas coexistem até a aprovação substituir a
    antiga (ver admin_approve_diet).
    """
    return supabase_client.insert(
        "diets",
        user.token,
        {"user_id": user.id, "weekday": None, "status": "pending_review", **payload},
    )


def save_diet(user: CurrentUser, weekday: int | None, payload: dict) -> dict:
    """Cria ou substitui a dieta do slot (base ou dia da semana)."""
    existing = get_diet_by_slot(user, weekday)
    if existing:
        return supabase_client.update(
            "diets",
            user.token,
            {"id": f"eq.{existing['id']}", "user_id": f"eq.{user.id}"},
            payload,
        )
    return supabase_client.insert(
        "diets",
        user.token,
        {"user_id": user.id, "weekday": weekday, **payload},
    )


def delete_diet(user: CurrentUser, diet_id: str) -> None:
    supabase_client.delete(
        "diets",
        user.token,
        {"id": f"eq.{diet_id}", "user_id": f"eq.{user.id}"},
    )


def delete_all_diets(user: CurrentUser) -> None:
    """Apaga todas as dietas do usuário (todos os slots, base e dias da semana)."""
    supabase_client.delete(
        "diets",
        user.token,
        {"user_id": f"eq.{user.id}"},
    )


def get_diet(user: CurrentUser, diet_id: str) -> dict | None:
    rows = supabase_client.select(
        "diets", user.token,
        {"select": _DIET_FIELDS, "id": f"eq.{diet_id}", "user_id": f"eq.{user.id}", "limit": "1"},
    )
    return rows[0] if rows else None


def restore_diet(user: CurrentUser, diet_id: str, meals: list[dict], totals: dict) -> dict:
    """
    Devolve a dieta à versão que o Nootr entregou (`source_meals`, gravado na
    aprovação, ver admin_approve_diet). `source_meals` NÃO é apagado: o
    usuário pode editar de novo e restaurar de novo quantas vezes quiser.
    """
    return supabase_client.update(
        "diets",
        user.token,
        {"id": f"eq.{diet_id}", "user_id": f"eq.{user.id}"},
        {
            "meals": meals,
            "daily_calories": round(totals["calories"]),
            "daily_protein_g": round(totals["protein_g"]),
            "daily_carbs_g": round(totals["carbs_g"]),
            "daily_fat_g": round(totals["fat_g"]),
        },
    )


def diet_for_today(user: CurrentUser) -> dict | None:
    """Pro: dieta do dia da semana atual, com fallback para a base."""
    diet = get_diet_by_slot(user, today_weekday())
    if diet:
        return diet
    return get_diet_by_slot(user, None)


# ---------- day plans ----------

def get_day_plan(user: CurrentUser, plan_date: str | None = None) -> dict | None:
    plan_date = plan_date or today_iso()
    rows = supabase_client.select(
        "day_plans",
        user.token,
        {"select": _DAY_PLAN_FIELDS, "user_id": f"eq.{user.id}", "plan_date": f"eq.{plan_date}", "limit": "1"},
    )
    return rows[0] if rows else None


def get_or_create_day_plan(user: CurrentUser, plan_date: str | None = None) -> dict | None:
    """
    Plano do dia (materializado). Na primeira consulta do dia, cria uma cópia
    da dieta aplicável (dia da semana → base). Devolve None se o usuário ainda
    não montou nenhuma dieta, o chamador decide o estado vazio.
    """
    plan_date = plan_date or today_iso()
    existing = get_day_plan(user, plan_date)
    if existing:
        return existing

    diet = diet_for_today(user)
    if diet is None:
        return None

    return supabase_client.insert(
        "day_plans",
        user.token,
        {
            "user_id": user.id,
            "diet_id": diet["id"],
            "plan_date": plan_date,
            "name": diet["name"],
            "daily_calories": diet["daily_calories"],
            "daily_protein_g": diet["daily_protein_g"],
            "daily_carbs_g": diet["daily_carbs_g"],
            "daily_fat_g": diet["daily_fat_g"],
            "meals": diet["meals"],
            # Porção original de cada alimento no dia, nunca reescrita depois
            # (ver diet_engine._cap_total_growth): sem isso, o teto de
            # crescimento de porção comparava contra o estado da ÚLTIMA
            # mensagem/ajuste, e sucessivos ajustes no mesmo dia inflavam um
            # alimento bem além do razoável mesmo cada um respeitando o teto.
            "original_meals": diet["meals"],
        },
    )


def delete_day_plan(user: CurrentUser, plan_date: str) -> None:
    """Descarta o plano materializado (ex: após editar a dieta do slot do dia)."""
    supabase_client.delete(
        "day_plans",
        user.token,
        {"user_id": f"eq.{user.id}", "plan_date": f"eq.{plan_date}"},
    )


def day_plan_dates(user: CurrentUser, since: str) -> list[str]:
    """
    Datas (ISO) em que o usuário teve plano do dia materializado a partir de
    `since`. O plano nasce na primeira vez que a pessoa abre a dieta do dia
    (ver get_or_create_day_plan), então cada data aqui é um dia em que ela
    de fato usou o app, que é o sinal da sequência de check-in.
    """
    rows = supabase_client.select(
        "day_plans",
        user.token,
        {"select": "plan_date", "user_id": f"eq.{user.id}",
         "plan_date": f"gte.{since}", "order": "plan_date.desc"},
    )
    return [r["plan_date"] for r in rows if r.get("plan_date")]


def update_day_plan_meals(
    user: CurrentUser, day_plan_id: str, meals: list[dict], previous_meals: list[dict] | None = None,
) -> dict:
    """
    Grava o plano do dia ajustado. `previous_meals` guarda como o dia estava
    ANTES deste ajuste, o que habilita o "desfazer" (ver undo_day_plan): é um
    passo só, pra corrigir um registro que saiu errado, não um histórico.
    """
    payload: dict = {"meals": meals}
    if previous_meals is not None:
        payload["previous_meals"] = previous_meals
    return supabase_client.update(
        "day_plans",
        user.token,
        {"id": f"eq.{day_plan_id}", "user_id": f"eq.{user.id}"},
        payload,
    )


def undo_day_plan(user: CurrentUser, day_plan_id: str, previous_meals: list[dict]) -> dict:
    """
    Volta o plano do dia pro estado anterior ao último ajuste e limpa o
    snapshot, então o desfazer não se acumula: depois de desfazer uma vez não
    há mais o que desfazer até o próximo ajuste.
    """
    return supabase_client.update(
        "day_plans",
        user.token,
        {"id": f"eq.{day_plan_id}", "user_id": f"eq.{user.id}"},
        {"meals": previous_meals, "previous_meals": None},
    )


# ---------- custom foods (alimentos adicionados manualmente pelo usuário) ----------
# Ficam permanentes na conta do usuário (reaproveitáveis em qualquer refeição/dieta,
# via busca) e nascem "pending", revisão manual decide se entram na TACO geral
# (ver taco_extra.csv). O usuário já pode usar o próprio item livremente enquanto
# aguarda: o status é só informativo pra ele, não bloqueia nada.

def list_custom_foods(user: CurrentUser) -> list[dict]:
    return supabase_client.select(
        "custom_foods",
        user.token,
        {"select": _CUSTOM_FOOD_FIELDS, "user_id": f"eq.{user.id}", "order": "created_at.desc"},
    )


def search_custom_foods(user: CurrentUser, query: str, limit: int = 8) -> list[dict]:
    escaped = query.replace(",", " ").replace("*", " ")
    return supabase_client.select(
        "custom_foods",
        user.token,
        {
            "select": _CUSTOM_FOOD_FIELDS,
            "user_id": f"eq.{user.id}",
            "name": f"ilike.*{escaped}*",
            "limit": str(limit),
        },
    )


def insert_custom_food(user: CurrentUser, payload: dict) -> dict:
    return supabase_client.insert(
        "custom_foods",
        user.token,
        {"user_id": user.id, "status": "pending", **payload},
    )


def delete_custom_food(user: CurrentUser, food_id: str) -> None:
    supabase_client.delete(
        "custom_foods",
        user.token,
        {"id": f"eq.{food_id}", "user_id": f"eq.{user.id}"},
    )


def search_global_custom_foods(user: CurrentUser, query: str, limit: int = 8) -> list[dict]:
    """
    Alimentos customizados aprovados de OUTROS usuários, a policy RLS
    "custom_foods_select_approved_global" libera a leitura cross-user só pra
    linhas com status=approved (ver list_global_recipes acima pro mesmo padrão).
    """
    escaped = query.replace(",", " ").replace("*", " ")
    return supabase_client.select(
        "custom_foods",
        user.token,
        {
            "select": _CUSTOM_FOOD_FIELDS,
            "status": "eq.approved",
            "user_id": f"neq.{user.id}",
            "name": f"ilike.*{escaped}*",
            "limit": str(limit),
        },
    )


# ---------- receitas (pratos compostos salvos pelo usuário) ----------
# Um "atalho" reaproveitável: a pessoa confirma os ingredientes de um prato
# que a IA decompôs (ex: crepioca) e pode salvar pra não precisar confirmar
# de novo da próxima vez, ver ai.gemini._CONVERSE_SYSTEM (recebe as receitas
# salvas como contexto e usa os ingredientes exatos em vez de adivinhar).

def list_recipes(user: CurrentUser) -> list[dict]:
    return supabase_client.select(
        "recipes",
        user.token,
        {"select": _RECIPE_FIELDS, "user_id": f"eq.{user.id}", "order": "created_at.desc"},
    )


def insert_recipe(user: CurrentUser, name: str, ingredients: list[dict]) -> dict:
    return supabase_client.insert(
        "recipes",
        user.token,
        # Nasce "pending", só aparece pra outros usuários depois de aprovada
        # em /aprovar (ver routes/nootr/admin.py), mesmo padrão de custom_foods.
        {"user_id": user.id, "name": name, "ingredients": ingredients, "status": "pending"},
    )


def delete_recipe(user: CurrentUser, recipe_id: str) -> None:
    supabase_client.delete(
        "recipes",
        user.token,
        {"id": f"eq.{recipe_id}", "user_id": f"eq.{user.id}"},
    )


def list_global_recipes(user: CurrentUser) -> list[dict]:
    """
    Receitas aprovadas de QUALQUER usuário (exceto as próprias, já listadas
    separadamente em list_recipes), a policy RLS "recipes_select_approved_global"
    libera a leitura cross-user só pra linhas com status=approved.
    """
    return supabase_client.select(
        "recipes",
        user.token,
        {
            "select": _RECIPE_FIELDS,
            "status": "eq.approved",
            "user_id": f"neq.{user.id}",
            "order": "created_at.desc",
        },
    )


# ---------- admin (fila de aprovação global, ver routes/nootr/admin.py) ----------
# Sem filtro de user_id no select/update: a policy RLS "*_admin_all" (liberada
# só quando auth.email() é o email fixo do admin) é quem garante o acesso
# cross-user, não o código Python, o backend continua nunca usando a
# service key (repassa o token do próprio admin, como em qualquer outra rota).

def admin_emails_for(admin: CurrentUser, user_ids: list[str]) -> dict[str, str]:
    """
    Mapa user_id -> email pra exibir na fila de aprovação (ver
    app/aprovar/page.tsx), em vez do uuid puro. Usa a view
    `admin_user_emails` (migration add_admin_user_emails_view), que só
    devolve linhas quando quem consulta é o próprio admin (mesmo gate
    auth.email() das policies *_admin_all), nunca a service key.
    """
    ids = sorted({uid for uid in user_ids if uid})
    if not ids:
        return {}
    rows = supabase_client.select(
        "admin_user_emails",
        admin.token,
        {"select": "user_id,email", "user_id": f"in.({','.join(ids)})"},
    )
    return {r["user_id"]: r["email"] for r in rows}


def admin_get_profile(admin: CurrentUser, user_id: str) -> dict | None:
    """
    Perfil de qualquer usuário, usado só pelo "Refazer" da dieta pendente (ver
    admin.py regenerate_pending_diet), depende da policy SELECT-only
    `profiles_admin_select` (migration add_admin_select_profiles_preferences),
    o admin nunca precisa escrever no perfil de outra pessoa.
    """
    rows = supabase_client.select(
        "profiles", admin.token, {"select": _PROFILE_FIELDS, "user_id": f"eq.{user_id}", "limit": "1"},
    )
    return rows[0] if rows else None


def admin_get_preferences(admin: CurrentUser, user_id: str) -> dict | None:
    """Preferências de qualquer usuário, mesmo uso/policy que admin_get_profile acima."""
    rows = supabase_client.select(
        "preferences", admin.token, {"select": _PREFERENCES_FIELDS, "user_id": f"eq.{user_id}", "limit": "1"},
    )
    return rows[0] if rows else None


def admin_list_pending_recipes(admin: CurrentUser) -> list[dict]:
    return supabase_client.select(
        "recipes",
        admin.token,
        {"select": _RECIPE_FIELDS, "status": "eq.pending", "order": "created_at.desc"},
    )


def admin_update_recipe_status(admin: CurrentUser, recipe_id: str, status: str) -> dict:
    return supabase_client.update(
        "recipes", admin.token, {"id": f"eq.{recipe_id}"}, {"status": status},
    )


def admin_list_pending_custom_foods(admin: CurrentUser) -> list[dict]:
    return supabase_client.select(
        "custom_foods",
        admin.token,
        {"select": _CUSTOM_FOOD_FIELDS, "status": "eq.pending", "order": "created_at.desc"},
    )


def admin_update_custom_food_status(admin: CurrentUser, food_id: str, status: str) -> dict:
    return supabase_client.update(
        "custom_foods", admin.token, {"id": f"eq.{food_id}"}, {"status": status},
    )


def admin_list_pending_diets(admin: CurrentUser) -> list[dict]:
    return supabase_client.select(
        "diets",
        admin.token,
        {"select": _ADMIN_DIET_FIELDS, "status": "eq.pending_review", "order": "created_at.asc"},
    )


def admin_get_diet(admin: CurrentUser, diet_id: str) -> dict | None:
    rows = supabase_client.select(
        "diets", admin.token, {"select": _ADMIN_DIET_FIELDS, "id": f"eq.{diet_id}", "limit": "1"},
    )
    return rows[0] if rows else None


def admin_update_diet_meals(admin: CurrentUser, diet_id: str, meals: list[dict], totals: dict) -> dict:
    return supabase_client.update(
        "diets", admin.token, {"id": f"eq.{diet_id}"},
        {
            "meals": meals,
            "daily_calories": round(totals["calories"]),
            "daily_protein_g": round(totals["protein_g"]),
            "daily_carbs_g": round(totals["carbs_g"]),
            "daily_fat_g": round(totals["fat_g"]),
        },
    )


def admin_approve_diet(admin: CurrentUser, diet_id: str) -> dict | None:
    """
    Aprova a dieta pendente e promove ela a "a" dieta ativa do slot, remove
    qualquer outra dieta aprovada que já ocupasse o mesmo slot (user_id +
    weekday) pra não haver ambiguidade sobre qual vale (ver insert_pending_diet:
    a pendente nasce numa linha própria, sem sobrescrever a aprovada antiga).

    Devolve None se a dieta não existe, pra rota responder 404 em vez de
    fingir sucesso (o frontend tira o item da fila ao receber 200).
    """
    diet = admin_get_diet(admin, diet_id)
    if diet is None:
        return None
    weekday_filter = "is.null" if diet.get("weekday") is None else f"eq.{diet['weekday']}"
    supabase_client.delete(
        "diets", admin.token,
        {"user_id": f"eq.{diet['user_id']}", "weekday": weekday_filter, "status": "eq.approved"},
    )
    # Guarda a versão entregue como `source_meals`: o usuário edita `meals`
    # à vontade depois e continua podendo voltar pra essa (ver restore_diet).
    return supabase_client.update(
        "diets", admin.token, {"id": f"eq.{diet_id}"},
        {"status": "approved", "source_meals": diet["meals"]},
    )


def admin_reject_diet(admin: CurrentUser, diet_id: str) -> None:
    supabase_client.delete("diets", admin.token, {"id": f"eq.{diet_id}"})


def count_substitutions_on(user: CurrentUser, plan_date: str) -> int:
    """Quantas substituições o usuário já registrou nesse dia (limite do Basic)."""
    rows = supabase_client.select(
        "substitution_logs",
        user.token,
        {"select": "id", "plan_date": f"eq.{plan_date}"},
    )
    return len(rows)


def count_recipes(user: CurrentUser) -> int:
    """Quantas receitas o usuário tem salvas (limite do Basic)."""
    rows = supabase_client.select("recipes", user.token, {"select": "id"})
    return len(rows)


def insert_substitution_log(user: CurrentUser, day_plan_id: str, plan_date: str, payload: dict) -> dict:
    return supabase_client.insert(
        "substitution_logs",
        user.token,
        {
            "user_id": user.id,
            "day_plan_id": day_plan_id,
            "plan_date": plan_date,
            "action": payload["action"],
            "description": payload["description"],
            "meal_id": payload.get("meal_id"),
            "matched_food": payload.get("matched_food"),
            "match_confidence": payload.get("match_confidence"),
            "delta_calories": payload.get("delta_calories"),
            "remaining_calories": payload.get("remaining_calories"),
            "remaining_protein_g": payload.get("remaining_protein_g"),
        },
    )


# ---------- Noo (chat) ----------

_NOO_FIELDS = "id,role,text,changes,created_at"


def count_noo_messages_today(user: CurrentUser) -> int:
    """Quantas mensagens o usuário JÁ ENVIOU hoje (só as dele contam pro limite)."""
    rows = supabase_client.select(
        "noo_messages",
        user.token,
        {"select": "id", "msg_date": f"eq.{today_iso()}", "role": "eq.user"},
    )
    return len(rows)


def list_noo_messages_today(user: CurrentUser) -> list[dict]:
    """Conversa do dia, em ordem cronológica (o chat reabre onde parou)."""
    return supabase_client.select(
        "noo_messages",
        user.token,
        {"select": _NOO_FIELDS, "user_id": f"eq.{user.id}",
         "msg_date": f"eq.{today_iso()}", "order": "created_at.asc"},
    )


def insert_noo_message(user: CurrentUser, role: str, text: str, changes: list | None = None) -> dict:
    return supabase_client.insert(
        "noo_messages",
        user.token,
        {"user_id": user.id, "msg_date": today_iso(), "role": role, "text": text, "changes": changes},
    )


def delete_noo_messages_today(user: CurrentUser) -> None:
    """Limpa a conversa do dia. O limite diário NÃO é devolvido: ele conta
    chamadas de IA já feitas, não mensagens visíveis na tela."""
    supabase_client.delete(
        "noo_messages",
        user.token,
        {"user_id": f"eq.{user.id}", "msg_date": f"eq.{today_iso()}"},
    )
