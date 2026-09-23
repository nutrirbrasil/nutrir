"""
Testes das rotas Nootr com TestClient. O acesso a dados (repository/Supabase) é
substituído por um fake em memória, então os testes não tocam a rede nem exigem
credenciais, validam só o contrato HTTP + o encaixe com o motor.
"""
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
    monkeypatch.setattr(
        repository, "update_day_plan_meals",
        lambda user, dp_id, meals, previous_meals=None: {"id": dp_id, "meals": meals},
    )
    monkeypatch.setattr(repository, "insert_substitution_log", lambda *a, **k: {"id": "log-1"})
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "basic"})
    monkeypatch.setattr(repository, "list_diets", lambda user: [])
    monkeypatch.setattr(repository, "search_custom_foods", lambda user, q, limit=8: [])
    monkeypatch.setattr(repository, "search_global_custom_foods", lambda user, q, limit=8: [])
    monkeypatch.setattr(repository, "get_preferences", lambda user: None)
    monkeypatch.setattr(repository, "list_recipes", lambda user: [])
    monkeypatch.setattr(repository, "list_global_recipes", lambda user: [])
    # Limites do Basic: por padrão o usuário não bateu nenhum limite (testes
    # específicos sobrescrevem essas contagens).
    monkeypatch.setattr(repository, "count_substitutions_on", lambda user, plan_date: 0)
    monkeypatch.setattr(repository, "count_recipes", lambda user: 0)
    monkeypatch.setattr(repository, "get_pending_diet", lambda user: None)
    monkeypatch.setattr(repository, "diet_for_today", lambda user: fake_day_plan)
    # Não tocar a rede: a explicação da IA e o "top-up" do dia são mockados.
    from backend.app.services import ai
    monkeypatch.setattr(ai, "explain_change", lambda ctx: "")
    monkeypatch.setattr(ai, "suggest_day_topup", lambda pending_meals, gap_calories, gap_protein, gap_fat=0.0, near_ceiling_foods=None, protein_poor_meals=None, preferences=None: None)

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id="u1", email="t@t.com", token="tok")
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def client_no_diet(monkeypatch):
    monkeypatch.setattr(repository, "get_or_create_day_plan", lambda user, plan_date=None: None)
    monkeypatch.setattr(repository, "get_pending_diet", lambda user: None)
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
    assert body["original_diet"]["id"] == "dp-1"


def test_today_diet_target_reflects_live_profile_not_the_frozen_snapshot(client, monkeypatch):
    # Dieta gerada pelo Nootr é só o ponto de partida: se a pessoa depois
    # ajusta a meta calórica/g_per_kg no perfil, a barra de "alvo" tem que
    # acompanhar, não ficar presa no valor de quando a dieta foi salva.
    monkeypatch.setattr(repository, "get_profile", lambda user: {
        "plan": "pro", "weight_kg": 80, "macro_mode": "per_kg",
        "target_calories": 2600, "protein_g_per_kg": 2.5, "fat_g_per_kg": 1.0,
    })
    resp = client.get("/nootr/diets/today")
    assert resp.status_code == 200
    body = resp.json()
    assert body["diet"]["daily_calories"] == 2600
    assert body["diet"]["daily_protein_g"] == 200  # 80kg * 2,5
    assert body["original_diet"]["daily_protein_g"] == 200


def test_today_empty_state_when_no_diet(client_no_diet):
    resp = client_no_diet.get("/nootr/diets/today")
    assert resp.status_code == 200
    body = resp.json()
    assert body["diet"] is None
    assert body["needs_setup"] is True


def test_substitution_with_structured_foods(client, fake_day_plan):
    # esquema de troca: sinaliza o que não comeu (skipped_food_names) e o que
    # comeu no lugar (foods), o resto da refeição permanece intacto.
    skipped = fake_day_plan["meals"][1]["foods"][0]["name"]
    resp = client.post(
        "/nootr/substitutions",
        json={"action": "ate_different", "meal_id": "meal-2",
              "skipped_food_names": [skipped],
              "foods": [{"taco_id": 315, "grams": 300, "quantity_label": "1 prato"}]},
    )
    assert resp.status_code == 200
    body = resp.json()
    almoco = next(m for m in body["adjusted_meals"] if m["id"] == "meal-2")
    names = [f["name"] for f in almoco["foods"]]
    assert skipped not in names
    assert len(almoco["foods"]) == 2  # trocou 1, manteve o outro
    assert almoco["foods"][-1]["quantity"] == "1 prato"


def test_substitution_applies_day_topup_when_gap_is_big(client, fake_day_plan, monkeypatch):
    from backend.app.routes.nootr import substitutions as substitutions_route
    from backend.app.services import day_topup, diet_engine

    # força o gatilho do top-up independente do tamanho real da diferença.
    monkeypatch.setattr(diet_engine, "calorie_tolerance", lambda calories: 0.0)
    monkeypatch.setattr(day_topup, "_TOPUP_PROTEIN_THRESHOLD", 0.0)
    monkeypatch.setattr(
        substitutions_route.ai, "suggest_day_topup",
        lambda pending_meals, gap_calories, gap_protein, gap_fat=0.0, near_ceiling_foods=None, protein_poor_meals=None, preferences=None: {
            "changes": [
                {"meal_name": "Jantar", "additions": [{"name": "batata doce", "quantity": "150g"}]},
            ],
        },
    )

    # Pula os DOIS alimentos do almoço (não só um), pra deixar um déficit
    # maior do que o jantar sozinho consegue fechar dentro do próprio teto de
    # crescimento (2x): sobra um resíduo de verdade pro top-up ajudar a
    # fechar, em vez de um gap que o rebalanceamento normal já zerava sozinho
    # (nesse caso a rede de "não aceita sugestão que piora" rejeitaria a
    # adição, corretamente, por não haver mais o que melhorar).
    skipped = [f["name"] for f in fake_day_plan["meals"][1]["foods"]]
    resp = client.post(
        "/nootr/substitutions",
        json={"action": "ate_different", "meal_id": "meal-2", "skipped_food_names": skipped, "foods": []},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["topup_applied"][0]["meal_name"] == "Jantar"
    jantar = next(m for m in body["adjusted_meals"] if m["name"] == "Jantar")
    names = [f["name"] for f in jantar["foods"]]
    assert any("batata doce" in n.lower() for n in names)


def test_day_topup_blocked_by_allergy(client, fake_day_plan, monkeypatch):
    from backend.app.routes.nootr import substitutions as substitutions_route
    from backend.app.services import day_topup, diet_engine

    monkeypatch.setattr(diet_engine, "calorie_tolerance", lambda calories: 0.0)
    monkeypatch.setattr(day_topup, "_TOPUP_PROTEIN_THRESHOLD", 0.0)
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "pantry": [], "allergies": ["amendoim"], "dislikes": [], "likes": [], "notes": "",
    })
    monkeypatch.setattr(
        substitutions_route.ai, "suggest_day_topup",
        lambda pending_meals, gap_calories, gap_protein, gap_fat=0.0, near_ceiling_foods=None, protein_poor_meals=None, preferences=None: {
            "changes": [
                {"meal_name": "Jantar", "additions": [{"name": "amendoim torrado", "quantity": "50g"}]},
            ],
        },
    )

    skipped = fake_day_plan["meals"][1]["foods"][0]["name"]
    resp = client.post(
        "/nootr/substitutions",
        json={"action": "ate_different", "meal_id": "meal-2", "skipped_food_names": [skipped], "foods": []},
    )
    assert resp.status_code == 200
    assert "topup_applied" not in resp.json()


def test_substitution_ate_different_requires_skip_or_food(client):
    resp = client.post(
        "/nootr/substitutions",
        json={"action": "ate_different", "meal_id": "meal-2"},
    )
    assert resp.status_code == 400


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


def test_substitution_blocked_at_basic_daily_limit(client, monkeypatch):
    # Basic que já fez 3 substituições hoje é bloqueado na 4ª.
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "basic"})
    monkeypatch.setattr(repository, "count_substitutions_on", lambda user, plan_date: 3)
    resp = client.post(
        "/nootr/substitutions",
        json={"action": "ate_different", "meal_id": "meal-2",
              "skipped_food_names": [], "foods": [{"taco_id": 3, "grams": 100}]},
    )
    assert resp.status_code == 403


