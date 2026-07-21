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
    monkeypatch.setattr(repository, "update_day_plan_meals", lambda user, dp_id, meals: {"id": dp_id, "meals": meals})
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
    # Não tocar a rede: a explicação da IA e o "top-up" do dia são mockados.
    from backend.app.services import ai
    monkeypatch.setattr(ai, "explain_change", lambda ctx: "")
    monkeypatch.setattr(ai, "suggest_day_topup", lambda pending_meals, gap_calories, gap_protein, preferences=None: None)

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

    # força o gatilho do top-up independente do tamanho real da diferença.
    monkeypatch.setattr(substitutions_route, "_TOPUP_CAL_THRESHOLD", 0.0)
    monkeypatch.setattr(substitutions_route, "_TOPUP_PROTEIN_THRESHOLD", 0.0)
    monkeypatch.setattr(
        substitutions_route.ai, "suggest_day_topup",
        lambda pending_meals, gap_calories, gap_protein, preferences=None: {
            "meal_name": "Jantar", "additions": [{"name": "batata doce", "quantity": "150g"}], "removals": [],
        },
    )

    skipped = fake_day_plan["meals"][1]["foods"][0]["name"]
    resp = client.post(
        "/nootr/substitutions",
        json={"action": "ate_different", "meal_id": "meal-2", "skipped_food_names": [skipped], "foods": []},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["topup_applied"]["meal_name"] == "Jantar"
    jantar = next(m for m in body["adjusted_meals"] if m["name"] == "Jantar")
    names = [f["name"] for f in jantar["foods"]]
    assert any("batata doce" in n.lower() for n in names)


def test_day_topup_blocked_by_allergy(client, fake_day_plan, monkeypatch):
    from backend.app.routes.nootr import substitutions as substitutions_route

    monkeypatch.setattr(substitutions_route, "_TOPUP_CAL_THRESHOLD", 0.0)
    monkeypatch.setattr(substitutions_route, "_TOPUP_PROTEIN_THRESHOLD", 0.0)
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "pantry": [], "allergies": ["amendoim"], "dislikes": [], "likes": [], "notes": "",
    })
    monkeypatch.setattr(
        substitutions_route.ai, "suggest_day_topup",
        lambda pending_meals, gap_calories, gap_protein, preferences=None: {
            "meal_name": "Jantar", "additions": [{"name": "amendoim torrado", "quantity": "50g"}], "removals": [],
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


def test_suggest_alternatives_calls_ai(client, monkeypatch):
    from backend.app.services import ai
    monkeypatch.setattr(repository, "get_preferences", lambda user: None)
    monkeypatch.setattr(ai, "suggest_substitutes", lambda missing, prefs: ["batata doce", "macarrão"])
    resp = client.post("/nootr/substitutions/alternatives", json={"missing_food_name": "arroz"})
    assert resp.status_code == 200
    assert len(resp.json()["suggestions"]) == 2


def test_suggest_alternatives_filters_allergy(client, monkeypatch):
    # A IA "erra" e sugere amendoim mesmo com a instrução do prompt, a
    # barreira determinística descarta antes de devolver pro usuário.
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


def test_missing_food_wildcard_blocked_by_allergy(client, monkeypatch, gap_day_plan):
    # Mesmo se a IA "errar" e sugerir amendoim (violando a própria instrução do
    # prompt), a barreira determinística em food_matcher.matches_allergen
    # descarta a sugestão antes de chegar no usuário.
    from backend.app.services import ai
    monkeypatch.setattr(repository, "get_or_create_day_plan", lambda user, plan_date=None: gap_day_plan)
    monkeypatch.setattr(repository, "get_preferences", lambda user: {
        "pantry": ["Amendoim torrado"], "allergies": ["amendoim"], "dislikes": [], "likes": [], "notes": "",
    })
    monkeypatch.setattr(ai, "suggest_wildcard", lambda meal_name, current, gap, preferences: "amendoim torrado")
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
        lambda history, meal_name, meal_foods, preferences, force_finalize=False, recipes=None: {
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
        lambda history, meal_name, meal_foods, preferences, force_finalize=False, recipes=None: {
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
        lambda history, meal_name, meal_foods, preferences, force_finalize=False, recipes=None: {
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
        lambda history, meal_name, meal_foods, preferences, force_finalize=False, recipes=None: {
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
        lambda calories, protein_g, carbs_g, fat_g, preferences, country: {
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
        lambda calories, protein_g, carbs_g, fat_g, preferences, country: {
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
    resp = client.get("/nootr/admin/diets/pending")
    assert resp.status_code == 200
    assert resp.json()["results"][0]["user_id"] == "other-user"

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
