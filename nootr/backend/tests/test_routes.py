"""
Testes das rotas Nootr com TestClient. O acesso a dados (repository/Supabase) é
substituído por um fake em memória, então os testes não tocam a rede nem exigem
credenciais — validam só o contrato HTTP + o encaixe com o motor.
"""
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.auth import CurrentUser, get_current_user
from backend.app.data.taco import load_taco_foods
from backend.app.services import repository
from backend.app.services.nutrition import scale_food


def _scaled(taco_id: int, grams: float) -> dict:
    taco = {f.id: f for f in load_taco_foods()}
    return scale_food(taco[taco_id], grams)


@pytest.fixture
def fake_day_plan():
    meals = [
        {"id": "meal-1", "name": "Café da manhã", "time": "07:30",
         "foods": [_scaled(488, 100), _scaled(52, 50)]},
        {"id": "meal-2", "name": "Almoço", "time": "12:30",
         "foods": [_scaled(410, 150), _scaled(3, 150)]},
        {"id": "meal-3", "name": "Jantar", "time": "19:30",
         "foods": [_scaled(308, 150), _scaled(88, 150)]},
    ]
    kcal = sum(f["calories"] for m in meals for f in m["foods"])
    return {
        "id": "dp-1", "diet_id": "diet-1", "plan_date": "2026-07-03",
        "name": "Minha dieta", "daily_calories": round(kcal),
        "daily_protein_g": 100, "daily_carbs_g": 150, "daily_fat_g": 40,
        "meals": meals,
    }


@pytest.fixture
def client(monkeypatch, fake_day_plan):
    monkeypatch.setattr(repository, "get_or_create_day_plan", lambda user, plan_date=None: fake_day_plan)
    monkeypatch.setattr(repository, "update_day_plan_meals", lambda user, dp_id, meals: {"id": dp_id, "meals": meals})
    monkeypatch.setattr(repository, "insert_substitution_log", lambda *a, **k: {"id": "log-1"})
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "basic"})
    monkeypatch.setattr(repository, "list_diets", lambda user: [])
    # Não tocar a rede: a explicação da IA é mockada nos testes.
    from backend.app.services import ai
    monkeypatch.setattr(ai, "explain_change", lambda ctx: "")

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id="u1", email="t@t.com", token="tok")
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def client_no_diet(monkeypatch):
    monkeypatch.setattr(repository, "get_or_create_day_plan", lambda user, plan_date=None: None)
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id="u1", email="t@t.com", token="tok")
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_today_requires_auth():
    with TestClient(app) as c:
        assert c.get("/nootr/diets/today").status_code == 401


def test_today_returns_diet(client):
    resp = client.get("/nootr/diets/today")
    assert resp.status_code == 200
    body = resp.json()
    assert body["needs_setup"] is False
    assert body["diet"]["user_id"] == "u1"
    assert len(body["diet"]["meals"]) == 3


def test_today_empty_state_when_no_diet(client_no_diet):
    resp = client_no_diet.get("/nootr/diets/today")
    assert resp.status_code == 200
    body = resp.json()
    assert body["diet"] is None
    assert body["needs_setup"] is True


def test_substitution_with_structured_foods(client):
    resp = client.post(
        "/nootr/substitutions",
        json={"action": "ate_different", "meal_id": "meal-2",
              "foods": [{"taco_id": 3, "grams": 300, "quantity_label": "1 prato"}]},
    )
    assert resp.status_code == 200
    body = resp.json()
    almoco = next(m for m in body["adjusted_meals"] if m["id"] == "meal-2")
    assert len(almoco["foods"]) == 1
    assert almoco["foods"][0]["quantity"] == "1 prato"


def test_substitution_missing_food_swaps(client, fake_day_plan):
    missing = fake_day_plan["meals"][1]["foods"][0]["name"]
    resp = client.post(
        "/nootr/substitutions",
        json={"action": "missing_food", "meal_id": "meal-2", "missing_food_name": missing,
              "foods": [{"taco_id": 315, "grams": 150}]},
    )
    assert resp.status_code == 200
    almoco = next(m for m in resp.json()["adjusted_meals"] if m["id"] == "meal-2")
    assert missing not in [f["name"] for f in almoco["foods"]]