def test_substitution_unlimited_for_pro(client, fake_day_plan, monkeypatch):
    # Pro com muitas substituições no dia continua sem bloqueio.
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
    monkeypatch.setattr(repository, "count_substitutions_on", lambda user, plan_date: 99)
    skipped = fake_day_plan["meals"][1]["foods"][0]["name"]
    resp = client.post(
        "/nootr/substitutions",
        json={"action": "ate_different", "meal_id": "meal-2",
              "skipped_food_names": [skipped],
              "foods": [{"taco_id": 315, "grams": 300}]},
    )
    assert resp.status_code == 200


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


def test_missing_food_options_does_not_filter_pantry_by_allergy(client, monkeypatch):
    # A despensa ("costumo ter em casa") é a própria pessoa dizendo "eu
    # tenho/consumo isso", mesmo que bata com uma alergia cadastrada (pode
    # ser uma reação leve que ela sabe que tolera). Não filtra por design,
    # igual o Noo chat quando a PRÓPRIA pessoa nomeia o alimento.
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "pantry": ["Queijo mussarela", "Batata doce cozida"],
        "allergies": ["lactose"], "dislikes": [], "likes": [], "notes": "",
    })
    resp = client.get("/nootr/substitutions/missing-food-options", params={"food_name": "ovo cozido"})
    assert resp.status_code == 200
    body = resp.json()
    names = [m["name"].lower() for m in body["pantry_matches"]]
    assert any("queijo" in n for n in names)


def test_suggest_alternatives_calls_ai(client, monkeypatch):
    from backend.app.services import ai
    monkeypatch.setattr(repository, "get_preferences", lambda user: None)
    monkeypatch.setattr(ai, "suggest_substitutes", lambda missing, prefs: ["batata doce", "macarrão"])
    resp = client.post("/nootr/substitutions/alternatives", json={"missing_food_name": "arroz"})
    assert resp.status_code == 200
    assert len(resp.json()["suggestions"]) == 2


def test_suggest_alternatives_filters_allergy(client, monkeypatch):
    # A IA "erra" e sugere amendoim mesmo com a instrução do prompt, a
    # barreira determinística descarta antes de devolver pro usuário. Pantry
    # vazia aqui: amendoim não é algo que a pessoa disse que tem/consome (ver
    # test_suggest_alternatives_allows_pantry_item_despite_allergy pro caso
    # oposto), então a barreira vale a sério.
    from backend.app.services import ai
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "allergies": ["amendoim"], "dislikes": [], "likes": [], "pantry": [], "notes": "",
    })
    monkeypatch.setattr(ai, "suggest_substitutes", lambda missing, prefs: ["amendoim torrado", "batata doce"])
    resp = client.post("/nootr/substitutions/alternatives", json={"missing_food_name": "arroz"})
    assert resp.status_code == 200
    names = [s["name"].lower() for s in resp.json()["suggestions"]]
    assert not any("amendoim" in n for n in names)
    assert any("batata doce" in n for n in names)


def test_suggest_alternatives_allows_pantry_item_despite_allergy(client, monkeypatch):
    # Achado em feedback do usuário: a despensa/favoritos nunca passam pela
    # barreira de alergia em nenhum outro lugar do app (ver
    # missing_food_options e feedback_nootr_allergy_filter_pantry_exemption),
    # porque a pessoa ter cadastrado o item ali já é ela dizendo que consome,
    # mesmo batendo numa alergia registrada. Se a IA sugerir de volta um item
    # que já está na despensa da pessoa, a mesma isenção vale: não é a IA
    # "adivinhando" algo perigoso, é reconfirmar algo que a própria pessoa já
    # disse que tem em casa.
    from backend.app.services import ai
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "allergies": ["amendoim"], "dislikes": [], "likes": [], "pantry": ["Amendoim torrado"], "notes": "",
    })
    monkeypatch.setattr(ai, "suggest_substitutes", lambda missing, prefs: ["amendoim torrado", "batata doce"])
    resp = client.post("/nootr/substitutions/alternatives", json={"missing_food_name": "arroz"})
    assert resp.status_code == 200
    names = [s["name"].lower() for s in resp.json()["suggestions"]]
    assert any("amendoim" in n for n in names)
    assert any("batata doce" in n for n in names)


def test_suggest_alternatives_filters_allergy_lost_in_generic_match(client, monkeypatch):
    # A IA sugere "sanduíche natural com queijo derretido": o matcher casa
    # isso com o item comum genérico "Sanduiche natural" (_COMMON_FOODS),
    # cujo nome NÃO contém "queijo"/"leite". Checar só o alimento casado
    # deixava passar um item com lactose pra quem tem essa alergia, porque a
    # palavra que denunciava o alérgeno só existia na sugestão ORIGINAL da
    # IA, não no nome final. A barreira precisa checar os dois.
    from backend.app.services import ai
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "allergies": ["lactose"], "dislikes": [], "likes": [], "pantry": [], "notes": "",
    })
    monkeypatch.setattr(
        ai, "suggest_substitutes",
        lambda missing, prefs: ["sanduíche natural com queijo derretido", "batata doce"],
    )
    resp = client.post("/nootr/substitutions/alternatives", json={"missing_food_name": "arroz"})
    assert resp.status_code == 200
    names = [s["name"].lower() for s in resp.json()["suggestions"]]
    assert not any("sanduiche" in n or "sanduíche" in n for n in names)
    assert any("batata doce" in n for n in names)


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
    monkeypatch.setattr(ai, "suggest_wildcard", lambda meal_name, current, gap, pantry, missing_food="": "Ovo cozido")
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


def test_missing_food_wildcard_blocked_by_allergy(client, monkeypatch, gap_day_plan):
    # Mesmo se a IA "errar" e sugerir amendoim (violando a própria instrução do
    # prompt), a barreira determinística descarta a sugestão antes de chegar
    # no usuário: amendoim NÃO está na despensa aqui (ver
    # test_missing_food_wildcard_allows_pantry_item_despite_allergy pro caso
    # oposto), então nem chega a ser considerado pantry (ver
    # test_missing_food_wildcard_rejects_item_not_in_pantry, que isola essa
    # mesma barreira sem um alérgeno envolvido).
    from backend.app.services import ai
    monkeypatch.setattr(repository, "get_or_create_day_plan", lambda user, plan_date=None: gap_day_plan)
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "pantry": ["Ovo cozido"], "allergies": ["amendoim"], "dislikes": [], "likes": [], "notes": "",
    })
    monkeypatch.setattr(
        ai, "suggest_wildcard", lambda meal_name, current, gap, preferences, missing_food="": "amendoim torrado",
    )
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


def test_missing_food_wildcard_allows_pantry_item_despite_allergy(client, monkeypatch, gap_day_plan):
    # Achado em feedback do usuário: a despensa NUNCA passa pela barreira de
    # alergia em nenhum outro lugar do app (ver missing_food_options e
    # feedback_nootr_allergy_filter_pantry_exemption), porque cadastrar um
    # item ali já é a pessoa dizendo "eu tenho/consumo isso", mesmo que bata
    # numa alergia registrada (a alergia pode ser leve o bastante pra ela
    # tolerar aquele item específico). O coringa pede pra IA escolher algo
    # QUE JÁ ESTÁ na despensa, então a mesma isenção vale aqui: se o item
    # sugerido é de fato um item da despensa/favoritos, a barreira de
    # alergia não deve descartá-lo.
    from backend.app.services import ai
    monkeypatch.setattr(repository, "get_or_create_day_plan", lambda user, plan_date=None: gap_day_plan)
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "pantry": ["Amendoim torrado"], "allergies": ["amendoim"], "dislikes": [], "likes": [], "notes": "",
    })
    monkeypatch.setattr(
        ai, "suggest_wildcard", lambda meal_name, current, gap, preferences, missing_food="": "amendoim torrado",
    )
    resp = client.post(
        "/nootr/substitutions",
        json={
            "action": "missing_food", "meal_id": "jantar", "missing_food_name": "Frango grelhado",
            "foods": [{"name": "Batata doce cozida", "grams": 150, "kcal_100g": 77,
                       "protein_100g": 1.6, "carbs_100g": 18, "fat_100g": 0.1}],
        },
    )
    assert resp.status_code == 200
    assert "amendoim" in resp.json()["wildcard_added"].lower()


