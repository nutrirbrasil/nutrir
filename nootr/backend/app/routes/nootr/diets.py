"""
Rotas Nootr, dietas montadas pelo usuário.

A dieta nasce vazia: o usuário monta as refeições escolhendo alimentos da TACO
com quantidades. Basic salva 1 dieta base (vale todos os dias, weekday=None);
Pro salva uma por dia da semana (0=segunda..6=domingo), sem conceito de
"base" na UI do Pro, os 7 dias são preenchidos individualmente (ou copiando de
outro dia, ou via importação de PDF/Word/Excel, que distribui o(s) cardápio(s)
do documento pelos 7 dias).
"""
import io

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from markitdown import MarkItDown
from pydantic import BaseModel, Field

from backend.app.auth import CurrentUser, CurrentUserDep
from backend.app.services import ai, energy, food_matcher, repository
from backend.app.services.nutrition import resolve_food
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
    # Preenchido só na revisão de import (ver /import/preview) quando o item
    # veio de decompor um prato composto, nunca persiste na dieta salva
    # (resolve_food ecoa de volta, mas o meal dict final não é gravado com ele).
    dish_name: str | None = Field(default=None, max_length=80)


class MealIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    time: str = Field(pattern=r"^(\d{2}:\d{2})?$")
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
    has_pending_review = repository.get_pending_diet(user) is not None
    if day_plan is None:
        # Usuário ainda não montou nenhuma dieta: estado vazio, não é erro,
        # a menos que já tenha uma gerada por IA aguardando revisão.
        return {
            "date": repository.today_iso(), "diet": None, "needs_setup": True,
            "has_pending_review": has_pending_review,
        }
    return {
        "date": day_plan["plan_date"], "diet": _as_diet(day_plan, user), "needs_setup": False,
        "has_pending_review": has_pending_review,
    }


