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