def test_missing_food_wildcard_rejects_item_not_in_pantry(client, monkeypatch, gap_day_plan):
    # Pedido do usuário: o coringa só pode ESCOLHER algo que a pessoa já tem
    # na despensa/favoritos, a IA nunca pode inventar um alimento novo (isso
    # é papel do "Buscar outros alimentos", uma ação separada). Aqui a IA
    # sugere "banana" (sem nenhum alérgeno envolvido, isolando a barreira do
    # caso de alergia) mas a despensa só tem "Ovo cozido": a barreira
    # determinística rejeita mesmo sem nenhuma alergia cadastrada.
    from backend.app.services import ai
    monkeypatch.setattr(repository, "get_or_create_day_plan", lambda user, plan_date=None: gap_day_plan)
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "pantry": ["Ovo cozido"], "allergies": [], "dislikes": [], "likes": [], "notes": "",
    })
    monkeypatch.setattr(
        ai, "suggest_wildcard", lambda meal_name, current, gap, preferences, missing_food="": "banana",
    )
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


def test_missing_food_wildcard_never_readds_the_missing_food(client, monkeypatch):
    # Achado testando ao vivo: "estou sem peito de frango" gerou um coringa
    # sugerindo "Peito de Frango" de volta, porque a despensa ("costumo ter
    # em casa") é uma lista geral, não sabe o que falta especificamente
    # hoje. Mesmo se a IA ignorar a instrução do prompt (ver missing_food no
    # _WILDCARD_PROMPT) e sugerir de volta o próprio alimento em falta, a
    # barreira determinística descarta antes. Usa o nome real casado pela
    # TACO ("Peito de Frango", taco_id 410) pra refletir o cenário de
    # verdade, não um nome de fixture arbitrário.
    from backend.app.services import ai
    day_plan = {
        "id": "dp-3", "diet_id": "diet-3", "plan_date": "2026-07-03",
        "name": "Dieta gap", "daily_calories": 200,
        "daily_protein_g": 30, "daily_carbs_g": 0, "daily_fat_g": 8,
        "meals": [{
            "id": "jantar", "name": "Jantar", "time": "19:30",
            "foods": [{
                "name": "Peito de Frango", "calories": 200, "protein_g": 30, "carbs_g": 0, "fat_g": 8,
                "grams": 120, "quantity": "120g", "taco_id": 410,
            }],
        }],
    }
    monkeypatch.setattr(repository, "get_or_create_day_plan", lambda user, plan_date=None: day_plan)
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "pantry": ["Peito de Frango"], "allergies": [], "dislikes": [], "likes": [], "notes": "",
    })
    monkeypatch.setattr(
        ai, "suggest_wildcard", lambda meal_name, current, gap, preferences, missing_food="": "Peito de Frango",
    )
    resp = client.post(
        "/nootr/substitutions",
        json={
            "action": "missing_food", "meal_id": "jantar", "missing_food_name": "Peito de Frango",
            "foods": [{"name": "Batata doce cozida", "grams": 150, "kcal_100g": 77,
                       "protein_100g": 1.6, "carbs_100g": 18, "fat_100g": 0.1}],
        },
    )
    assert resp.status_code == 200
    assert "wildcard_added" not in resp.json()


def test_missing_food_no_wildcard_when_ai_declines(client, monkeypatch, gap_day_plan):
    from backend.app.services import ai
    monkeypatch.setattr(repository, "get_or_create_day_plan", lambda user, plan_date=None: gap_day_plan)
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "pantry": ["Ovo cozido"], "allergies": [], "dislikes": [], "likes": [], "notes": "",
    })
    monkeypatch.setattr(ai, "suggest_wildcard", lambda meal_name, current, gap, pantry, missing_food="": None)
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


def test_foods_search_merges_custom_foods(client, monkeypatch):
    monkeypatch.setattr(
        repository, "search_custom_foods",
        lambda user, q, limit=8: [{
            "id": "cf-1", "name": "Vitamina caseira da vó", "kcal_100g": 90,
            "protein_100g": 3, "carbs_100g": 12, "fat_100g": 3, "status": "pending",
        }],
    )
    resp = client.get("/nootr/foods/search", params={"q": "vitamina"})
    assert resp.status_code == 200
    results = resp.json()["results"]
    custom = [r for r in results if r["custom_id"] == "cf-1"]
    assert len(custom) == 1
    assert custom[0]["taco_id"] is None
    assert custom[0]["pending_approval"] is True
    assert custom[0]["name"] == "Vitamina caseira da vó"