@router.get("")
def list_diets(user: CurrentUser = CurrentUserDep):
    diets = repository.list_diets(user)
    profile = repository.get_profile(user)
    return {
        "plan": (profile or {}).get("plan", "basic"),
        "diets": diets,
        "weekday_labels": WEEKDAY_LABELS,
        "has_pending_review": repository.get_pending_diet(user) is not None,
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


@router.post("/generate")
def generate_diet_route(user: CurrentUser = CurrentUserDep):
    """
    Pro: gera uma dieta básica de um dia batendo a meta calórica/macro do
    perfil, considerando alergias/preferências. Nasce "pending_review",
    nunca aparece como a dieta do usuário nem sobrescreve a atual (se houver)
    até um nutricionista parceiro aprovar em /aprovar (até 24h, ver
    repository.insert_pending_diet). Cada usuário só tem direito a UMA
    geração (profiles.ai_diet_generated_at), mesmo que a dieta seja rejeitada
    depois, não é um recurso recorrente.
    """
    profile = repository.get_profile(user)
    if (profile or {}).get("plan") != "pro":
        raise HTTPException(status_code=403, detail="Gerar dieta automaticamente é um recurso do plano Pro.")
    if (profile or {}).get("ai_diet_generated_at"):
        raise HTTPException(status_code=409, detail="Você já utilizou sua geração gratuita de dieta.")
    target_calories = (profile or {}).get("target_calories")
    if not target_calories:
        raise HTTPException(
            status_code=400,
            detail="Defina sua meta calórica no perfil antes de gerar a dieta automaticamente.",
        )
    if repository.get_pending_diet(user) is not None:
        raise HTTPException(status_code=409, detail="Você já tem uma dieta em revisão.")

    prefs = repository.get_preferences(user) or {}
    country = (profile or {}).get("country") or "BR"
    macros = energy.macro_targets_g(
        float(target_calories),
        float((profile or {}).get("protein_pct") or 30),
        float((profile or {}).get("carbs_pct") or 40),
        float((profile or {}).get("fat_pct") or 30),
    )
    try:
        generated = ai.generate_diet(
            target_calories, macros["protein_g"], macros["carbs_g"], macros["fat_g"], prefs, country,
        )
    except ai.AIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    meals_raw = generated.get("meals") or []
    if not meals_raw:
        raise HTTPException(status_code=502, detail="Não consegui gerar uma dieta agora, tente de novo em instantes.")

    preferred_ids = food_matcher.preferred_taco_ids([*prefs.get("likes", []), *prefs.get("pantry", [])])
    tie_resolver = ai.build_country_tie_resolver(country)
    allergies = prefs.get("allergies") or []

    meals_in: list[MealIn] = []
    for m in meals_raw:
        foods_in: list[FoodIn] = []
        for f in m["foods"]:
            matches = food_matcher.search_taco(f["name"], limit=1, preferred=preferred_ids, tie_resolver=tie_resolver)
            if not matches:
                continue
            match = matches[0]
            # Última barreira determinística: mesmo com a instrução no
            # prompt, nunca confia só na IA pra alergia (ver
            # food_matcher.matches_allergen).
            if food_matcher.matches_allergen(match.name, allergies) or food_matcher.matches_allergen(match.display_name, allergies):
                continue
            grams = parse_portion(f["quantity"], food_hint=f["name"]) or 100.0
            foods_in.append(FoodIn(taco_id=match.id, grams=grams, quantity_label=f["quantity"]))
        if foods_in:
            meals_in.append(MealIn(name=m["meal"][:60], time=_norm_time(m.get("time", ""), m["meal"]), foods=foods_in))

    if not meals_in:
        raise HTTPException(
            status_code=502, detail="Não consegui montar uma dieta válida agora, tente de novo em instantes.",
        )

    meals, totals = _build_meals(meals_in)
    repository.insert_pending_diet(user, {
        "name": "Dieta gerada pelo Nootr",
        "daily_calories": round(totals["calories"]),
        "daily_protein_g": round(totals["protein_g"]),
        "daily_carbs_g": round(totals["carbs_g"]),
        "daily_fat_g": round(totals["fat_g"]),
        "meals": meals,
        "is_active": True,
    })
    # Marca a geração como usada AGORA (não só no sucesso da revisão), o
    # direito é de gerar uma vez, não de receber uma dieta aprovada uma vez.
    repository.upsert_profile(user, {"ai_diet_generated_at": repository.now_iso()})
    return {"status": "pending_review"}


# Horários padrão por tipo de refeição, usados quando o documento importado
# não especifica um horário explícito (a IA é instruída a devolver "time"
# vazio nesse caso, em vez de inventar/estimar um horário).
_DEFAULT_MEAL_TIMES = {
    "cafe": "07:00",
    "cafe da manha": "07:00",
    "colacao": "09:30",
    "almoco": "12:00",
    "lanche": "16:00",
    "lanche da tarde": "16:00",
    "janta": "20:30",
    "jantar": "20:30",
    "ceia": "22:30",
}


def _default_time_for_meal(meal_name: str) -> str | None:
    """Horário padrão pelo nome da refeição, ou None se o tipo não é reconhecido
    (nesse caso o usuário preenche manualmente, não chutamos um horário)."""
    normalized = food_matcher.normalize(meal_name)
    if normalized in _DEFAULT_MEAL_TIMES:
        return _DEFAULT_MEAL_TIMES[normalized]
    for key, time in _DEFAULT_MEAL_TIMES.items():
        if key in normalized or normalized in key:
            return time
    return None


def _norm_time(value: str, meal_name: str = "") -> str:
    """Normaliza 'H:MM'/'HH:MM' -> 'HH:MM'; sem horário válido, usa o padrão do tipo de
    refeição; se o tipo não for reconhecido, devolve vazio pro usuário preencher."""
    import re
    m = re.match(r"^(\d{1,2}):(\d{2})$", (value or "").strip())
    if not m:
        return _default_time_for_meal(meal_name) or ""
    h = min(23, int(m.group(1)))
    return f"{h:02d}:{m.group(2)}"


_ALLOWED_EXTENSIONS = (".pdf", ".docx", ".xlsx")
_MARKITDOWN = MarkItDown()


def _extract_ext(filename: str) -> str | None:
    filename = (filename or "").lower()
    return next((ext for ext in _ALLOWED_EXTENSIONS if filename.endswith(ext)), None)


def _markdown_table(rows: list[list[str | None]]) -> str:
    """Formata uma tabela extraída (linhas de células) como tabela Markdown."""
    cleaned = [[(cell or "").replace("\n", " ").strip() for cell in row] for row in rows]
    if not cleaned:
        return ""
    lines = ["| " + " | ".join(cleaned[0]) + " |", "|" + "---|" * len(cleaned[0])]
    for row in cleaned[1:]:
        lines.append("| " + " | ".join(row) + " |")
    return "\n".join(lines)


def _extract_pdf_tables(raw: bytes) -> str | None:
    """
    Tenta extrair tabelas de verdade do PDF via pdfplumber, preservando qual
    célula pertence a qual linha/coluna (ex: cardápio semanal com dias nas
    colunas e refeições nas linhas). Diferente de extrair só o texto corrido
    (que MarkItDown faz), isso evita que a IA embaralhe alimentos entre dias
    ou refeições quando o PDF é uma tabela. Devolve None se não achar tabela
    (documento é só texto corrido, usa o fallback do MarkItDown nesse caso).
    """
    import pdfplumber

    try:
        with pdfplumber.open(io.BytesIO(raw)) as pdf:
            tables_md = []
            for page in pdf.pages:
                for table in page.extract_tables():
                    if table and len(table) > 1:
                        tables_md.append(_markdown_table(table))
            if not tables_md:
                return None
            return "\n\n".join(tables_md)
    except Exception:
        return None


def _extract_document_text(raw: bytes, ext: str) -> str:
    """
    Converte o documento (PDF/Word/Excel) pra texto legível pra IA. Para PDF,
    tenta primeiro extrair tabelas de verdade (linha/coluna) via pdfplumber,
    o texto corrido do MarkItDown embaralha células quando o documento é uma
    tabela (ex: cardápio semanal com um dia por coluna), perdendo a
    correspondência entre dia/refeição/alimento. Word/Excel continuam via
    MarkItDown, que já preserva tabela razoavelmente bem nesses formatos.
    """
    if ext == ".pdf":
        table_text = _extract_pdf_tables(raw)
        if table_text:
            return table_text

    try:
        result = _MARKITDOWN.convert_stream(io.BytesIO(raw), file_extension=ext)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Não foi possível abrir o arquivo: {exc}") from exc
    text = result.text_content
    if len(text.strip()) < 20:
        raise HTTPException(
            status_code=422,
            detail="Não encontrei texto no documento, se for um PDF escaneado (imagem), ainda não conseguimos ler.",
        )
    return text


def _profile_patch_from_targets(targets: dict, fallback_calories: float) -> dict:
    """
    Converte as metas nutricionais extraídas do PDF (calorias e/ou % e/ou
    gramas totais de macro) num patch para o perfil. Se só houver gramas
    totais (sem %), calcula o % a partir das calorias diárias, as do próprio
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
    Excel), extrai o(s) cardápio(s) (a maioria dos documentos tem só um;
    alguns trazem mais de um, ex: treino/descanso ou semana/fim de semana) E
    qualquer contexto do paciente que o documento carregue (alergias,
    substituições já sugeridas, gostos/não-gostos), distribui os cardápios
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

    # Preferências do usuário (gosto/despensa, escolhidas na tela de perfil a
    # partir da própria base TACO) desempatam variedades genéricas na hora de
    # casar, ex: dieta diz só "banana", mas a pessoa tem "Banana, nanica" na
    # despensa: prefere nanica ao invés do default genérico (figo).
    existing_prefs = repository.get_preferences(user) or {}
    preferred_names = [*existing_prefs.get("likes", []), *existing_prefs.get("pantry", [])]
    preferred_ids = food_matcher.preferred_taco_ids(preferred_names)
    # Sem favorito decidindo, empates de verdade (ex: "azeite" -> oliva vs
    # dendê) perguntam pra IA qual é o mais comum no país do usuário.
    tie_resolver = ai.build_country_tie_resolver((profile or {}).get("country") or "BR")

    unmatched: list[str] = []
    menus_built: list[dict] = []  # [{"label", "days", "meals", "totals"}]
    for menu in menus_parsed:
        meals_in: list[MealIn] = []
        for m in menu["meals"]:
            foods_in: list[FoodIn] = []
            for f in m["foods"]:
                matches = food_matcher.search_taco(f["name"], limit=1, preferred=preferred_ids, tie_resolver=tie_resolver)
                if not matches:
                    unmatched.append(f["name"])
                    continue
                grams = parse_portion(f["quantity"], food_hint=f["name"]) or 100.0
                foods_in.append(FoodIn(taco_id=matches[0].id, grams=grams, quantity_label=f["quantity"]))
            if foods_in:
                meals_in.append(MealIn(name=m["meal"][:60], time=_norm_time(m.get("time", ""), m["meal"]), foods=foods_in))
        if not meals_in:
            continue
        meals, totals = _build_meals(meals_in)
        menus_built.append({"label": menu.get("label") or "", "days": menu.get("days") or [], "meals": meals, "totals": totals})

    if not menus_built:
        raise HTTPException(status_code=422, detail="Não consegui casar os alimentos com a base TACO.")

    result = _persist_diet_menus(
        user, name, menus_built, profile, existing_prefs,
        parsed.get("preferences") or {}, parsed.get("targets") or {},
    )
    return {**result, "unmatched": unmatched}


def _persist_diet_menus(
    user: CurrentUser, name: str, menus_built: list[dict], profile: dict | None,
    existing_prefs: dict | None, prefs_found: dict, targets: dict,
) -> dict:
    """
    Grava as dietas (todos os slots) + atualiza perfil/preferências a partir
    de um `menus_built` já pronto, usado tanto pelo atalho `/import` (que faz
    tudo de uma vez) quanto por `/import/confirm` (depois da revisão de
    pratos, ver `/import/preview`).
    """
    weekday_to_menu = _assign_weekdays(menus_built)

    # Apaga TODAS as dietas antigas (todos os slots) antes de salvar as novas,
    # nunca faz update parcial por slot. Isso evita qualquer resquício da
    # importação anterior (ex: um dia que a nova importação não cobrir) e
    # garante que reimportar o mesmo documento sempre produz o resultado atual
    # do matching, sem ambiguidade sobre o que ficou "preso" de antes.
    repository.delete_all_diets(user)

    saved_diets = []
    for weekday, menu_idx in sorted(weekday_to_menu.items()):
        menu = menus_built[menu_idx]
        diet_name = f"{name}, {menu['label']}" if menu["label"] else name
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
    # (upsert é parcial, não mexe nos campos que o PDF não mencionou). Usa a
    # média dos cardápios importados como base quando falta % e sobra gramas.
    avg_calories = sum(m["totals"]["calories"] for m in menus_built) / len(menus_built)
    profile_patch = _profile_patch_from_targets(targets, avg_calories)
    updated_profile = repository.upsert_profile(user, profile_patch) if profile_patch else (profile or {})

    # Funde o que o PDF revelou com as preferências já cadastradas, nunca
    # sobrescreve, só complementa (o usuário pode ter editado manualmente).
    current_prefs = existing_prefs or {
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
        "preferences": updated_prefs,
        "profile": updated_profile,
    }


class ImportFoodIn(BaseModel):
    """
    Espelha o dict resolvido devolvido por `resolve_food` (ver
    `services/nutrition.py`), é exatamente o formato de `/import/preview`,
    pra o frontend poder reenviar a mesma estrutura (destrinchada ou editada)
    em `/import/confirm` sem transformação.
    """
    name: str = Field(max_length=120)
    quantity: str = Field(default="", max_length=60)
    calories: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carbs_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)
    taco_id: int | None = None
    grams: float | None = Field(default=None, gt=0, le=3000)
    dish_name: str | None = Field(default=None, max_length=80)


class ImportMealIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    time: str = Field(default="", pattern=r"^(\d{2}:\d{2})?$")
    foods: list[ImportFoodIn] = Field(min_length=1)


class ImportMenuIn(BaseModel):
    label: str = Field(default="", max_length=80)
    days: list[int] = Field(default_factory=list)
    meals: list[ImportMealIn] = Field(min_length=1)


class RecipeToSaveIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    ingredients: list[FoodIn] = Field(min_length=1, max_length=20)


class ImportConfirmIn(BaseModel):
    name: str = Field(default="Dieta importada", max_length=80)
    menus: list[ImportMenuIn] = Field(min_length=1)
    preferences: dict = Field(default_factory=dict)
    targets: dict = Field(default_factory=dict)
    # Pratos que o usuário decidiu "salvar"/"alterar" na revisão (ver
    # DishReviewModal no frontend), cada um vira uma receita própria (nasce
    # pending, ver repository.insert_recipe) além de entrar em `menus` como
    # um item único (grams=100, macros já somados).
    recipes_to_save: list[RecipeToSaveIn] = Field(default_factory=list)


def _import_food_to_food_in(f: ImportFoodIn) -> FoodIn:
    if f.taco_id is not None:
        return FoodIn(taco_id=f.taco_id, grams=f.grams or 100.0, quantity_label=f.quantity or None)
    # Item sintético (prato "salvo"/"alterado" na revisão): grams=100 faz
    # `scale_custom` devolver exatamente os valores já somados, sem reescalar.
    return FoodIn(
        name=f.name, grams=100.0, quantity_label=f.quantity or "1 porção",
        kcal_100g=f.calories, protein_100g=f.protein_g, carbs_100g=f.carbs_g, fat_100g=f.fat_g,
    )


@router.post("/import/preview")
async def preview_diet_import(file: UploadFile = File(...), user: CurrentUser = CurrentUserDep):
    """
    Primeira etapa do import (ver /import/confirm pra segunda): lê o
    documento, casa os alimentos com a TACO, mas NÃO salva nada, devolve o(s)
    cardápio(s) montados pro frontend revisar (cada prato composto decomposto
    carrega `dish_name`, ver ai.gemini._DIET_DOC_FOOD_SCHEMA) antes de gravar.
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

    existing_prefs = repository.get_preferences(user) or {}
    preferred_names = [*existing_prefs.get("likes", []), *existing_prefs.get("pantry", [])]
    preferred_ids = food_matcher.preferred_taco_ids(preferred_names)
    tie_resolver = ai.build_country_tie_resolver((profile or {}).get("country") or "BR")

    unmatched: list[str] = []
    menus_built: list[dict] = []
    for menu in menus_parsed:
        meals_in: list[MealIn] = []
        for m in menu["meals"]:
            foods_in: list[FoodIn] = []
            for f in m["foods"]:
                matches = food_matcher.search_taco(f["name"], limit=1, preferred=preferred_ids, tie_resolver=tie_resolver)
                if not matches:
                    unmatched.append(f["name"])
                    continue
                grams = parse_portion(f["quantity"], food_hint=f["name"]) or 100.0
                foods_in.append(FoodIn(
                    taco_id=matches[0].id, grams=grams, quantity_label=f["quantity"],
                    dish_name=f.get("dish_name") or None,
                ))
            if foods_in:
                meals_in.append(MealIn(name=m["meal"][:60], time=_norm_time(m.get("time", ""), m["meal"]), foods=foods_in))
        if not meals_in:
            continue
        meals, totals = _build_meals(meals_in)
        menus_built.append({"label": menu.get("label") or "", "days": menu.get("days") or [], "meals": meals, "totals": totals})

    if not menus_built:
        raise HTTPException(status_code=422, detail="Não consegui casar os alimentos com a base TACO.")

    return {
        "menus": menus_built,
        "unmatched": unmatched,
        "preferences": parsed.get("preferences") or {},
        "targets": parsed.get("targets") or {},
    }


@router.post("/import/confirm")
def confirm_diet_import(body: ImportConfirmIn, user: CurrentUser = CurrentUserDep):
    """Segunda etapa do import, recebe de volta o resultado de /import/preview (revisado ou não) e persiste."""
    profile = repository.get_profile(user)
    if (profile or {}).get("plan") != "pro":
        raise HTTPException(status_code=403, detail="Importar dieta é um recurso do plano Pro.")

    for r in body.recipes_to_save:
        ingredients = []
        for item in r.ingredients:
            resolved = resolve_food(item)
            if resolved is None:
                raise HTTPException(status_code=400, detail=f"Alimento TACO {item.taco_id} não existe")
            ingredients.append(resolved)
        repository.insert_recipe(user, r.name.strip(), ingredients)

    menus_built: list[dict] = []
    for menu in body.menus:
        meals_in = [
            MealIn(name=m.name, time=m.time, foods=[_import_food_to_food_in(f) for f in m.foods])
            for m in menu.meals
        ]
        meals, totals = _build_meals(meals_in)
        menus_built.append({
            "label": menu.label,
            "days": sorted({d for d in menu.days if 0 <= d <= 6}),
            "meals": meals,
            "totals": totals,
        })

    existing_prefs = repository.get_preferences(user)
    return _persist_diet_menus(
        user, body.name, menus_built, profile, existing_prefs, body.preferences, body.targets,
    )


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
