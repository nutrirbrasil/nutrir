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
    monkeypatch.setattr(ai, "suggest_day_topup", lambda pending_meals, gap_calories, gap_protein, gap_fat=0.0, near_ceiling_foods=None, protein_poor_meals=None, preferences=None: {
        "changes": [
            {"meal_name": "Jantar", "additions": [{"name": "batata doce", "quantity": "150g"}]},
        ],
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


def test_allergy_barrier_catches_allergen_lost_in_generic_match(client, monkeypatch):
    # Achado testando ao vivo: o Noo propõe um item cujo NOME já denuncia o
    # alérgeno ("cobertura de chocolate COM LEITE"), mas o matcher casa isso
    # com o item comum genérico "Chocolate" (_COMMON_FOODS), que não é
    # tratado como lactose por padrão (chocolate puro não tem leite, só
    # ESSE item específico tem, segundo o próprio Noo). Checar só o
    # alimento casado deixava passar; a pessoa nunca mencionou "chocolate"
    # nem "leite" na própria mensagem, então a exceção user_named_it também
    # não se aplica (ver noo._resolve_added).
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "allergies": ["lactose"], "dislikes": [], "likes": [], "pantry": [], "notes": "",
    })
    monkeypatch.setattr(ai, "noo_chat", lambda *a, **k: {
        "reply": "Coloquei uma cobertura de chocolate.",
        "changes": [{
            "meal": "Jantar", "skipped": [],
            "added": [{"name": "cobertura de chocolate com leite", "quantity": "1 fatia"}],
        }],
        "already_eaten": [],
    })
    resp = client.post("/nootr/noo", json={"text": "quero algo doce a mais no jantar"})
    assert resp.status_code == 200
    body = resp.json()
    jantar = next(m for m in body["day"]["meals"] if m["id"] == "m3")
    assert not any("chocolate" in f["name"].lower() for f in jantar["foods"])
    assert "bate com uma alergia" in body["reply"].lower()