def test_parse_meal_returns_skip_and_new_items(client, monkeypatch):
    monkeypatch.setattr(
        ai, "converse_meal",
        lambda history, meal_name, meal_foods, preferences, force_finalize=False, recipes=None, forward_looking=False: {
            "needs_question": False, "question": "", "question_kind": "",
            "skipped_names": [meal_foods[0]], "new_items": [{"name": "bolo", "quantity": "1 fatia"}],
            "proposed_dish_name": "", "proposed_ingredients": [],
        },
    )
    resp = client.post("/nootr/ai/parse-meal", json={
        "text": "não comi o pão e comi um pedaço de bolo no lugar",
        "meal_name": "Café da manhã",
        "meal_foods": ["Pão francês", "Café com leite"],
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "done"
    assert body["skipped_names"] == ["Pão francês"]
    assert body["foods"][0]["name"]


def test_parse_meal_can_ask_a_question(client, monkeypatch):
    monkeypatch.setattr(
        ai, "converse_meal",
        lambda history, meal_name, meal_foods, preferences, force_finalize=False, recipes=None, forward_looking=False: {
            "needs_question": True, "question": "Quantas fatias de bolo?", "question_kind": "text",
            "skipped_names": [], "new_items": [], "proposed_dish_name": "", "proposed_ingredients": [],
        },
    )
    resp = client.post("/nootr/ai/parse-meal", json={
        "text": "comi bolo no lugar do pão",
        "meal_name": "Café da manhã",
        "meal_foods": ["Pão francês", "Café com leite"],
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "question"
    assert "history" in body


def test_parse_meal_asks_to_confirm_unknown_dish_ingredients(client, monkeypatch):
    monkeypatch.setattr(
        ai, "converse_meal",
        lambda history, meal_name, meal_foods, preferences, force_finalize=False, recipes=None, forward_looking=False: {
            "needs_question": True, "question": "Esses são os ingredientes da sua crepioca?",
            "question_kind": "confirm_ingredients", "skipped_names": [], "new_items": [],
            "proposed_dish_name": "Crepioca",
            "proposed_ingredients": [
                {"name": "goma de tapioca", "quantity": "1 colher de sopa"},
                {"name": "ovo", "quantity": "1 unidade"},
            ],
        },
    )
    resp = client.post("/nootr/ai/parse-meal", json={
        "text": "não comi o pão e comi uma crepioca",
        "meal_name": "Café da manhã",
        "meal_foods": ["Pão francês", "Café com leite"],
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "question"
    assert body["question_kind"] == "confirm_ingredients"
    assert body["proposed_dish_name"] == "Crepioca"
    assert len(body["proposed_ingredients"]) == 2


def test_parse_meal_done_offers_to_save_confirmed_dish(client, monkeypatch):
    monkeypatch.setattr(
        ai, "converse_meal",
        lambda history, meal_name, meal_foods, preferences, force_finalize=False, recipes=None, forward_looking=False: {
            "needs_question": False, "question": "", "question_kind": "",
            "skipped_names": [meal_foods[0]],
            "new_items": [{"name": "goma de tapioca", "quantity": "1 colher de sopa"}, {"name": "ovo", "quantity": "1 unidade"}],
            "proposed_dish_name": "Crepioca", "proposed_ingredients": [],
        },
    )
    resp = client.post("/nootr/ai/parse-meal", json={
        "text": "sim, está correto",
        "meal_name": "Café da manhã",
        "meal_foods": ["Pão francês", "Café com leite"],
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "done"
    assert body["proposed_dish_name"] == "Crepioca"
    assert len(body["foods"]) == 2


def test_parse_meal_blocks_allergen_lost_in_generic_match(client, monkeypatch):
    # Achado testando ao vivo (cenário real da "torta de limão"): a IA
    # decompõe um prato citando o alérgeno explicitamente na descrição (ex:
    # "cobertura de chocolate COM LEITE"), mas o matcher casa isso com o item
    # comum genérico "Chocolate" (_COMMON_FOODS), cujo nome final não é
    # tratado como lactose por padrão (chocolate puro não tem leite, só
    # ESSE item específico tem, segundo a própria IA). Checar só o alimento
    # casado deixava passar, porque a palavra que denunciava o alérgeno só
    # existia na descrição ORIGINAL da IA, perdida no match genérico. A
    # barreira precisa checar as duas (ver ai._match_items).
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "allergies": ["lactose"], "dislikes": [], "likes": [], "pantry": [], "notes": "",
    })
    monkeypatch.setattr(
        ai, "converse_meal",
        lambda history, meal_name, meal_foods, preferences, force_finalize=False, recipes=None, forward_looking=False: {
            "needs_question": False, "question": "", "question_kind": "",
            "skipped_names": [], "new_items": [
                {"name": "cobertura de chocolate com leite", "quantity": "1 fatia"},
                {"name": "massa de bolo", "quantity": "1 fatia"},
            ],
            "proposed_dish_name": "Bolo de chocolate", "proposed_ingredients": [],
        },
    )
    resp = client.post("/nootr/ai/parse-meal", json={
        "text": "vou comer um pedaço de bolo de chocolate",
        "meal_name": "Jantar", "meal_foods": ["Arroz branco"],
    })
    assert resp.status_code == 200
    body = resp.json()
    names = [f["name"].lower() for f in body["foods"]]
    assert not any("chocolate" in n for n in names)
    assert "Chocolate" in body["blocked_allergens"]


def test_parse_meal_does_not_block_explicit_free_of_claim(client, monkeypatch):
    # Achado testando ao vivo, o outro lado do teste acima: "hambúrguer sem
    # pão" casa com o item genérico "Hamburguer" (glúten por padrão, ver
    # food_matcher._ALLERGEN_FOODS), mas a PRÓPRIA descrição já excluiu a
    # fonte do alérgeno. Bloquear isso seria pior que o bug original: a
    # pessoa já fez a escolha seguro, e o app ainda assim recusaria o prato.
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "allergies": ["glúten"], "dislikes": [], "likes": [], "pantry": [], "notes": "",
    })
    monkeypatch.setattr(
        ai, "converse_meal",
        lambda history, meal_name, meal_foods, preferences, force_finalize=False, recipes=None, forward_looking=False: {
            "needs_question": False, "question": "", "question_kind": "",
            "skipped_names": [], "new_items": [
                {"name": "hambúrguer sem pão, só carne e queijo", "quantity": "150g"},
            ],
            "proposed_dish_name": "", "proposed_ingredients": [],
        },
    )
    resp = client.post("/nootr/ai/parse-meal", json={
        "text": "vou comer um hambúrguer sem pão", "meal_name": "Jantar", "meal_foods": ["Arroz branco"],
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["blocked_allergens"] == []


def test_parse_meal_decomposed_burger_patty_not_blocked_when_bread_omitted(client, monkeypatch):
    # Achado testando ao vivo, o cenário REAL (não o hipotético acima): a IA
    # não deixa nenhum "sem pão" escrito em lugar nenhum, ela só OMITE o item
    # de pão da decomposição (ver _FOOD_DECOMPOSITION_RULES) e nomeia o disco
    # de carne "carne de hambúrguer", como manda a regra de decomposição.
    # Esse nome contém "hamburguer" e casava com o bucket genérico de
    # _COMMON_FOODS (sanduíche inteiro, pressupõe pão), bloqueando por glúten
    # uma carne que não tem, quando a TACO tem o item exato só pra ela (ver
    # food_matcher._ALLERGEN_EXCEPTIONS["gluten"]).
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "allergies": ["glúten"], "dislikes": [], "likes": [], "pantry": [], "notes": "",
    })
    monkeypatch.setattr(
        ai, "converse_meal",
        lambda history, meal_name, meal_foods, preferences, force_finalize=False, recipes=None, forward_looking=False: {
            "needs_question": False, "question": "", "question_kind": "",
            "skipped_names": [], "new_items": [
                {"name": "carne de hambúrguer", "quantity": "150g"},
                {"name": "salada", "quantity": "1 porção"},
            ],
            "proposed_dish_name": "", "proposed_ingredients": [],
        },
    )
    resp = client.post("/nootr/ai/parse-meal", json={
        "text": "vou comer um hambúrguer sem pão", "meal_name": "Jantar", "meal_foods": ["Arroz branco"],
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["blocked_allergens"] == []
    names = [f["name"].lower() for f in body["foods"]]
    assert any("hamburguer" in n or "hambúrguer" in n for n in names)


def test_parse_meal_pantry_preference_never_hides_allergen_in_described_food(client, monkeypatch):
    # Achado testando ao vivo (cenário real: "misto quente" com pão normal):
    # a despensa da pessoa tem "Pão de forma sem glúten" (o pão que ela usa
    # em casa, justamente por ser alérgica), mas ela descreve ter comido pão
    # comum fora de casa. A query genérica "pão" empata entre um pão com
    # glúten (ex: "Pão caseiro") e o pão sem glúten da despensa, e a
    # preferência da despensa (usada em outros contextos pra desempatar a
    # favor do que a pessoa tem/gosta) escolhia silenciosamente o item sem
    # glúten, escondendo o próprio glúten que a pessoa acabou de descrever
    # ter comido. `ai._match_items` não pode usar a preferência da despensa
    # justamente por isso (ver docstring).
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "allergies": ["glúten"], "dislikes": [], "likes": [], "pantry": ["Pão de forma sem glúten"], "notes": "",
    })
    monkeypatch.setattr(
        ai, "converse_meal",
        lambda history, meal_name, meal_foods, preferences, force_finalize=False, recipes=None, forward_looking=False: {
            "needs_question": False, "question": "", "question_kind": "",
            "skipped_names": [], "new_items": [{"name": "pão", "quantity": "50g"}],
            "proposed_dish_name": "", "proposed_ingredients": [],
        },
    )
    resp = client.post("/nootr/ai/parse-meal", json={
        "text": "não comi o que tinha planejado, comi um misto quente com pão normal mesmo mais tarde",
        "meal_name": "Jantar", "meal_foods": ["Arroz branco"],
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["blocked_allergens"] != []
    names = [f["name"].lower() for f in body["foods"]]
    assert not any("pão" in n for n in names)


def test_list_recipes(client, monkeypatch):
    monkeypatch.setattr(
        repository, "list_recipes",
        lambda user: [{"id": "r1", "name": "Crepioca", "ingredients": []}],
    )
    resp = client.get("/nootr/recipes")
    assert resp.status_code == 200
    assert resp.json()["results"][0]["name"] == "Crepioca"


def test_create_recipe(client, monkeypatch):
    saved = {}

    def fake_insert(user, name, ingredients):
        saved["name"] = name
        saved["ingredients"] = ingredients
        return {"id": "r2", "user_id": user.id, "name": name, "ingredients": ingredients}

    monkeypatch.setattr(repository, "insert_recipe", fake_insert)
    resp = client.post("/nootr/recipes", json={
        "name": "Crepioca",
        "ingredients": [
            {"taco_id": 3, "grams": 100},
            {"name": "Goma de tapioca", "grams": 30, "kcal_100g": 240, "protein_100g": 0, "carbs_100g": 60, "fat_100g": 0},
        ],
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Crepioca"
    assert len(saved["ingredients"]) == 2
    assert saved["ingredients"][0]["taco_id"] == 3


def test_delete_recipe(client, monkeypatch):
    deleted = {}
    monkeypatch.setattr(repository, "delete_recipe", lambda user, recipe_id: deleted.setdefault("id", recipe_id))
    resp = client.delete("/nootr/recipes/r1")
    assert resp.status_code == 200
    assert deleted["id"] == "r1"


def test_create_recipe_blocked_at_basic_limit(client, monkeypatch):
    # Basic com 5 receitas já salvas não pode criar a 6ª.
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "basic"})
    monkeypatch.setattr(repository, "count_recipes", lambda user: 5)
    called = {"insert": False}
    monkeypatch.setattr(repository, "insert_recipe", lambda *a, **k: called.__setitem__("insert", True))
    resp = client.post("/nootr/recipes", json={"name": "X", "ingredients": [{"taco_id": 3, "grams": 100}]})
    assert resp.status_code == 403
    assert called["insert"] is False


def test_create_recipe_unlimited_for_pro(client, monkeypatch):
    # Pro com 50 receitas continua criando normalmente.
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
    monkeypatch.setattr(repository, "count_recipes", lambda user: 50)
    monkeypatch.setattr(repository, "insert_recipe", lambda user, name, ingredients: {"id": "r9", "name": name, "ingredients": ingredients})
    resp = client.post("/nootr/recipes", json={"name": "X", "ingredients": [{"taco_id": 3, "grams": 100}]})
    assert resp.status_code == 200


def test_create_custom_food(client, monkeypatch):
    created = {}

    def fake_insert(user, payload):
        created.update(payload)
        return {"id": "cf-2", "user_id": user.id, "status": "pending", **payload}

    monkeypatch.setattr(repository, "insert_custom_food", fake_insert)
    resp = client.post("/nootr/foods/custom", json={
        "name": "Bolo da vovó",
        "kcal_100g": 350, "protein_100g": 5, "carbs_100g": 45, "fat_100g": 15,
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "pending"
    assert body["name"] == "Bolo da vovó"
    assert created["name"] == "Bolo da vovó"


def test_delete_custom_food(client, monkeypatch):
    deleted = {}
    monkeypatch.setattr(repository, "delete_custom_food", lambda user, food_id: deleted.setdefault("id", food_id))
    resp = client.delete("/nootr/foods/custom/cf-1")
    assert resp.status_code == 200
    assert deleted["id"] == "cf-1"


def test_delete_account(client, monkeypatch):
    called = {}
    monkeypatch.setattr(repository, "delete_own_account", lambda user: called.setdefault("id", user.id))
    resp = client.delete("/nootr/profile")
    assert resp.status_code == 200
    assert resp.json() == {"ok": True}
    assert called["id"] == "u1"  # nunca apaga user_id vindo do corpo, só o do token


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


def test_profile_saves_custom_g_per_kg_and_reflects_in_targets(client, monkeypatch):
    stored = {"plan": "pro", "weight_kg": 80, "target_calories": 2600}

    def fake_upsert(user, patch):
        stored.update(patch)
        return {"user_id": user.id, **stored}

    monkeypatch.setattr(repository, "get_profile", lambda user: dict(stored))
    monkeypatch.setattr(repository, "upsert_profile", fake_upsert)
    resp = client.put(
        "/nootr/profile",
        json={"macro_mode": "per_kg", "protein_g_per_kg": 2.5, "fat_g_per_kg": 1.0},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert stored["protein_g_per_kg"] == 2.5
    assert stored["fat_g_per_kg"] == 1.0
    assert body["macro_targets_g"]["protein_g"] == 200  # 80kg * 2,5


def test_import_diet_preview_requires_pro(client, monkeypatch):
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "basic"})
    resp = client.post(
        "/nootr/diets/import/preview",
        files={"file": ("dieta.pdf", b"%PDF-fake", "application/pdf")},
    )
    assert resp.status_code == 403


def test_import_diet_confirm_merges_preferences(client, monkeypatch):
    # `_persist_diet_menus` (chamada por /import/confirm) funde alergias
    # novas com as já cadastradas sem duplicar, e concatena notas em vez de
    # sobrescrever (a pessoa pode ter editado as preferências manualmente
    # depois da última importação).
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
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
    monkeypatch.setattr(repository, "upsert_profile", lambda user, patch: {"user_id": user.id, **patch})

    resp = client.post("/nootr/diets/import/confirm", json={
        "name": "Dieta da nutri",
        "menus": [{
            "label": "", "days": [],
            "meals": [{"name": "Almoço", "time": "12:00", "foods": [
                {"name": "Arroz", "quantity": "150g", "calories": 190, "protein_g": 4, "carbs_g": 40, "fat_g": 0, "taco_id": 3, "grams": 150},
            ]}],
        }],
        "preferences": {
            "allergies": ["Lactose"], "dislikes": [], "likes": [],
            "notes": "Pode trocar arroz por batata-doce.",
        },
        "targets": {},
    })
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


def test_import_diet_confirm_distributes_multiple_menus(client, monkeypatch):
    """2 cardápios sem dia explícito -> intercala; 1 com dia explícito -> respeita (_assign_weekdays, via /import/confirm)."""
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
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

    def food(taco_id: int) -> dict:
        return {"name": "x", "quantity": "150g", "calories": 190, "protein_g": 4, "carbs_g": 40, "fat_g": 0, "taco_id": taco_id, "grams": 150}

    resp = client.post("/nootr/diets/import/confirm", json={
        "name": "Dieta",
        "menus": [
            # taco_id 3 = "Arroz branco", 561 = "Feijão, carioca, cozido" (o nome final
            # vem do resolve_food real, não do "name" enviado, que é só um placeholder).
            {"label": "Dia de treino", "days": [], "meals": [{"name": "Almoço", "time": "12:00", "foods": [food(3)]}]},
            {"label": "Fim de semana", "days": [5, 6], "meals": [{"name": "Almoço", "time": "12:00", "foods": [food(561)]}]},
        ],
        "preferences": {"allergies": [], "dislikes": [], "likes": [], "notes": ""},
        "targets": {},
    })
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


def test_import_diet_confirm_updates_profile_targets(client, monkeypatch):
    # Sem % explícito, mas com o VET e os gramas totais diários (_profile_patch_from_targets, via /import/confirm).
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
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

    resp = client.post("/nootr/diets/import/confirm", json={
        "name": "Dieta com VET",
        "menus": [{
            "label": "", "days": [],
            "meals": [{"name": "Almoço", "time": "12:00", "foods": [
                {"name": "Arroz", "quantity": "150g", "calories": 190, "protein_g": 4, "carbs_g": 40, "fat_g": 0, "taco_id": 3, "grams": 150},
            ]}],
        }],
        "preferences": {"allergies": [], "dislikes": [], "likes": [], "notes": ""},
        "targets": {"daily_calories": 2000.0, "protein_g": 150.0, "carbs_g": 200.0, "fat_g": 60.0},
    })
    assert resp.status_code == 200
    assert saved_profile["target_calories"] == 2000
    # 150g proteína * 4 / 2000 * 100 = 30% ; 200g carbo * 4 / 2000 * 100 = 40% ; 60g gordura * 9 / 2000 * 100 = 27%
    assert saved_profile["protein_pct"] == 30
    assert saved_profile["carbs_pct"] == 40
    assert saved_profile["fat_pct"] == 27


def test_import_diet_preview_rejects_unsupported_extension(client, monkeypatch):
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
    resp = client.post(
        "/nootr/diets/import/preview",
        files={"file": ("dieta.txt", b"nao e um formato suportado", "text/plain")},
    )
    assert resp.status_code == 400


def test_import_diet_preview_accepts_docx(client, monkeypatch):
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

    resp = client.post(
        "/nootr/diets/import/preview",
        files={"file": ("dieta.docx", b"conteudo fake docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert resp.status_code == 200
    assert seen_ext["value"] == ".docx"


def test_import_diet_preview_does_not_persist(client, monkeypatch):
    """/import/preview casa os alimentos mas não deve chamar nada que grave."""
    from backend.app.routes.nootr import diets as diets_route
    from backend.app.services import ai

    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
    monkeypatch.setattr(diets_route, "_extract_document_text", lambda raw, ext: "texto fake do pdf")
    monkeypatch.setattr(
        ai, "parse_diet_document",
        lambda text: {
            "menus": [{"label": "", "days": [], "meals": [
                {"meal": "Jantar", "time": "19:30", "foods": [
                    {"name": "peito de frango", "quantity": "50g", "dish_name": "Canja de galinha"},
                    {"name": "arroz", "quantity": "2 colheres de sopa", "dish_name": "Canja de galinha"},
                    {"name": "banana", "quantity": "1 unidade", "dish_name": ""},
                ]},
            ]}],
            "preferences": {"allergies": [], "dislikes": [], "likes": [], "notes": ""},
        },
    )
    monkeypatch.setattr(repository, "get_preferences", lambda user: None)
    for fn in ("save_diet", "delete_all_diets", "delete_day_plan", "upsert_preferences", "upsert_profile", "insert_recipe"):
        monkeypatch.setattr(repository, fn, lambda *a, **k: (_ for _ in ()).throw(AssertionError(f"{fn} não deveria ser chamado no preview")))

    resp = client.post(
        "/nootr/diets/import/preview",
        files={"file": ("dieta.pdf", b"%PDF-fake", "application/pdf")},
    )
    assert resp.status_code == 200
    body = resp.json()
    foods = body["menus"][0]["meals"][0]["foods"]
    dish_names = [f.get("dish_name") for f in foods]
    assert dish_names[0] == dish_names[1] == "Canja de galinha"
    assert dish_names[2] in (None, "")


def test_import_diet_confirm_requires_pro(client, monkeypatch):
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "basic"})
    resp = client.post("/nootr/diets/import/confirm", json={
        "name": "Dieta", "menus": [{"label": "", "days": [], "meals": [
            {"name": "Jantar", "time": "19:30", "foods": [
                {"name": "Arroz", "quantity": "150g", "calories": 190, "protein_g": 4, "carbs_g": 40, "fat_g": 0, "taco_id": 3, "grams": 150},
            ]},
        ]}],
    })
    assert resp.status_code == 403


def test_import_diet_confirm_saves_diet_and_pending_recipe(client, monkeypatch):
    """
    Simula a decisão "salvar como receita" pro grupo "Canja de galinha": o
    frontend já substituiu os 2 ingredientes originais por 1 item sintético
    (taco_id=None, grams implícito=100, macros somados) e manda os
    ingredientes originais em recipes_to_save.
    """
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro"})
    monkeypatch.setattr(repository, "get_preferences", lambda user: None)

    saved_diets = []
    monkeypatch.setattr(repository, "save_diet", lambda user, weekday, payload: saved_diets.append({"weekday": weekday, **payload}) or {"id": f"d{weekday}", **payload})
    monkeypatch.setattr(repository, "delete_all_diets", lambda user: None)
    monkeypatch.setattr(repository, "delete_day_plan", lambda user, d: None)
    monkeypatch.setattr(repository, "upsert_preferences", lambda user, patch: {"user_id": user.id, **patch})
    monkeypatch.setattr(repository, "upsert_profile", lambda user, patch: {"user_id": user.id, **patch})

    saved_recipes = []

    def fake_insert_recipe(user, name, ingredients):
        saved_recipes.append({"name": name, "ingredients": ingredients})
        return {"id": "r-new", "user_id": user.id, "name": name, "ingredients": ingredients, "status": "pending"}

    monkeypatch.setattr(repository, "insert_recipe", fake_insert_recipe)

    resp = client.post("/nootr/diets/import/confirm", json={
        "name": "Dieta importada",
        "menus": [{
            "label": "", "days": [],
            "meals": [{
                "name": "Jantar", "time": "19:30",
                "foods": [
                    {
                        "name": "Canja de galinha", "quantity": "1 porção",
                        "calories": 300, "protein_g": 25, "carbs_g": 30, "fat_g": 5,
                        "taco_id": None, "grams": None, "dish_name": "Canja de galinha",
                    },
                ],
            }],
        }],
        "preferences": {"allergies": [], "dislikes": [], "likes": [], "notes": ""},
        "targets": {},
        "recipes_to_save": [{
            "name": "Canja de galinha",
            "ingredients": [
                {"taco_id": 488, "grams": 50},
                {"name": "Arroz cozido (feito por mim)", "grams": 30, "kcal_100g": 130, "protein_100g": 2.5, "carbs_100g": 28, "fat_100g": 0.2},
            ],
        }],
    })
    assert resp.status_code == 200
    body = resp.json()
    assert len(saved_diets) == 7  # 1 cardápio único -> todos os 7 dias
    meal_foods = saved_diets[0]["meals"][0]["foods"]
    assert meal_foods[0]["name"] == "Canja de galinha"
    assert meal_foods[0]["calories"] == 300.0
    assert "dish_name" not in meal_foods[0]  # não persiste o rótulo transitório
    assert len(saved_recipes) == 1
    assert saved_recipes[0]["name"] == "Canja de galinha"
    assert len(saved_recipes[0]["ingredients"]) == 2
    assert body["menus_found"] == 1


def test_foods_search_merges_global_custom_foods_without_duplicating_own(client, monkeypatch):
    monkeypatch.setattr(repository, "search_custom_foods", lambda user, q, limit=8: [{
        "id": "cf-own", "name": "Bolo da vovó", "kcal_100g": 300,
        "protein_100g": 5, "carbs_100g": 40, "fat_100g": 12, "status": "approved",
    }])
    monkeypatch.setattr(repository, "search_global_custom_foods", lambda user, q, limit=8: [
        {"id": "cf-own", "name": "Bolo da vovó (deveria ser filtrado)", "kcal_100g": 300,
         "protein_100g": 5, "carbs_100g": 40, "fat_100g": 12, "status": "approved"},
        {"id": "cf-other", "name": "Vitamina da comunidade", "kcal_100g": 90,
         "protein_100g": 3, "carbs_100g": 12, "fat_100g": 3, "status": "approved"},
    ])
    resp = client.get("/nootr/foods/search", params={"q": "bolo"})
    assert resp.status_code == 200
    ids = [r["custom_id"] for r in resp.json()["results"] if r["custom_id"]]
    assert ids.count("cf-own") == 1
    assert "cf-other" in ids


def test_admin_routes_require_admin_email(client, monkeypatch):
    resp = client.get("/nootr/admin/recipes/pending")
    assert resp.status_code == 403


def test_admin_can_list_and_approve_pending_recipes(client, monkeypatch):
    from backend.app.auth import CurrentUser, get_current_user
    from backend.app.main import app

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id="admin-1", email="contatonutrirbrasil@gmail.com", token="admintok",
    )
    monkeypatch.setattr(
        repository, "admin_list_pending_recipes",
        lambda admin: [{"id": "r1", "user_id": "other-user", "name": "Crepioca", "status": "pending"}],
    )
    monkeypatch.setattr(repository, "admin_emails_for", lambda admin, ids: {"other-user": "other@example.com"})
    resp = client.get("/nootr/admin/recipes/pending")
    assert resp.status_code == 200
    assert resp.json()["results"][0]["user_id"] == "other-user"

    approved = {}

    def fake_approve(admin, recipe_id, status):
        approved["recipe_id"] = recipe_id
        approved["status"] = status
        return {"id": recipe_id, "status": status}

    monkeypatch.setattr(repository, "admin_update_recipe_status", fake_approve)
    resp = client.post("/nootr/admin/recipes/r1/approve")
    assert resp.status_code == 200
    assert approved == {"recipe_id": "r1", "status": "approved"}


def _pro_profile_with_calories(**extra):
    return {
        "plan": "pro", "country": "BR", "target_calories": 2000,
        "protein_pct": 30, "carbs_pct": 40, "fat_pct": 30, **extra,
    }


def test_generate_diet_requires_pro(client, monkeypatch):
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "basic", "target_calories": 2000})
    resp = client.post("/nootr/diets/generate")
    assert resp.status_code == 403


def test_generate_diet_requires_target_calories(client, monkeypatch):
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "pro", "target_calories": None})
    resp = client.post("/nootr/diets/generate")
    assert resp.status_code == 400


def test_generate_diet_conflict_when_already_generated_once(client, monkeypatch):
    monkeypatch.setattr(
        repository, "get_profile",
        lambda user: _pro_profile_with_calories(ai_diet_generated_at="2026-01-01T00:00:00+00:00"),
    )
    resp = client.post("/nootr/diets/generate")
    assert resp.status_code == 409


def test_generate_diet_conflict_when_already_pending(client, monkeypatch):
    monkeypatch.setattr(repository, "get_profile", lambda user: _pro_profile_with_calories())
    monkeypatch.setattr(repository, "get_pending_diet", lambda user: {"id": "d-pending"})
    resp = client.post("/nootr/diets/generate")
    assert resp.status_code == 409


def test_generate_diet_saves_as_pending_review(client, monkeypatch):
    from backend.app.services import ai

    monkeypatch.setattr(repository, "get_profile", lambda user: _pro_profile_with_calories())
    monkeypatch.setattr(repository, "get_pending_diet", lambda user: None)
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "allergies": [], "dislikes": [], "likes": [], "pantry": [], "notes": "",
    })
    monkeypatch.setattr(
        ai, "generate_diet",
        lambda meal_targets, carbs_g, fat_g, preferences, country: {
            "meals": [{"meal": "Almoço", "time": "12:00", "foods": [{"name": "arroz", "quantity": "150g"}]}],
        },
    )
    saved = {}

    def fake_insert_pending(user, payload):
        saved.update(payload)
        return {"id": "d-new", **payload}

    monkeypatch.setattr(repository, "insert_pending_diet", fake_insert_pending)
    monkeypatch.setattr(repository, "upsert_profile", lambda user, patch: {**_pro_profile_with_calories(), **patch})
    resp = client.post("/nootr/diets/generate")
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending_review"
    assert saved["meals"][0]["name"] == "Almoço"
    assert saved["daily_calories"] > 0


def test_generate_diet_retries_once_when_day_total_misses_tolerance(client, monkeypatch):
    # A dieta gerada tem que fechar dentro da mesma tolerância de calorias do
    # resto do app desde a primeira resposta da IA; se não fechar, tenta de
    # novo uma vez antes de aceitar (nunca reescala a composição em código).
    from backend.app.services import ai

    monkeypatch.setattr(repository, "get_profile", lambda user: _pro_profile_with_calories())
    monkeypatch.setattr(repository, "get_pending_diet", lambda user: None)
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "allergies": [], "dislikes": [], "likes": [], "pantry": [], "notes": "",
    })
    calls = []

    def fake_generate(meal_targets, carbs_g, fat_g, preferences, country):
        # 1ª tentativa: porção minúscula, bem longe da meta de propósito.
        grams = "20g" if not calls else "600g"
        calls.append(grams)
        return {"meals": [{"meal": "Almoço", "time": "12:00", "foods": [{"name": "arroz", "quantity": grams}]}]}

    monkeypatch.setattr(ai, "generate_diet", fake_generate)
    saved = {}
    monkeypatch.setattr(repository, "insert_pending_diet", lambda user, payload: saved.update(payload) or {"id": "d-new", **payload})
    monkeypatch.setattr(repository, "upsert_profile", lambda user, patch: {**_pro_profile_with_calories(), **patch})
    resp = client.post("/nootr/diets/generate")
    assert resp.status_code == 200
    assert len(calls) == 2  # a 1ª tentativa não fechou a meta, tentou de novo
    assert saved["meals"][0]["foods"][0]["quantity"] == "600g"  # ficou com a 2ª tentativa


