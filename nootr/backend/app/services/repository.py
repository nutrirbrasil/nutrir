"""
Camada de acesso a dados do Nootr (Supabase/PostgREST).

Todas as funções recebem o `CurrentUser` (que carrega o access_token) e operam
sob o RLS do usuário. O `user_id` é sempre derivado do usuário autenticado,
nunca do corpo do request.

Modelo: `profiles` (plano + dados corporais), `diets` (templates montados pelo
usuário — Basic tem 1 base; Pro pode ter até 7, uma por dia da semana),
`day_plans` (cópia materializada e ajustável do dia — onde as substituições
vivem) e `substitution_logs` (auditoria). A dieta NÃO é provisionada
automaticamente: usuário novo começa vazio e monta a própria dieta.
"""
from datetime import date

from backend.app.auth import CurrentUser
from backend.app import supabase_client

_PROFILE_FIELDS = "user_id,plan,sex,age,weight_kg,height_cm,activity_level,formula,target_calories,protein_pct,carbs_pct,fat_pct"
_PREFERENCES_FIELDS = "user_id,allergies,dislikes,likes,pantry,notes"
_DIET_FIELDS = "id,name,weekday,daily_calories,daily_protein_g,daily_carbs_g,daily_fat_g,meals"
_DAY_PLAN_FIELDS = "id,diet_id,plan_date,name,daily_calories,daily_protein_g,daily_carbs_g,daily_fat_g,meals"


def today_iso() -> str:
    return date.today().isoformat()


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
    return supabase_client.select(
        "diets",
        user.token,
        {"select": _DIET_FIELDS, "user_id": f"eq.{user.id}", "order": "weekday.asc.nullsfirst"},
    )


def get_diet_by_slot(user: CurrentUser, weekday: int | None) -> dict | None:
    params = {"select": _DIET_FIELDS, "user_id": f"eq.{user.id}", "limit": "1"}
    params["weekday"] = "is.null" if weekday is None else f"eq.{weekday}"
    rows = supabase_client.select("diets", user.token, params)
    return rows[0] if rows else None


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
    """Apaga todas as dietas do usuário (todos os slots — base e dias da semana)."""
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
    não montou nenhuma dieta — o chamador decide o estado vazio.
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
