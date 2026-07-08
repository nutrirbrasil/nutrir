"""
Rotas Nootr — dietas montadas pelo usuário.

A dieta nasce vazia: o usuário monta as refeições escolhendo alimentos da TACO
com quantidades. Basic salva 1 dieta base (vale todos os dias, weekday=None);
Pro salva uma por dia da semana (0=segunda..6=domingo) — sem conceito de
"base" na UI do Pro, os 7 dias são preenchidos individualmente (ou copiando de
outro dia, ou via importação de PDF/Word/Excel, que distribui o(s) cardápio(s)
do documento pelos 7 dias).
"""
import io

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from markitdown import MarkItDown
from pydantic import BaseModel, Field

from backend.app.auth import CurrentUser, CurrentUserDep
from backend.app.services import ai, food_matcher, repository
from backend.app.services.nutrition import resolve_food, scale_food
from backend.app.services.portion import parse_portion

router = APIRouter(prefix="/nootr/diets", tags=["Nootr - Dietas"])

WEEKDAY_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]


class FoodIn(BaseModel):
    grams: float = Field(gt=0, le=3000)
    quantity_label: str | None = Field(default=None, max_length=60)
    taco_id: int | None = None
    name: str | None = Field(default=None, max_length=120)
    kcal_100g: float | None = Field(default=None, ge=0, le=1000)
    protein_100g: float | None = Field(default=None, ge=0, le=100)
    carbs_100g: float | None = Field(default=None, ge=0, le=100)
    fat_100g: float | None = Field(default=None, ge=0, le=100)


class MealIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    time: str = Field(pattern=r"^\d{2}:\d{2}$")
    foods: list[FoodIn] = Field(min_length=1)


class DietIn(BaseModel):
    name: str = Field(default="Minha dieta", min_length=1, max_length=80)
    weekday: int | None = Field(default=None, ge=0, le=6)
    target_calories: float | None = Field(default=None, gt=0, le=10000)
    meals: list[MealIn] = Field(min_length=1, max_length=10)


_MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15MB


def _build_meals(meals_in: list[MealIn]) -> tuple[list[dict], dict]:
    """Materializa as refeições (TACO ou customizado); devolve (meals, totais)."""
    totals = {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0}
    meals: list[dict] = []
    # Mantém a ordem enviada (o usuário pode ter reordenado manualmente).
    for i, meal_in in enumerate(meals_in, start=1):
        foods = []
        for food_in in meal_in.foods:
            scaled = resolve_food(food_in)
            if scaled is None:
                raise HTTPException(status_code=400, detail=f"Alimento TACO {food_in.taco_id} não existe")
            foods.append(scaled)
            for k in totals:
                totals[k] += scaled[k]
        meals.append({"id": f"meal-{i}", "name": meal_in.name, "time": meal_in.time, "foods": foods})
    return meals, totals


def _as_diet(day_plan: dict, user: CurrentUser) -> dict:
    return {
        "id": day_plan["id"],
        "user_id": user.id,
        "name": day_plan["name"],
        "daily_calories": day_plan["daily_calories"],
        "daily_protein_g": day_plan["daily_protein_g"],
        "daily_carbs_g": day_plan["daily_carbs_g"],
        "daily_fat_g": day_plan["daily_fat_g"],
        "meals": day_plan["meals"],
    }


@router.get("/today")
def get_today_diet(user: CurrentUser = CurrentUserDep):
    day_plan = repository.get_or_create_day_plan(user)
    if day_plan is None:
        # Usuário ainda não montou nenhuma dieta: estado vazio, não é erro.
        return {"date": repository.today_iso(), "diet": None, "needs_setup": True}
    return {"date": day_plan["plan_date"], "diet": _as_diet(day_plan, user), "needs_setup": False}


@router.get("")
def list_diets(user: CurrentUser = CurrentUserDep):
    diets = repository.list_diets(user)
    profile = repository.get_profile(user)
    return {
        "plan": (profile or {}).get("plan", "basic"),
        "diets": diets,
        "weekday_labels": WEEKDAY_LABELS,
    }


