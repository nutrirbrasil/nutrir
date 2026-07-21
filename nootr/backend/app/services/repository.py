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
from datetime import date, datetime, timezone

from backend.app.auth import CurrentUser
from backend.app import supabase_client

_PROFILE_FIELDS = "user_id,plan,billing_cycle,country,sex,age,weight_kg,height_cm,activity_level,formula,target_calories,protein_pct,carbs_pct,fat_pct,ai_diet_generated_at"
_PREFERENCES_FIELDS = "user_id,allergies,dislikes,likes,pantry,notes"
_DIET_FIELDS = "id,name,weekday,daily_calories,daily_protein_g,daily_carbs_g,daily_fat_g,meals,status"
_ADMIN_DIET_FIELDS = _DIET_FIELDS + ",user_id,created_at"
_DAY_PLAN_FIELDS = "id,diet_id,plan_date,name,daily_calories,daily_protein_g,daily_carbs_g,daily_fat_g,meals"
_CUSTOM_FOOD_FIELDS = "id,user_id,name,kcal_100g,protein_100g,carbs_100g,fat_100g,fiber_100g,sodium_100mg,status,created_at"
_RECIPE_FIELDS = "id,user_id,name,ingredients,status,created_at"


def today_iso() -> str:
    return date.today().isoformat()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_weekday() -> int:
    """0=segunda ... 6=domingo (convenção usada na coluna diets.weekday)."""
    return date.today().weekday()


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


def clear_diet(user: CurrentUser, diet_id: str) -> dict:
    """Esvazia os alimentos de uma dieta (mantém nome/dia da semana)."""
    return supabase_client.update(
        "diets",
        user.token,
        {"id": f"eq.{diet_id}", "user_id": f"eq.{user.id}"},
        {"meals": [], "daily_calories": 0, "daily_protein_g": 0, "daily_carbs_g": 0, "daily_fat_g": 0},
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
        },
    )


def delete_day_plan(user: CurrentUser, plan_date: str) -> None:
    """Descarta o plano materializado (ex: após editar a dieta do slot do dia)."""
    supabase_client.delete(
        "day_plans",
        user.token,
        {"user_id": f"eq.{user.id}", "plan_date": f"eq.{plan_date}"},
    )


def update_day_plan_meals(user: CurrentUser, day_plan_id: str, meals: list[dict]) -> dict:
    return supabase_client.update(
        "day_plans",
        user.token,
        {"id": f"eq.{day_plan_id}", "user_id": f"eq.{user.id}"},
        {"meals": meals},
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


def admin_approve_diet(admin: CurrentUser, diet_id: str) -> dict:
    """
    Aprova a dieta pendente e promove ela a "a" dieta ativa do slot, remove
    qualquer outra dieta aprovada que já ocupasse o mesmo slot (user_id +
    weekday) pra não haver ambiguidade sobre qual vale (ver insert_pending_diet:
    a pendente nasce numa linha própria, sem sobrescrever a aprovada antiga).
    """
    diet = admin_get_diet(admin, diet_id)
    if diet is None:
        return {}
    weekday_filter = "is.null" if diet.get("weekday") is None else f"eq.{diet['weekday']}"
    supabase_client.delete(
        "diets", admin.token,
        {"user_id": f"eq.{diet['user_id']}", "weekday": weekday_filter, "status": "eq.approved"},
    )
    return supabase_client.update(
        "diets", admin.token, {"id": f"eq.{diet_id}"}, {"status": "approved"},
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