def test_substitution_requires_diet(client_no_diet):
    resp = client_no_diet.post(
        "/nootr/substitutions",
        json={"action": "ate_different", "foods": [{"taco_id": 3, "grams": 100}]},
    )
    assert resp.status_code == 409


def test_substitution_unknown_meal_404(client):
    resp = client.post(
        "/nootr/substitutions",
        json={"action": "ate_different", "meal_id": "meal-999",
              "foods": [{"taco_id": 3, "grams": 100}]},
    )
    assert resp.status_code == 404


def test_substitution_unknown_taco_id_400(client):
    resp = client.post(
        "/nootr/substitutions",
        json={"action": "ate_different", "meal_id": "meal-2",
              "foods": [{"taco_id": 99999, "grams": 100}]},
    )
    assert resp.status_code == 400


def test_missing_food_options_filters_by_profile(client, monkeypatch):
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "pantry": ["Batata doce cozida", "Frango grelhado", "Macarrão cozido"],
        "allergies": [], "dislikes": [], "likes": [], "notes": "",
    })
    resp = client.get("/nootr/substitutions/missing-food-options", params={"food_name": "arroz cozido"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["profile"] == "carb"
    names = [m["name"].lower() for m in body["pantry_matches"]]
    assert any("batata" in n for n in names)
    assert any("macarr" in n for n in names)
    assert not any("frango" in n for n in names)  # proteína, perfil diferente do arroz


def test_suggest_alternatives_calls_ai(client, monkeypatch):
    from backend.app.services import ai
    monkeypatch.setattr(repository, "get_preferences", lambda user: None)
    monkeypatch.setattr(ai, "suggest_substitutes", lambda missing, prefs: ["batata doce", "macarrão"])
    resp = client.post("/nootr/substitutions/alternatives", json={"missing_food_name": "arroz"})
    assert resp.status_code == 200
    assert len(resp.json()["suggestions"]) == 2


@pytest.fixture
def gap_day_plan():
    meals = [{
        "id": "jantar", "name": "Jantar", "time": "19:30",
        "foods": [{
            "name": "Frango grelhado", "calories": 200, "protein_g": 30, "carbs_g": 0, "fat_g": 8,
            "grams": 120, "quantity": "120g", "taco_id": 1,
        }],
    }]
    return {
        "id": "dp-2", "diet_id": "diet-2", "plan_date": "2026-07-03",
        "name": "Dieta gap", "daily_calories": 200,
        "daily_protein_g": 30, "daily_carbs_g": 0, "daily_fat_g": 8,
        "meals": meals,
    }


def test_missing_food_adds_wildcard_when_gap(client, monkeypatch, gap_day_plan):
    from backend.app.services import ai
    monkeypatch.setattr(repository, "get_or_create_day_plan", lambda user, plan_date=None: gap_day_plan)
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "pantry": ["Ovo cozido"], "allergies": [], "dislikes": [], "likes": [], "notes": "",
    })
    monkeypatch.setattr(ai, "suggest_wildcard", lambda meal_name, current, gap, pantry: "Ovo cozido")
    resp = client.post(
        "/nootr/substitutions",
        json={
            "action": "missing_food", "meal_id": "jantar", "missing_food_name": "Frango grelhado",
            # substituto pobre em proteína -> deve abrir lacuna de proteína e disparar o coringa
            "foods": [{"name": "Batata doce cozida", "grams": 150, "kcal_100g": 77,
                       "protein_100g": 1.6, "carbs_100g": 18, "fat_100g": 0.1}],
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "ovo" in body["wildcard_added"].lower()
    jantar = next(m for m in body["adjusted_meals"] if m["id"] == "jantar")
    assert any("ovo" in f["name"].lower() for f in jantar["foods"])


def test_missing_food_no_wildcard_when_ai_declines(client, monkeypatch, gap_day_plan):
    from backend.app.services import ai
    monkeypatch.setattr(repository, "get_or_create_day_plan", lambda user, plan_date=None: gap_day_plan)
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "pantry": ["Ovo cozido"], "allergies": [], "dislikes": [], "likes": [], "notes": "",
    })
    monkeypatch.setattr(ai, "suggest_wildcard", lambda meal_name, current, gap, pantry: None)
    resp = client.post(
        "/nootr/substitutions",
        json={
            "action": "missing_food", "meal_id": "jantar", "missing_food_name": "Frango grelhado",
            "foods": [{"name": "Batata doce cozida", "grams": 150, "kcal_100g": 77,
                       "protein_100g": 1.6, "carbs_100g": 18, "fat_100g": 0.1}],
        },
    )
    assert resp.status_code == 200
    assert "wildcard_added" not in resp.json()