@router.post("")
def save_diet(body: DietIn, user: CurrentUser = CurrentUserDep):
    profile = repository.get_profile(user)
    plan = (profile or {}).get("plan", "basic")

    if body.weekday is not None and plan != "pro":
        raise HTTPException(
            status_code=403,
            detail="Dietas por dia da semana são do plano Pro. No Basic você tem 1 dieta base.",
        )

    meals, totals = _build_meals(body.meals)
    payload = {
        "name": body.name,
        "daily_calories": body.target_calories or round(totals["calories"]),
        "daily_protein_g": round(totals["protein_g"]),
        "daily_carbs_g": round(totals["carbs_g"]),
        "daily_fat_g": round(totals["fat_g"]),
        "meals": meals,
        "is_active": True,
    }
    diet = repository.save_diet(user, body.weekday, payload)

    # Se a dieta editada é a que vale para hoje, descarta o plano do dia já
    # materializado para que /today reflita a edição.
    applies_today = body.weekday is None or body.weekday == repository.today_weekday()
    if applies_today:
        repository.delete_day_plan(user, repository.today_iso())

    return diet


def _norm_time(value: str) -> str:
    """Normaliza 'H:MM'/'HH:MM' -> 'HH:MM'; qualquer outra coisa vira 12:00."""
    import re
    m = re.match(r"^(\d{1,2}):(\d{2})$", (value or "").strip())
    if not m:
        return "12:00"
    h = min(23, int(m.group(1)))
    return f"{h:02d}:{m.group(2)}"


_ALLOWED_EXTENSIONS = (".pdf", ".docx", ".xlsx")
_MARKITDOWN = MarkItDown()


def _extract_ext(filename: str) -> str | None:
    filename = (filename or "").lower()
    return next((ext for ext in _ALLOWED_EXTENSIONS if filename.endswith(ext)), None)


def _extract_document_text(raw: bytes, ext: str) -> str:
    """
    Converte o documento (PDF/Word/Excel) pra Markdown via MarkItDown — mantém
    a estrutura de tabelas (refeição/horário/alimento/quantidade) legível pra
    IA, ao contrário de extração de texto cru, que embaralha colunas.
    """
    try:
        result = _MARKITDOWN.convert_stream(io.BytesIO(raw), file_extension=ext)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Não foi possível abrir o arquivo: {exc}") from exc
    text = result.text_content
    if len(text.strip()) < 20:
        raise HTTPException(
            status_code=422,
            detail="Não encontrei texto no documento — se for um PDF escaneado (imagem), ainda não conseguimos ler.",
        )
    return text


def _profile_patch_from_targets(targets: dict, fallback_calories: float) -> dict:
    """
    Converte as metas nutricionais extraídas do PDF (calorias e/ou % e/ou
    gramas totais de macro) num patch para o perfil. Se só houver gramas
    totais (sem %), calcula o % a partir das calorias diárias — as do próprio
    PDF, ou o total somado dos alimentos importados como fallback. Não inclui
    chave nenhuma que o PDF não tenha mencionado.
    """
    patch: dict = {}
    daily_calories = targets.get("daily_calories")
    if daily_calories:
        patch["target_calories"] = round(daily_calories)
        patch["formula"] = "manual"

    protein_pct = targets.get("protein_pct")
    carbs_pct = targets.get("carbs_pct")
    fat_pct = targets.get("fat_pct")

    if protein_pct is None and carbs_pct is None and fat_pct is None:
        base_calories = daily_calories or fallback_calories
        protein_g, carbs_g, fat_g = targets.get("protein_g"), targets.get("carbs_g"), targets.get("fat_g")
        if base_calories and any(v is not None for v in (protein_g, carbs_g, fat_g)):
            protein_pct = (protein_g or 0) * 4 / base_calories * 100
            carbs_pct = (carbs_g or 0) * 4 / base_calories * 100
            fat_pct = (fat_g or 0) * 9 / base_calories * 100

    if protein_pct is not None and carbs_pct is not None and fat_pct is not None:
        patch["protein_pct"] = round(protein_pct)
        patch["carbs_pct"] = round(carbs_pct)
        patch["fat_pct"] = round(fat_pct)

    return patch


