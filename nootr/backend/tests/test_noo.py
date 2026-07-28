"""Testes do Noo, o chat do Nootr (ver routes/nootr/noo.py)."""
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.auth import CurrentUser, get_current_user
from backend.app.data.taco import load_taco_foods
from backend.app.services import ai, repository
from backend.app.services.nutrition import scale_food


def _scaled(taco_id: int, grams: float) -> dict:
    taco = {f.id: f for f in load_taco_foods()}
    return scale_food(taco[taco_id], grams)


@pytest.fixture
def day_plan():
    meals = [
        {"id": "m1", "name": "Café da manhã", "time": "07:00", "foods": [_scaled(52, 50), _scaled(488, 100)]},
        {"id": "m2", "name": "Almoço", "time": "12:00", "foods": [_scaled(410, 150), _scaled(3, 150)]},
        {"id": "m3", "name": "Jantar", "time": "20:00", "foods": [_scaled(308, 150), _scaled(3, 150)]},
    ]
    return {
        "id": "dp-1", "diet_id": "d-1", "plan_date": "2026-07-27", "name": "Minha dieta",
        "daily_calories": 2000, "daily_protein_g": 120, "daily_carbs_g": 250, "daily_fat_g": 60,
        "meals": meals,
    }


@pytest.fixture
def client(monkeypatch, day_plan):
    monkeypatch.setattr(repository, "get_or_create_day_plan", lambda user, plan_date=None: day_plan)
    monkeypatch.setattr(repository, "get_preferences", lambda user: None)
    monkeypatch.setattr(repository, "list_noo_messages_today", lambda user: [])
    monkeypatch.setattr(repository, "count_noo_messages_today", lambda user: 0)
    monkeypatch.setattr(repository, "insert_noo_message", lambda *a, **k: {"id": "n1"})
    monkeypatch.setattr(repository, "update_day_plan_meals", lambda user, dp, meals: {"id": dp})
    monkeypatch.setattr(repository, "insert_substitution_log", lambda *a, **k: {"id": "log"})
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "basic"})
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id="u1", email="t@t.com", token="tok")
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_basic_gets_three_messages_a_day(client, monkeypatch):
    monkeypatch.setattr(repository, "count_noo_messages_today", lambda user: 3)
    resp = client.post("/nootr/noo", json={"text": "não comi o pão"})
    assert resp.status_code == 403
    assert "Pro" in resp.json()["detail"]  # convida pro upgrade


def test_pro_gets_twenty_five(client, monkeypatch):
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
    monkeypatch.setattr(repository, "count_noo_messages_today", lambda user: 24)
    monkeypatch.setattr(ai, "noo_chat", lambda *a, **k: {"reply": "ok", "changes": [], "already_eaten": []})
    resp = client.post("/nootr/noo", json={"text": "oi"})
    assert resp.status_code == 200
    assert resp.json()["remaining"] == 0


def test_applies_changes_across_several_meals(client, monkeypatch):
    # O diferencial do Noo: uma frase mexe em mais de uma refeição.
    monkeypatch.setattr(ai, "noo_chat", lambda *a, **k: {
        "reply": "Tirei o pão e coloquei o ovo no jantar.",
        "changes": [
            {"meal": "Café da manhã", "skipped": ["Pão de forma integral"], "added": []},
            {"meal": "Jantar", "skipped": [], "added": [{"name": "ovo", "quantity": "1 unidade"}]},
        ],
        "already_eaten": [],
    })
    resp = client.post("/nootr/noo", json={"text": "não comi o pão, vou comer um ovo no jantar"})
    assert resp.status_code == 200
    day = resp.json()["day"]
    cafe = next(m for m in day["meals"] if m["id"] == "m1")
    jantar = next(m for m in day["meals"] if m["id"] == "m3")
    # O pão continua na lista, marcado como removido (não some da tela).
    pao = next(f for f in cafe["foods"] if "Pão" in f["name"])
    assert pao["kind"] == "removed"
    assert any(f["name"].startswith("Ovo") and f["kind"] == "added" for f in jantar["foods"])
    # O dia inteiro volta, com totais antes e depois pra tela comparar.
    assert day["macros_before"]["calories"] > 0
    assert day["macros_after"]["calories"] > 0
    assert all("before" in m and "after" in m for m in day["meals"])


def test_conversation_without_changes_does_not_touch_the_day(client, monkeypatch):
    # Pergunta que não muda nada não pode gravar plano nem log.
    monkeypatch.setattr(ai, "noo_chat", lambda *a, **k: {
        "reply": "Ovo tem cerca de 6g de proteína por unidade.", "changes": [], "already_eaten": [],
    })
    touched = []
    monkeypatch.setattr(repository, "update_day_plan_meals", lambda *a, **k: touched.append("plan"))
    monkeypatch.setattr(repository, "insert_substitution_log", lambda *a, **k: touched.append("log"))
    resp = client.post("/nootr/noo", json={"text": "quanta proteína tem um ovo?"})
    assert resp.status_code == 200
    assert resp.json()["day"] is None
    assert touched == []


def test_ai_failure_does_not_consume_a_message(client, monkeypatch):
    # A mensagem só é gravada depois da IA responder: falha de rede não pode
    # gastar uma das 3 do dia.
    saved = []
    monkeypatch.setattr(repository, "insert_noo_message", lambda *a, **k: saved.append(a))
    def boom(*a, **k):
        raise ai.AIError("sem rede")
    monkeypatch.setattr(ai, "noo_chat", boom)
    resp = client.post("/nootr/noo", json={"text": "não comi o pão"})
    assert resp.status_code == 502
    assert saved == []


def test_allergy_barrier_blocks_what_noo_suggested(client, monkeypatch):
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "allergies": ["amendoim"], "dislikes": [], "likes": [], "pantry": [], "notes": "",
    })
    monkeypatch.setattr(ai, "noo_chat", lambda *a, **k: {
        "reply": "Coloquei amendoim.",
        "changes": [{"meal": "Jantar", "skipped": [], "added": [{"name": "amendoim torrado", "quantity": "30g"}]}],
        "already_eaten": [],
    })
    resp = client.post("/nootr/noo", json={"text": "quero algo a mais no jantar"})
    assert resp.status_code == 200
    jantar = next(m for m in resp.json()["day"]["meals"] if m["id"] == "m3")
    assert not any("mendoim" in f["name"] for f in jantar["foods"])