def test_save_diet_weekday_requires_pro(client, monkeypatch):
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "basic"})
    resp = client.post(
        "/nootr/diets",
        json={"name": "Segunda", "weekday": 0,
              "meals": [{"name": "Almoço", "time": "12:00",
                         "foods": [{"taco_id": 3, "grams": 150}]}]},
    )
    assert resp.status_code == 403


def test_save_diet_basic_base_ok(client, monkeypatch):
    saved = {}

    def fake_save(user, weekday, payload):
        saved.update({"weekday": weekday, **payload})
        return {"id": "diet-1", "weekday": weekday, **payload}

    monkeypatch.setattr(repository, "save_diet", fake_save)
    monkeypatch.setattr(repository, "delete_day_plan", lambda user, d: None)
    resp = client.post(
        "/nootr/diets",
        json={"name": "Minha dieta", "target_calories": 2000,
              "meals": [{"name": "Almoço", "time": "12:00",
                         "foods": [{"taco_id": 3, "grams": 150, "quantity_label": "1 prato"}]}]},
    )
    assert resp.status_code == 200
    assert saved["weekday"] is None
    assert saved["daily_calories"] == 2000  # alvo manual prevalece
    assert saved["meals"][0]["foods"][0]["quantity"] == "1 prato"


def test_foods_search_returns_display_name(client):
    resp = client.get("/nootr/foods/search", params={"q": "arroz cozido"})
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert results
    # nome de exibição não deve ter vírgulas da TACO
    assert "," not in results[0]["name"]
    assert results[0]["full_name"]


def test_profile_calculates_mifflin(client, monkeypatch):
    stored = {}

    def fake_upsert(user, patch):
        stored.update(patch)
        return {"user_id": user.id, **patch}

    monkeypatch.setattr(repository, "get_profile", lambda user: None)
    monkeypatch.setattr(repository, "upsert_profile", fake_upsert)
    resp = client.put(
        "/nootr/profile",
        json={"sex": "m", "age": 30, "weight_kg": 80, "height_cm": 180,
              "activity_level": "moderado", "formula": "mifflin_st_jeor"},
    )
    assert resp.status_code == 200
    # Mifflin: 10*80 + 6.25*180 − 5*30 + 5 = 1780 → ×1.55 = 2759
    assert stored["target_calories"] == 2759


def test_import_diet_requires_pro(client, monkeypatch):
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "basic"})
    resp = client.post(
        "/nootr/diets/import",
        files={"file": ("dieta.pdf", b"%PDF-fake", "application/pdf")},
        data={"name": "Dieta importada"},
    )
    assert resp.status_code == 403