def test_generate_diet_filters_allergy(client, monkeypatch):
    # A IA "erra" e inclui amendoim mesmo com a instrução do prompt, a
    # barreira determinística descarta o item antes de salvar.
    from backend.app.services import ai

    monkeypatch.setattr(repository, "get_profile", lambda user: _pro_profile_with_calories())
    monkeypatch.setattr(repository, "get_pending_diet", lambda user: None)
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "allergies": ["amendoim"], "dislikes": [], "likes": [], "pantry": [], "notes": "",
    })
    monkeypatch.setattr(
        ai, "generate_diet",
        lambda meal_targets, carbs_g, fat_g, preferences, country: {
            "meals": [{
                "meal": "Lanche", "time": "16:00",
                "foods": [{"name": "amendoim torrado", "quantity": "30g"}, {"name": "banana", "quantity": "1 unidade"}],
            }],
        },
    )
    saved = {}
    monkeypatch.setattr(repository, "insert_pending_diet", lambda user, payload: saved.update(payload) or {"id": "d-new", **payload})
    monkeypatch.setattr(repository, "upsert_profile", lambda user, patch: {**_pro_profile_with_calories(), **patch})
    resp = client.post("/nootr/diets/generate")
    assert resp.status_code == 200
    names = [f["name"].lower() for f in saved["meals"][0]["foods"]]
    assert not any("amendoim" in n for n in names)
    assert any("banana" in n for n in names)


