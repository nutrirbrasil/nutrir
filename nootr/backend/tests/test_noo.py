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
        "meals": meals, "original_meals": [dict(m) for m in meals],
        "noo_messages_used": 0, "noo_reset_count": 0,
    }


@pytest.fixture
def client(monkeypatch, day_plan):
    monkeypatch.setattr(repository, "get_or_create_day_plan", lambda user, plan_date=None: day_plan)
    monkeypatch.setattr(repository, "get_preferences", lambda user: None)
    monkeypatch.setattr(repository, "list_noo_messages_today", lambda user: [])
    monkeypatch.setattr(repository, "insert_noo_message", lambda *a, **k: {"id": "n1"})
    monkeypatch.setattr(repository, "update_day_plan_meals", lambda user, dp, meals: {"id": dp})
    monkeypatch.setattr(repository, "insert_substitution_log", lambda *a, **k: {"id": "log"})
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "basic"})
    monkeypatch.setattr(repository, "delete_noo_messages_today", lambda user: None)

    def fake_record_used(user, dp_id, used):
        day_plan["noo_messages_used"] = used
        return {"id": dp_id, "noo_messages_used": used}

    def fake_reset(user, dp_id, original_meals, reset_count):
        day_plan["meals"] = original_meals
        day_plan["previous_meals"] = None
        day_plan["noo_reset_count"] = reset_count
        return dict(day_plan)

    monkeypatch.setattr(repository, "record_noo_message_used", fake_record_used)
    monkeypatch.setattr(repository, "reset_day_plan", fake_reset)
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id="u1", email="t@t.com", token="tok")
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_basic_gets_three_messages_a_day(client, day_plan):
    day_plan["noo_messages_used"] = 3
    resp = client.post("/nootr/noo", json={"text": "não comi o pão"})
    assert resp.status_code == 403
    assert "Pro" in resp.json()["detail"]  # convida pro upgrade


def test_pro_gets_twenty(client, monkeypatch, day_plan):
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
    day_plan["noo_messages_used"] = 19
    monkeypatch.setattr(ai, "noo_chat", lambda *a, **k: {"reply": "ok", "changes": [], "already_eaten": []})
    resp = client.post("/nootr/noo", json={"text": "oi"})
    assert resp.status_code == 200
    assert resp.json()["remaining"] == 0
    assert day_plan["noo_messages_used"] == 20


def test_resetting_reverts_the_diet_and_clears_the_chat(client, day_plan):
    # Simula um dia com o Noo já tendo mexido (meals != original_meals).
    day_plan["meals"] = [{"id": "m1", "name": "Café da manhã", "time": "07:00", "foods": []}]
    resp = client.delete("/nootr/noo")
    assert resp.status_code == 200
    assert day_plan["meals"] == day_plan["original_meals"]
    assert day_plan["noo_reset_count"] == 1


def test_reset_grants_a_bonus_message_capped_at_five_for_pro(client, monkeypatch, day_plan):
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
    for i in range(1, 7):
        resp = client.delete("/nootr/noo")
        assert resp.status_code == 200
        body = resp.json()
        expected_bonus = min(i, 5)
        assert body["limit"] == 20 + expected_bonus
    # A 6ª reiniciada não rende mais bônus, o teto já foi batido na 5ª.
    assert day_plan["noo_reset_count"] == 6


def test_reset_grants_a_bonus_message_capped_at_one_for_basic(client, day_plan):
    resp1 = client.delete("/nootr/noo")
    assert resp1.json()["limit"] == 4  # 3 base + 1
    resp2 = client.delete("/nootr/noo")
    assert resp2.json()["limit"] == 4  # não passa de +1


def test_reset_does_not_refund_messages_already_used(client, day_plan):
    # Reiniciar rende +1 no limite, mas não devolve mensagens já gastas,
    # senão reiniciar viraria um jeito de furar o limite diário.
    day_plan["noo_messages_used"] = 3
    resp = client.delete("/nootr/noo")
    assert resp.status_code == 200
    body = resp.json()
    assert body["limit"] == 4  # 3 + 1 de bônus
    assert body["remaining"] == 1  # 4 - 3 já usadas
    assert day_plan["noo_messages_used"] == 3  # intocado


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


def test_creates_a_new_meal_when_it_doesnt_fit_any_existing_one(client, monkeypatch, day_plan):
    # "quero uma sobremesa depois da janta" não cabe em nenhuma refeição da
    # tabela (a última é o jantar): o Noo pode nomear uma refeição nova, o
    # backend cria e aplica a mudança nela, em vez de descartar em silêncio.
    monkeypatch.setattr(ai, "noo_chat", lambda *a, **k: {
        "reply": "Adicionei doce de leite de sobremesa depois do jantar.",
        "changes": [
            {"meal": "Ceia", "time": "21:00", "skipped": [], "added": [{"name": "doce de leite", "quantity": "2 colheres de sopa"}]},
        ],
        "already_eaten": [],
    })
    resp = client.post("/nootr/noo", json={"text": "achei muito arroz na janta, quero uma sobremesa depois"})
    assert resp.status_code == 200
    day = resp.json()["day"]
    ceia = next((m for m in day["meals"] if m["name"] == "Ceia"), None)
    assert ceia is not None
    assert ceia["time"] == "21:00"
    assert any("doce de leite" in f["name"].lower() and f["kind"] == "added" for f in ceia["foods"])
    # A refeição nova persiste junto do resto do dia ajustado.
    assert any(m["name"] == "Ceia" for m in day_plan["meals"])


def test_does_not_create_an_empty_meal_with_nothing_to_add(client, monkeypatch, day_plan):
    # Só vale criar a refeição nova se há algo de fato pra colocar nela.
    monkeypatch.setattr(ai, "noo_chat", lambda *a, **k: {
        "reply": "Ok.",
        "changes": [{"meal": "Ceia", "time": "21:00", "skipped": ["algo"], "added": []}],
        "already_eaten": [],
    })
    resp = client.post("/nootr/noo", json={"text": "não vou comer nada na ceia"})
    assert resp.status_code == 200
    assert resp.json()["day"] is None
    assert not any(m["name"] == "Ceia" for m in day_plan["meals"])


def test_topup_kicks_in_when_normal_rebalance_cant_close_the_gap(client, monkeypatch, day_plan):
    # Mesma rede de segurança das 3 funções manuais, agora também no Noo: se
    # o rebalanceamento normal não fechar a meta de calorias (aqui forçado
    # via tolerância zero), pede um ajuste extra à IA antes de responder.
    from backend.app.services import day_topup, diet_engine

    monkeypatch.setattr(diet_engine, "calorie_tolerance", lambda calories: 0.0)
    monkeypatch.setattr(day_topup, "_TOPUP_PROTEIN_THRESHOLD", 0.0)
    monkeypatch.setattr(ai, "suggest_day_topup", lambda pending_meals, gap_calories, gap_protein, preferences=None: {
        "meal_name": "Jantar", "additions": [{"name": "batata doce", "quantity": "150g"}], "removals": [],
    })
    monkeypatch.setattr(ai, "noo_chat", lambda *a, **k: {
        "reply": "Ajustei o dia.",
        "changes": [{
            "meal": "Café da manhã",
            "skipped": [f["name"] for f in day_plan["meals"][0]["foods"]],
            "added": [],
        }],
        "already_eaten": [],
    })
    resp = client.post("/nootr/noo", json={"text": "não comi nada no café"})
    assert resp.status_code == 200
    jantar = next(m for m in resp.json()["day"]["meals"] if m["name"] == "Jantar")
    assert any("batata doce" in f["name"].lower() for f in jantar["foods"])


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