def _assign_weekdays(menus: list[dict]) -> dict[int, int]:
    """
    Decide qual cardápio (índice em `menus`) vale para cada dia 0-6.

    - 1 cardápio: vale para todos os 7 dias.
    - vários cardápios: os dias que algum cardápio reivindicou explicitamente
      (`days`, vindo do PDF) são respeitados; os dias restantes são
      distribuídos intercalados entre os cardápios que NÃO especificaram dias
      (ex: 2 cardápios sem dia -> seg=0, ter=1, qua=0, qui=1...).
    """
    n = len(menus)
    if n == 0:
        return {}
    if n == 1:
        return {d: 0 for d in range(7)}

    assignment: dict[int, int] = {}
    for i, menu in enumerate(menus):
        for d in menu.get("days") or []:
            assignment[d] = i

    unclaimed = [d for d in range(7) if d not in assignment]
    pool = [i for i, m in enumerate(menus) if not m.get("days")] or list(range(n))
    for j, d in enumerate(unclaimed):
        assignment[d] = pool[j % len(pool)]
    return assignment


def _merge_preference_list(existing: list[str], new: list[str]) -> list[str]:
    seen = {item.lower() for item in existing}
    merged = list(existing)
    for item in new:
        if item.lower() not in seen:
            merged.append(item)
            seen.add(item.lower())
    return merged