def test_admin_diet_routes_require_admin_email(client):
    resp = client.get("/nootr/admin/diets/pending")
    assert resp.status_code == 403


def test_admin_can_list_edit_approve_reject_pending_diets(client, monkeypatch):
    from backend.app.auth import CurrentUser, get_current_user
    from backend.app.main import app

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id="admin-1", email="contatonutrirbrasil@gmail.com", token="admintok",
    )
    monkeypatch.setattr(
        repository, "admin_list_pending_diets",
        lambda admin: [{"id": "d1", "user_id": "other-user", "status": "pending_review", "meals": []}],
    )
    monkeypatch.setattr(repository, "admin_emails_for", lambda admin, ids: {"other-user": "other@example.com"})
    # A fila de dietas anexa o contexto do paciente (ver admin._with_user_context).
    monkeypatch.setattr(
        repository, "admin_get_profile",
        lambda admin, user_id: {"weight_kg": 80, "height_cm": 180, "age": 30, "sex": "m",
                                "target_calories": 2400, "country": "BR"},
    )
    resp = client.get("/nootr/admin/diets/pending")
    assert resp.status_code == 200
    row = resp.json()["results"][0]
    assert row["user_id"] == "other-user"
    # Metas de macro por g/kg, prontas pro nutricionista conferir na tela.
    assert row["user_context"]["target_calories"] == 2400
    assert row["user_context"]["macro_targets"]["protein_g"] == 144  # 80kg * 1,8 g/kg

    edited = {}

    def fake_update(admin, diet_id, meals, totals):
        edited["diet_id"] = diet_id
        edited["meals"] = meals
        return {"id": diet_id, "meals": meals}

    monkeypatch.setattr(repository, "admin_update_diet_meals", fake_update)
    resp = client.put("/nootr/admin/diets/d1", json={
        "meals": [{"name": "Almoço", "time": "12:00", "foods": [{"taco_id": 3, "grams": 100}]}],
    })
    assert resp.status_code == 200
    assert edited["diet_id"] == "d1"
    assert edited["meals"][0]["name"] == "Almoço"

    approved = {}
    monkeypatch.setattr(repository, "admin_approve_diet", lambda admin, diet_id: approved.setdefault("id", diet_id) or {"id": diet_id, "status": "approved"})
    resp = client.post("/nootr/admin/diets/d1/approve")
    assert resp.status_code == 200
    assert approved["id"] == "d1"

    rejected = {}
    monkeypatch.setattr(repository, "admin_reject_diet", lambda admin, diet_id: rejected.setdefault("id", diet_id))
    resp = client.post("/nootr/admin/diets/d1/reject")
    assert resp.status_code == 200
    assert rejected["id"] == "d1"