def test_blank_quantity_asks_instead_of_guessing(client, monkeypatch):
    # O Noo não sabe que quantidade de "kingcrab" a pessoa comeu e deixou
    # "quantity" vazio (ver regra do prompt): não aplica nada agora, só
    # devolve a pergunta na reply, sem tocar o dia nem chamar a IA de
    # estimativa nutricional (não faz sentido buscar macros sem saber gramas).
    monkeypatch.setattr(ai, "noo_chat", lambda *a, **k: {
        "reply": "Que quantidade de kingcrab você comeu?",
        "changes": [{"meal": "Jantar", "skipped": [], "added": [{"name": "kingcrab", "quantity": ""}]}],
        "already_eaten": [],
    })
    called = []
    monkeypatch.setattr(ai, "estimate_unknown_food", lambda name: called.append(name) or None)
    resp = client.post("/nootr/noo", json={"text": "comi kingcrab no jantar"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["day"] is None
    assert "kingcrab" in body["reply"].lower()
    assert called == []


def test_unknown_food_uses_ai_nutrition_estimate(client, monkeypatch, day_plan):
    # "kingcrab" não existe na TACO/extra/lista de comuns (cai em
    # source == "estimate" no food_matcher): a IA de estimativa nutricional é
    # quem dá os macros reais, não o placeholder genérico de 500kcal.
    monkeypatch.setattr(ai, "noo_chat", lambda *a, **k: {
        "reply": "Adicionei 150g de kingcrab no jantar.",
        "changes": [{"meal": "Jantar", "skipped": [], "added": [{"name": "kingcrab", "quantity": "150g"}]}],
        "already_eaten": [],
    })
    monkeypatch.setattr(ai, "estimate_unknown_food", lambda name: {
        "kcal_100g": 90.0, "protein_100g": 19.0, "carbs_100g": 0.0, "fat_100g": 1.5,
    })
    resp = client.post("/nootr/noo", json={"text": "comi 150g de kingcrab no jantar"})
    assert resp.status_code == 200
    jantar = next(m for m in resp.json()["day"]["meals"] if m["id"] == "m3")
    kingcrab = next(f for f in jantar["foods"] if "kingcrab" in f["name"].lower())
    assert kingcrab["calories"] == pytest.approx(135.0, abs=0.5)  # 90kcal/100g * 150g


def test_unknown_food_unrecognized_by_ai_asks_to_register_manually(client, monkeypatch, day_plan):
    # Nem a busca determinística nem a IA de estimativa reconheceram o
    # alimento: não aplica um chute generico, avisa pra cadastrar em Meus
    # Alimentos em vez de silenciar.
    monkeypatch.setattr(ai, "noo_chat", lambda *a, **k: {
        "reply": "Adicionei o item no jantar.",
        "changes": [{"meal": "Jantar", "skipped": [], "added": [{"name": "xyzalimento123", "quantity": "100g"}]}],
        "already_eaten": [],
    })
    monkeypatch.setattr(ai, "estimate_unknown_food", lambda name: None)
    resp = client.post("/nootr/noo", json={"text": "comi 100g de xyzalimento123 no jantar"})
    assert resp.status_code == 200
    body = resp.json()
    assert "xyzalimento123" in body["reply"]
    assert "Meus Alimentos" in body["reply"]
    jantar = next(m for m in (body["day"] or {"meals": day_plan["meals"]})["meals"] if m["id"] == "m3")
    assert not any("xyzalimento123" in f["name"].lower() for f in jantar["foods"])


def _audio_post(client, content_type="audio/webm;codecs=opus", data=b"fake-audio-bytes"):
    return client.post("/nootr/noo/audio", files={"file": ("audio.webm", data, content_type)})


def test_unresolved_food_blocks_only_its_own_meal_not_others(client, monkeypatch, day_plan):
    # Café da manhã (troca com quantidades certas) deve aplicar normal; o
    # Almoço (item não reconhecido) fica intocado até cadastrar, mas isso não
    # pode contaminar a refeição do café, que não tem nada a ver com o item
    # desconhecido.
    monkeypatch.setattr(ai, "noo_chat", lambda *a, **k: {
        "reply": "Ajustei seu dia e adicionei o Rei Alberto no almoço.",
        "changes": [
            {
                "meal": "Café da manhã",
                "skipped": ["Pão de forma integral", "Ovo de galinha"],
                "added": [{"name": "leite", "quantity": "1 copo"}],
            },
            {
                "meal": "Almoço",
                "skipped": [],
                "added": [{"name": "Rei Alberto", "quantity": "1 porção"}],
            },
        ],
        "already_eaten": [],
    })
    monkeypatch.setattr(ai, "estimate_unknown_food", lambda name: None)
    resp = client.post("/nootr/noo", json={"text": "café da manhã tomei leite, almoço comi Rei Alberto de sobremesa"})
    assert resp.status_code == 200
    body = resp.json()
    assert "Almoço" in body["reply"]
    assert "Rei Alberto" in body["reply"]
    assert "Meus Alimentos" in body["reply"]

    cafe = next(m for m in body["day"]["meals"] if m["id"] == "m1")
    by_name = {f["name"].lower(): f["kind"] for f in cafe["foods"]}
    assert by_name["ovo de galinha"] == "removed"
    assert any(kind == "added" and "leite" in name for name, kind in by_name.items())

    # O dia pode reajustar Almoço por tabela (ex: day_topup cobrindo a
    # proteína/caloria que sumiu do café), isso é esperado. O que não pode
    # acontecer de jeito nenhum é "Rei Alberto" ser aplicado de qualquer
    # forma, mesmo indiretamente.
    almoco = next(m for m in body["day"]["meals"] if m["id"] == "m2")
    assert not any("rei alberto" in f["name"].lower() for f in almoco["foods"])


def test_audio_is_pro_only(client, monkeypatch):
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "basic"})
    resp = _audio_post(client)
    assert resp.status_code == 403
    assert "Pro" in resp.json()["detail"]


def test_audio_transcript_follows_the_same_path_as_typed_text(client, monkeypatch, day_plan):
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
    monkeypatch.setattr(ai, "transcribe_audio", lambda audio, mime: "não comi o pão do café")
    seen = {}

    def fake_chat(history, *a, **k):
        seen["last"] = history[-1]["text"]
        return {
            "reply": "Beleza, tirei o pão.",
            "changes": [{"meal": "Café da manhã", "skipped": ["Pão francês"], "added": []}],
            "already_eaten": [],
        }

    monkeypatch.setattr(ai, "noo_chat", fake_chat)
    resp = _audio_post(client)
    assert resp.status_code == 200
    body = resp.json()
    # A transcrição é o que vira a mensagem da pessoa, e volta pro chat mostrar.
    assert body["transcript"] == "não comi o pão do café"
    assert seen["last"] == "não comi o pão do café"
    assert body["day"] is not None
    # Consome uma mensagem do dia igual a uma digitada.
    assert day_plan["noo_messages_used"] == 1