@router.post("/import")
async def import_diet(
    file: UploadFile = File(...),
    name: str = Form(default="Dieta importada"),
    user: CurrentUser = CurrentUserDep,
):
    """
    Pro: a IA lê o documento da dieta montada pela nutricionista (PDF, Word ou
    Excel) — extrai o(s) cardápio(s) (a maioria dos documentos tem só um;
    alguns trazem mais de um, ex: treino/descanso ou semana/fim de semana) E
    qualquer contexto do paciente que o documento carregue (alergias,
    substituições já sugeridas, gostos/não-gostos) —, distribui os cardápios
    pelos 7 dias da semana (respeitando os dias que o documento disser
    explicitamente, intercalando o resto) e atualiza as preferências do
    usuário.
    """
    profile = repository.get_profile(user)
    if (profile or {}).get("plan") != "pro":
        raise HTTPException(status_code=403, detail="Importar dieta é um recurso do plano Pro.")
    ext = _extract_ext(file.filename or "")
    if ext is None:
        raise HTTPException(status_code=400, detail="Envie um arquivo PDF, Word (.docx) ou Excel (.xlsx).")

    raw = await file.read()
    if len(raw) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Arquivo muito grande (máximo 15MB).")

    text = _extract_document_text(raw, ext)

    try:
        parsed = ai.parse_diet_document(text)
    except ai.AIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    menus_parsed = parsed.get("menus") or []
    if not menus_parsed:
        raise HTTPException(status_code=422, detail="Não consegui interpretar nenhum cardápio no PDF.")

    unmatched: list[str] = []
    menus_built: list[dict] = []  # [{"label", "days", "meals", "totals"}]
    for menu in menus_parsed:
        meals_in: list[MealIn] = []
        for m in menu["meals"]:
            foods_in: list[FoodIn] = []
            for f in m["foods"]:
                matches = food_matcher.search_taco(f["name"], limit=1)
                if not matches:
                    unmatched.append(f["name"])
                    continue
                grams = parse_portion(f["quantity"]) or 100.0
                foods_in.append(FoodIn(taco_id=matches[0].id, grams=grams, quantity_label=f["quantity"]))
            if foods_in:
                meals_in.append(MealIn(name=m["meal"][:60], time=_norm_time(m.get("time", "")), foods=foods_in))
        if not meals_in:
            continue
        meals, totals = _build_meals(meals_in)
        menus_built.append({"label": menu.get("label") or "", "days": menu.get("days") or [], "meals": meals, "totals": totals})

    if not menus_built:
        raise HTTPException(status_code=422, detail="Não consegui casar os alimentos com a base TACO.")

    weekday_to_menu = _assign_weekdays(menus_built)

    # Apaga TODAS as dietas antigas (todos os slots) antes de salvar as novas —
    # nunca faz update parcial por slot. Isso evita qualquer resquício da
    # importação anterior (ex: um dia que a nova importação não cobrir) e
    # garante que reimportar o mesmo documento sempre produz o resultado atual
    # do matching, sem ambiguidade sobre o que ficou "preso" de antes.
    repository.delete_all_diets(user)

    saved_diets = []
    for weekday, menu_idx in sorted(weekday_to_menu.items()):
        menu = menus_built[menu_idx]
        diet_name = f"{name} — {menu['label']}" if menu["label"] else name
        saved_diets.append(repository.save_diet(user, weekday, {
            "name": diet_name[:80],
            "daily_calories": round(menu["totals"]["calories"]),
            "daily_protein_g": round(menu["totals"]["protein_g"]),
            "daily_carbs_g": round(menu["totals"]["carbs_g"]),
            "daily_fat_g": round(menu["totals"]["fat_g"]),
            "meals": menu["meals"],
            "is_active": True,
        }))
    repository.delete_day_plan(user, repository.today_iso())

    # Se o PDF trouxer calorias/macros diários explícitos, atualiza o perfil
    # (upsert é parcial — não mexe nos campos que o PDF não mencionou). Usa a
    # média dos cardápios importados como base quando falta % e sobra gramas.
    avg_calories = sum(m["totals"]["calories"] for m in menus_built) / len(menus_built)
    profile_patch = _profile_patch_from_targets(parsed.get("targets") or {}, avg_calories)
    updated_profile = repository.upsert_profile(user, profile_patch) if profile_patch else (profile or {})

    # Funde o que o PDF revelou com as preferências já cadastradas — nunca
    # sobrescreve, só complementa (o usuário pode ter editado manualmente).
    prefs_found = parsed.get("preferences") or {}
    current_prefs = repository.get_preferences(user) or {
        "allergies": [], "dislikes": [], "likes": [], "pantry": [], "notes": "",
    }
    merged_notes = current_prefs.get("notes", "")
    new_notes = prefs_found.get("notes", "")
    if new_notes and new_notes not in merged_notes:
        merged_notes = f"{merged_notes}\n{new_notes}".strip() if merged_notes else new_notes
    updated_prefs = repository.upsert_preferences(user, {
        "allergies": _merge_preference_list(current_prefs.get("allergies", []), prefs_found.get("allergies", [])),
        "dislikes": _merge_preference_list(current_prefs.get("dislikes", []), prefs_found.get("dislikes", [])),
        "likes": _merge_preference_list(current_prefs.get("likes", []), prefs_found.get("likes", [])),
        "pantry": current_prefs.get("pantry", []),
        "notes": merged_notes,
    })

    return {
        "diets": saved_diets,
        "menus_found": len(menus_built),
        "unmatched": unmatched,
        "preferences": updated_prefs,
        "profile": updated_profile,
    }


@router.delete("/{diet_id}")
def delete_diet(diet_id: str, user: CurrentUser = CurrentUserDep):
    repository.delete_diet(user, diet_id)
    return {"ok": True}


@router.post("/{diet_id}/clear")
def clear_diet(diet_id: str, user: CurrentUser = CurrentUserDep):
    """Esvazia todos os alimentos da dieta (mantém nome/dia da semana)."""
    diet = repository.clear_diet(user, diet_id)
    applies_today = diet.get("weekday") is None or diet.get("weekday") == repository.today_weekday()
    if applies_today:
        repository.delete_day_plan(user, repository.today_iso())
    return diet