def test_admin_regenerate_pending_diet(client, monkeypatch):
    from backend.app.auth import CurrentUser, get_current_user
    from backend.app.main import app
    from backend.app.services import ai

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id="admin-1", email="contatonutrirbrasil@gmail.com", token="admintok",
    )
    monkeypatch.setattr(
        repository, "admin_get_diet",
        lambda admin, diet_id: {"id": diet_id, "user_id": "other-user", "status": "pending_review"},
    )
    monkeypatch.setattr(
        repository, "admin_get_profile",
        lambda admin, user_id: _pro_profile_with_calories(),
    )
    monkeypatch.setattr(
        repository, "admin_get_preferences",
        lambda admin, user_id: {"allergies": [], "dislikes": [], "likes": [], "pantry": [], "notes": ""},
    )
    monkeypatch.setattr(
        ai, "generate_diet",
        lambda meal_targets, carbs_g, fat_g, preferences, country: {
            "meals": [{"meal": "Almoço", "time": "12:00", "foods": [{"name": "arroz", "quantity": "150g"}]}],
        },
    )
    updated = {}

    def fake_update(admin, diet_id, meals, totals):
        updated["diet_id"] = diet_id
        updated["meals"] = meals
        return {"id": diet_id, "meals": meals}

    monkeypatch.setattr(repository, "admin_update_diet_meals", fake_update)
    resp = client.post("/nootr/admin/diets/d1/regenerate")
    assert resp.status_code == 200
    assert updated["diet_id"] == "d1"
    assert updated["meals"][0]["name"] == "Almoço"


def test_admin_regenerate_requires_pending_diet(client, monkeypatch):
    from backend.app.auth import CurrentUser, get_current_user
    from backend.app.main import app

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id="admin-1", email="contatonutrirbrasil@gmail.com", token="admintok",
    )
    monkeypatch.setattr(repository, "admin_get_diet", lambda admin, diet_id: None)
    resp = client.post("/nootr/admin/diets/d1/regenerate")
    assert resp.status_code == 404


def test_admin_regenerate_requires_admin_email(client):
    resp = client.post("/nootr/admin/diets/d1/regenerate")
    assert resp.status_code == 403


def test_restore_diet_brings_back_nootr_version(client, monkeypatch):
    # O usuário editou a dieta gerada pelo Nootr e se arrependeu: restaurar
    # devolve exatamente o snapshot gravado na aprovação (source_meals), sem
    # consumi-lo (dá pra editar e restaurar de novo).
    original = [{"id": "meal-1", "name": "Café da manhã", "time": "07:00",
                 "foods": [_scaled(488, 100), _scaled(52, 50)]}]
    monkeypatch.setattr(repository, "get_diet", lambda user, diet_id: {
        "id": diet_id, "weekday": None, "meals": [], "source_meals": original,
    })
    saved = {}

    def fake_restore(user, diet_id, meals, totals):
        saved["meals"] = meals
        saved["totals"] = totals
        return {"id": diet_id, "meals": meals}

    monkeypatch.setattr(repository, "restore_diet", fake_restore)
    monkeypatch.setattr(repository, "delete_day_plan", lambda user, date: None)
    resp = client.post("/nootr/diets/d1/restore")
    assert resp.status_code == 200
    assert saved["meals"] == original
    # Os totais são recalculados a partir do snapshot, não copiados.
    assert saved["totals"]["calories"] > 0