def test_import_diet_pdf_saves_diet_and_merges_preferences(client, monkeypatch):
    from backend.app.routes.nootr import diets as diets_route
    from backend.app.services import ai

    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
    monkeypatch.setattr(diets_route, "_extract_document_text", lambda raw, ext: "texto fake do pdf")
    monkeypatch.setattr(
        ai, "parse_diet_document",
        lambda text: {
            "menus": [{
                "label": "", "days": [],
                "meals": [{"meal": "Almoço", "time": "12:00", "foods": [{"name": "arroz", "quantity": "150g"}]}],
            }],
            "preferences": {
                "allergies": ["Lactose"], "dislikes": [], "likes": [],
                "notes": "Pode trocar arroz por batata-doce.",
            },
        },
    )
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "allergies": ["Camarão"], "dislikes": [], "likes": [], "pantry": ["Ovo"], "notes": "",
    })

    saved_diets = []

    def fake_save_diet(user, weekday, payload):
        saved_diets.append({"weekday": weekday, **payload})
        return {"id": f"diet-{weekday}", "weekday": weekday, **payload}

    saved_prefs = {}

    def fake_upsert_prefs(user, patch):
        saved_prefs.update(patch)
        return {"user_id": user.id, **patch}

    monkeypatch.setattr(repository, "save_diet", fake_save_diet)
    monkeypatch.setattr(repository, "delete_day_plan", lambda user, d: None)
    monkeypatch.setattr(repository, "delete_all_diets", lambda user: None)
    monkeypatch.setattr(repository, "upsert_preferences", fake_upsert_prefs)

    resp = client.post(
        "/nootr/diets/import",
        files={"file": ("dieta.pdf", b"%PDF-fake", "application/pdf")},
        data={"name": "Dieta da nutri"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["menus_found"] == 1
    # 1 único cardápio -> vale para os 7 dias.
    assert {d["weekday"] for d in saved_diets} == set(range(7))
    assert all(d["name"] == "Dieta da nutri" for d in saved_diets)
    assert all(d["meals"][0]["name"] == "Almoço" for d in saved_diets)

    # Alergias existentes + novas, sem duplicar; notas concatenadas.
    assert set(saved_prefs["allergies"]) == {"Camarão", "Lactose"}
    assert "batata-doce" in saved_prefs["notes"]


def test_import_diet_pdf_distributes_multiple_menus(client, monkeypatch):
    """2 cardápios sem dia explícito -> intercala; 1 com dia explícito -> respeita."""
    from backend.app.routes.nootr import diets as diets_route
    from backend.app.services import ai

    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
    monkeypatch.setattr(diets_route, "_extract_document_text", lambda raw, ext: "texto fake do pdf")
    monkeypatch.setattr(
        ai, "parse_diet_document",
        lambda text: {
            "menus": [
                {"label": "Dia de treino", "days": [], "meals": [
                    {"meal": "Almoço", "time": "12:00", "foods": [{"name": "arroz", "quantity": "150g"}]},
                ]},
                {"label": "Fim de semana", "days": [5, 6], "meals": [
                    {"meal": "Almoço", "time": "12:00", "foods": [{"name": "feijão", "quantity": "100g"}]},
                ]},
            ],
            "preferences": {"allergies": [], "dislikes": [], "likes": [], "notes": ""},
        },
    )
    monkeypatch.setattr(repository, "get_preferences", lambda user: None)
    monkeypatch.setattr(repository, "delete_day_plan", lambda user, d: None)
    monkeypatch.setattr(repository, "delete_all_diets", lambda user: None)
    monkeypatch.setattr(repository, "upsert_preferences", lambda user, patch: {"user_id": user.id, **patch})
    monkeypatch.setattr(repository, "upsert_profile", lambda user, patch: {"user_id": user.id, **patch})

    saved_diets = []
    monkeypatch.setattr(
        repository, "save_diet",
        lambda user, weekday, payload: (saved_diets.append({"weekday": weekday, **payload}) or {"id": f"d{weekday}", **payload}),
    )

    resp = client.post(
        "/nootr/diets/import",
        files={"file": ("dieta.pdf", b"%PDF-fake", "application/pdf")},
        data={"name": "Dieta"},
    )
    assert resp.status_code == 200
    assert resp.json()["menus_found"] == 2

    by_weekday = {d["weekday"]: d for d in saved_diets}

    def food_name(weekday: int) -> str:
        return by_weekday[weekday]["meals"][0]["foods"][0]["name"].lower()

    # Sáb (5) e Dom (6) explicitamente reivindicados pelo cardápio "Fim de semana".
    assert "feij" in food_name(5)
    assert "feij" in food_name(6)
    # Os outros 5 dias (seg-sex) sobram só pro cardápio "Dia de treino" (o único sem dia reivindicado).
    for weekday in (0, 1, 2, 3, 4):
        assert "arroz" in food_name(weekday)


def test_import_diet_pdf_updates_profile_targets(client, monkeypatch):
    from backend.app.routes.nootr import diets as diets_route
    from backend.app.services import ai

    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
    monkeypatch.setattr(diets_route, "_extract_document_text", lambda raw, ext: "texto fake do pdf")
    monkeypatch.setattr(
        ai, "parse_diet_document",
        lambda text: {
            "menus": [{
                "label": "", "days": [],
                "meals": [{"meal": "Almoço", "time": "12:00", "foods": [{"name": "arroz", "quantity": "150g"}]}],
            }],
            "preferences": {"allergies": [], "dislikes": [], "likes": [], "notes": ""},
            # Sem % explícito, mas com o VET e os gramas totais diários.
            "targets": {"daily_calories": 2000.0, "protein_g": 150.0, "carbs_g": 200.0, "fat_g": 60.0},
        },
    )
    monkeypatch.setattr(repository, "get_preferences", lambda user: None)
    monkeypatch.setattr(repository, "save_diet", lambda user, weekday, payload: {"id": "diet-x", **payload})
    monkeypatch.setattr(repository, "delete_day_plan", lambda user, d: None)
    monkeypatch.setattr(repository, "delete_all_diets", lambda user: None)
    monkeypatch.setattr(repository, "upsert_preferences", lambda user, patch: {"user_id": user.id, **patch})

    saved_profile = {}

    def fake_upsert_profile(user, patch):
        saved_profile.update(patch)
        return {"user_id": user.id, **patch}

    monkeypatch.setattr(repository, "upsert_profile", fake_upsert_profile)

    resp = client.post(
        "/nootr/diets/import",
        files={"file": ("dieta.pdf", b"%PDF-fake", "application/pdf")},
        data={"name": "Dieta com VET"},
    )
    assert resp.status_code == 200
    assert saved_profile["target_calories"] == 2000
    # 150g proteína * 4 / 2000 * 100 = 30% ; 200g carbo * 4 / 2000 * 100 = 40% ; 60g gordura * 9 / 2000 * 100 = 27%
    assert saved_profile["protein_pct"] == 30
    assert saved_profile["carbs_pct"] == 40
    assert saved_profile["fat_pct"] == 27


def test_import_diet_rejects_unsupported_extension(client, monkeypatch):
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
    resp = client.post(
        "/nootr/diets/import",
        files={"file": ("dieta.txt", b"nao e um formato suportado", "text/plain")},
        data={"name": "x"},
    )
    assert resp.status_code == 400


def test_import_diet_accepts_docx(client, monkeypatch):
    """.docx (Word) deve ser aceito e passar pelo mesmo pipeline do PDF."""
    from backend.app.routes.nootr import diets as diets_route
    from backend.app.services import ai

    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
    seen_ext = {}

    def fake_extract(raw, ext):
        seen_ext["value"] = ext
        return "texto fake do docx"

    monkeypatch.setattr(diets_route, "_extract_document_text", fake_extract)
    monkeypatch.setattr(
        ai, "parse_diet_document",
        lambda text: {
            "menus": [{"label": "", "days": [], "meals": [
                {"meal": "Almoço", "time": "12:00", "foods": [{"name": "arroz", "quantity": "150g"}]},
            ]}],
            "preferences": {"allergies": [], "dislikes": [], "likes": [], "notes": ""},
        },
    )
    monkeypatch.setattr(repository, "get_preferences", lambda user: None)
    monkeypatch.setattr(repository, "save_diet", lambda user, weekday, payload: {"id": f"d{weekday}", **payload})
    monkeypatch.setattr(repository, "delete_day_plan", lambda user, d: None)
    monkeypatch.setattr(repository, "delete_all_diets", lambda user: None)
    monkeypatch.setattr(repository, "upsert_preferences", lambda user, patch: {"user_id": user.id, **patch})
    monkeypatch.setattr(repository, "upsert_profile", lambda user, patch: {"user_id": user.id, **patch})

    resp = client.post(
        "/nootr/diets/import",
        files={"file": ("dieta.docx", b"conteudo fake docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        data={"name": "Dieta Word"},
    )
    assert resp.status_code == 200
    assert seen_ext["value"] == ".docx"