def test_audio_is_saved_with_the_message_so_it_can_be_replayed(client, monkeypatch):
    # A pessoa precisa conseguir reouvir o próprio áudio na conversa (e
    # conferir contra a transcrição), então ele é gravado junto da mensagem.
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
    monkeypatch.setattr(ai, "transcribe_audio", lambda audio, mime: "comi uma banana")
    monkeypatch.setattr(ai, "noo_chat", lambda *a, **k: {
        "reply": "Anotado.", "changes": [], "already_eaten": [],
    })
    saved = []
    monkeypatch.setattr(
        repository, "insert_noo_message",
        lambda user, role, text, changes=None, audio=None: saved.append((role, text, audio)) or {"id": "n1"},
    )
    resp = _audio_post(client, data=b"bytes-do-audio")
    assert resp.status_code == 200
    body = resp.json()
    assert body["audio"].startswith("data:audio/webm;base64,")
    # A mensagem da pessoa guarda o áudio; a resposta do Noo não tem áudio.
    user_msg = next(s for s in saved if s[0] == "user")
    assert user_msg[1] == "comi uma banana"
    assert user_msg[2] == body["audio"]
    assert all(s[2] is None for s in saved if s[0] == "assistant")


def test_typed_message_has_no_audio(client, monkeypatch):
    monkeypatch.setattr(ai, "noo_chat", lambda *a, **k: {
        "reply": "Anotado.", "changes": [], "already_eaten": [],
    })
    saved = []
    monkeypatch.setattr(
        repository, "insert_noo_message",
        lambda user, role, text, changes=None, audio=None: saved.append(audio) or {"id": "n1"},
    )
    resp = client.post("/nootr/noo", json={"text": "comi uma banana"})
    assert resp.status_code == 200
    assert saved and all(a is None for a in saved)


def test_audio_rejects_unsupported_format(client, monkeypatch):
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
    resp = _audio_post(client, content_type="application/pdf")
    assert resp.status_code == 400


def test_audio_over_the_daily_limit_does_not_pay_for_a_transcription(client, monkeypatch, day_plan):
    # Transcrever é uma chamada de IA à parte: se o turno vai ser recusado
    # por limite de qualquer jeito, ela não pode nem acontecer.
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
    day_plan["noo_messages_used"] = 20
    called = []
    monkeypatch.setattr(ai, "transcribe_audio", lambda audio, mime: called.append(mime) or "oi")
    resp = _audio_post(client)
    assert resp.status_code == 403
    assert called == []


def test_audio_that_could_not_be_understood_does_not_consume_a_message(client, monkeypatch, day_plan):
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
    monkeypatch.setattr(ai, "transcribe_audio", lambda audio, mime: "   ")
    resp = _audio_post(client)
    assert resp.status_code == 422
    assert day_plan["noo_messages_used"] == 0


def test_pending_quantity_does_not_remove_the_old_food_yet(client, monkeypatch, day_plan):
    # "Café da manhã comi só um pão com geleia": é uma troca (tira o cardápio
    # original, poe pão+geleia no lugar), mas a quantidade não veio. Nada
    # pode acontecer ainda, nem tirar o que ja estava la, senao o dia fica
    # desregulado duas vezes (uma agora, outra quando a quantidade chegar).
    monkeypatch.setattr(ai, "noo_chat", lambda *a, **k: {
        "reply": "Quantas fatias de pão e quanto de geleia você comeu?",
        "changes": [{
            "meal": "Café da manhã",
            "skipped": ["Pão de forma integral", "Ovo de galinha"],
            "added": [{"name": "pão com geleia", "quantity": ""}],
        }],
        "already_eaten": [],
    })
    resp = client.post("/nootr/noo", json={"text": "café da manhã comi só um pão com geleia"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["day"] is None
    assert "quant" in body["reply"].lower()
    # A refeição continua intacta, nada foi removido.
    cafe = next(m for m in day_plan["meals"] if m["id"] == "m1")
    assert len(cafe["foods"]) == 2


def test_answering_the_quantity_applies_the_full_swap_at_once(client, monkeypatch, day_plan):
    # Quando a IA devolve o skipped de novo JUNTO com o added já com
    # quantidade (regra 12 do prompt), a troca completa é aplicada numa
    # tacada só.
    monkeypatch.setattr(ai, "noo_chat", lambda *a, **k: {
        "reply": "Beleza, troquei o café da manhã pelo pão com geleia.",
        "changes": [{
            "meal": "Café da manhã",
            "skipped": ["Pão de forma integral", "Ovo de galinha"],
            "added": [
                {"name": "pão de forma", "quantity": "2 fatias"},
                {"name": "geleia", "quantity": "1 colher de sopa"},
            ],
        }],
        "already_eaten": [],
    })
    resp = client.post("/nootr/noo", json={"text": "2 fatias de pão e 1 colher de geleia"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["day"] is not None
    cafe = next(m for m in body["day"]["meals"] if m["id"] == "m1")
    # build_day_view mostra o antes/depois: o alimento antigo aparece marcado
    # "removed" (é assim que a tela risca em vermelho), não some da lista.
    by_name = {f["name"].lower(): f["kind"] for f in cafe["foods"]}
    assert by_name["ovo de galinha"] == "removed"
    assert by_name["pão de forma integral"] == "removed"
    assert any(kind == "added" and "pão" in name for name, kind in by_name.items())