def test_restore_diet_404_when_not_from_nootr(client, monkeypatch):
    # Dieta montada à mão não tem versão do Nootr pra voltar.
    monkeypatch.setattr(repository, "get_diet", lambda user, diet_id: {
        "id": diet_id, "weekday": None, "meals": [], "source_meals": None,
    })
    resp = client.post("/nootr/diets/d1/restore")
    assert resp.status_code == 404


def test_restore_diet_404_when_diet_missing(client, monkeypatch):
    monkeypatch.setattr(repository, "get_diet", lambda user, diet_id: None)
    resp = client.post("/nootr/diets/d1/restore")
    assert resp.status_code == 404


def test_substitution_never_touches_the_diet_template(client, fake_day_plan, monkeypatch):
    # Substituição é do DIA: ela grava no day_plan (cópia materializada de
    # hoje) e nunca na dieta da aba Dieta, que é o template permanente. Se
    # algum dia alguém ligar uma escrita de `diets` aqui, este teste quebra.
    touched: list[str] = []
    for fn in ("save_diet", "restore_diet", "delete_diet", "delete_all_diets"):
        monkeypatch.setattr(
            repository, fn,
            lambda *a, _fn=fn, **k: touched.append(_fn) or {},
        )
    day_plan_writes: list[str] = []
    monkeypatch.setattr(
        repository, "update_day_plan_meals",
        lambda user, dp_id, meals, previous_meals=None: day_plan_writes.append(dp_id) or {"id": dp_id, "meals": meals},
    )

    skipped = fake_day_plan["meals"][1]["foods"][0]["name"]
    resp = client.post(
        "/nootr/substitutions",
        json={"action": "ate_different", "meal_id": "meal-2",
              "skipped_food_names": [skipped],
              "foods": [{"taco_id": 315, "grams": 200}]},
    )
    assert resp.status_code == 200
    assert day_plan_writes == ["dp-1"]  # o ajuste foi gravado no plano do dia
    assert touched == []                # e nada foi escrito na dieta template


def test_admin_approve_missing_diet_returns_404(client, monkeypatch):
    # Aprovar uma dieta que não existe precisa falhar de verdade: antes o
    # repository devolvia {} e a rota respondia 200, então o frontend tirava
    # o item da fila achando que tinha dado certo.
    from backend.app.auth import CurrentUser, get_current_user
    from backend.app.main import app

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id="admin-1", email="contatonutrirbrasil@gmail.com", token="admintok",
    )
    monkeypatch.setattr(repository, "admin_get_diet", lambda admin, diet_id: None)
    resp = client.post("/nootr/admin/diets/inexistente/approve")
    assert resp.status_code == 404


def test_undo_restores_previous_day_plan(client, monkeypatch, fake_day_plan):
    # O ajuste já foi gravado no plano do dia; desfazer volta pro estado
    # anterior guardado em previous_meals.
    anterior = [{"id": "meal-1", "name": "Café da manhã", "time": "07:30", "foods": [_scaled(488, 100)]}]
    monkeypatch.setattr(
        repository, "get_day_plan",
        lambda user, plan_date=None: {**fake_day_plan, "previous_meals": anterior},
    )
    undone = {}
    monkeypatch.setattr(
        repository, "undo_day_plan",
        lambda user, dp_id, previous: undone.update(id=dp_id, meals=previous) or {"meals": previous},
    )
    resp = client.post("/nootr/substitutions/undo")
    assert resp.status_code == 200
    assert undone["meals"] == anterior


def test_undo_404_when_nothing_to_undo(client, monkeypatch, fake_day_plan):
    # Sem ajuste hoje, previous_meals é null e não há o que desfazer.
    monkeypatch.setattr(
        repository, "get_day_plan",
        lambda user, plan_date=None: {**fake_day_plan, "previous_meals": None},
    )
    resp = client.post("/nootr/substitutions/undo")
    assert resp.status_code == 404


def test_substitution_saves_snapshot_for_undo(client, fake_day_plan, monkeypatch):
    # Toda substituição precisa gravar o estado anterior, senão o desfazer
    # não teria pra onde voltar.
    saved = {}
    monkeypatch.setattr(
        repository, "update_day_plan_meals",
        lambda user, dp_id, meals, previous_meals=None: saved.update(previous=previous_meals) or {"meals": meals},
    )
    skipped = fake_day_plan["meals"][1]["foods"][0]["name"]
    resp = client.post(
        "/nootr/substitutions",
        json={"action": "ate_different", "meal_id": "meal-2", "skipped_food_names": [skipped], "foods": []},
    )
    assert resp.status_code == 200
    assert saved["previous"] == fake_day_plan["meals"]


# Lista verificada em test_food_matcher._FULL_PANTRY (10 itens, 3 proteína, 3
# carboidrato, 2+2 gordura), reaproveitada aqui pros testes de rota do mínimo
# de despensa/favoritos (ver food_matcher.pantry_gap).
_FULL_PANTRY = [
    "Peito de Frango", "Carne bovina magra grelhada", "Atum em conserva",
    "Arroz branco", "Batata doce", "Pão francês",
    "Azeite de oliva extravirgem", "Abacate",
    "Ovo de galinha", "Castanha do pará",
]


def test_update_preferences_rejects_pantry_below_minimum(client, monkeypatch):
    # Pedido do usuário: a despensa/favoritos precisa de um mínimo pra o
    # coringa e as sugestões de substituição terem de onde escolher (ver
    # food_matcher.PANTRY_MIN_TOTAL/PANTRY_MIN_BY_MACRO). Salvar com menos
    # que isso é bloqueado, com uma mensagem explicando o que falta.
    monkeypatch.setattr(repository, "get_preferences", lambda user: None)
    resp = client.put("/nootr/preferences", json={"pantry": _FULL_PANTRY[:3], "likes": _FULL_PANTRY[:3]})
    assert resp.status_code == 400
    assert "carboidrato" in resp.json()["detail"].lower()
    assert "gordura" in resp.json()["detail"].lower()


def test_update_preferences_allows_pantry_meeting_minimum(client, monkeypatch):
    saved = {}
    monkeypatch.setattr(repository, "get_preferences", lambda user: None)
    monkeypatch.setattr(
        repository, "upsert_preferences",
        lambda user, patch: saved.update(patch) or {"user_id": user.id, **patch},
    )
    resp = client.put("/nootr/preferences", json={"pantry": _FULL_PANTRY, "likes": _FULL_PANTRY})
    assert resp.status_code == 200
    assert saved["pantry"] == _FULL_PANTRY


def test_update_preferences_does_not_block_unrelated_save_when_pantry_already_short(client, monkeypatch):
    # Conta antiga com despensa incompleta (de antes desse mínimo existir):
    # salvar algo SEM MEXER na despensa (ex: só as horas das refeições) não
    # pode ficar travado por um problema numa tela diferente.
    monkeypatch.setattr(
        repository, "get_preferences",
        lambda user: {"allergies": [], "dislikes": [], "likes": [], "pantry": [], "notes": "",
                       "meal_count": 4, "meal_times": []},
    )
    monkeypatch.setattr(
        repository, "upsert_preferences",
        lambda user, patch: {"user_id": user.id, **patch},
    )
    resp = client.put("/nootr/preferences", json={"meal_count": 5})
    assert resp.status_code == 200


def test_get_profile_pantry_complete_reflects_pantry_gap(client, monkeypatch):
    monkeypatch.setattr(repository, "get_profile", lambda user: {"plan": "basic"})
    monkeypatch.setattr(repository, "get_preferences", lambda user: {"pantry": _FULL_PANTRY[:3]})
    resp = client.get("/nootr/profile")
    assert resp.status_code == 200
    assert resp.json()["pantry_complete"] is False

    monkeypatch.setattr(repository, "get_preferences", lambda user: {"pantry": _FULL_PANTRY})
    resp = client.get("/nootr/profile")
    assert resp.status_code == 200
    assert resp.json()["pantry_complete"] is True
