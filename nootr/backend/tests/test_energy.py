from backend.app.services import energy


def test_mifflin_st_jeor_male():
    # 10*80 + 6.25*180 - 5*30 + 5 = 1780
    assert energy.bmr_mifflin_st_jeor("m", 80, 180, 30) == 1780


def test_mifflin_st_jeor_female():
    # 10*60 + 6.25*165 - 5*25 - 161 = 1345.25
    assert round(energy.bmr_mifflin_st_jeor("f", 60, 165, 25), 2) == 1345.25


def test_harris_benedict_male():
    bmr = energy.bmr_harris_benedict("m", 80, 180, 30)
    assert round(bmr) == 1854  # 88.362 + 13.397*80 + 4.799*180 - 5.677*30


def test_daily_calories_applies_activity_factor():
    assert energy.daily_calories("mifflin_st_jeor", "m", 80, 180, 30, "moderado") == round(1780 * 1.55)


def test_daily_calories_manual_returns_none():
    assert energy.daily_calories("manual", "m", 80, 180, 30, "moderado") is None
    assert energy.daily_calories("mifflin_st_jeor", "m", 80, 180, 30, "inexistente") is None


def test_macro_targets_from_weight_uses_g_per_kg():
    # 80kg: proteína no meio de 1,6-2 g/kg (1,8 -> 144g), gordura no meio de
    # 0,7-1 g/kg (0,85 -> 68g), carboidrato fecha as calorias que sobram.
    m = energy.macro_targets_from_weight(2608, 80)
    assert m["protein_g"] == 144
    assert m["fat_g"] == 68
    assert m["protein_g_per_kg"] == 1.8
    assert m["fat_g_per_kg"] == 0.85
    # As calorias batem o alvo (o carboidrato é justamente o que sobra).
    total = m["protein_g"] * 4 + m["carbs_g"] * 4 + m["fat_g"] * 9
    assert abs(total - 2608) <= 4


def test_macro_targets_from_weight_exposes_reference_range():
    # A faixa vai pra tela do nutricionista (ver /aprovar), pra ele saber
    # quanto pode ajustar sem sair da referência.
    m = energy.macro_targets_from_weight(2000, 70)
    assert (m["protein_min_g"], m["protein_max_g"]) == (112, 140)  # 70 * 1,6 e 70 * 2,0
    assert (m["fat_min_g"], m["fat_max_g"]) == (49, 70)            # 70 * 0,7 e 70 * 1,0


def test_macro_targets_from_weight_keeps_carbs_positive_when_calories_are_low():
    # Plano muito restrito pra uma pessoa pesada: proteína + gordura no alvo
    # normal estourariam o total. Em vez de carboidrato negativo, as duas são
    # reduzidas e sobra pelo menos algum carboidrato.
    m = energy.macro_targets_from_weight(1200, 100)
    assert m["carbs_g"] > 0
    total = m["protein_g"] * 4 + m["carbs_g"] * 4 + m["fat_g"] * 9
    assert abs(total - 1200) <= 10


def test_macro_targets_for_profile_falls_back_to_percentages_without_weight():
    # Perfil antigo, sem peso cadastrado: mantém o comportamento por %.
    profile = {"protein_pct": 30, "carbs_pct": 40, "fat_pct": 30}
    m = energy.macro_targets_for_profile(profile, 2000)
    assert m["protein_g"] == 150  # 2000 * 30% / 4
    assert "protein_min_g" not in m


def test_macro_targets_for_profile_survives_zero_weight():
    # Peso 0 (ou lixo salvo por engano) dividiria por zero no cálculo por
    # g/kg; deve cair no percentual em vez de estourar 500 na geração.
    m = energy.macro_targets_for_profile(
        {"weight_kg": 0, "protein_pct": 30, "carbs_pct": 40, "fat_pct": 30}, 2000
    )
    assert m["protein_g"] == 150


def test_macro_mode_governs_the_user_view_only():
    # "percent" (padrão e único do Basic): usa os percentuais salvos.
    profile = {"weight_kg": 80, "protein_pct": 30, "carbs_pct": 40, "fat_pct": 30}
    assert energy.macro_targets_for_profile(profile, 2000)["protein_g"] == 150

    # "per_kg" (Pro): passa a usar o peso.
    per_kg = energy.macro_targets_for_profile({**profile, "macro_mode": "per_kg"}, 2000)
    assert per_kg["protein_g"] == 144  # 80kg * 1,8 g/kg

    # A dieta que o NOOTR monta usa g/kg independente do modo escolhido.
    assert energy.macro_targets_for_generation(profile, 2000)["protein_g"] == 144


def test_macro_targets_from_weight_respects_user_override():
    # Usuário ajustou à mão pra 2,5 g/kg de proteína (fora da faixa de
    # referência 1,6-2, de propósito): o override vale, sem ser clampado.
    m = energy.macro_targets_from_weight(2600, 80, protein_g_per_kg=2.5, fat_g_per_kg=1.0)
    assert m["protein_g"] == 200  # 80 * 2,5
    assert m["fat_g"] == 80  # 80 * 1,0
    assert m["protein_g_per_kg"] == 2.5
    assert m["fat_g_per_kg"] == 1.0
    total = m["protein_g"] * 4 + m["carbs_g"] * 4 + m["fat_g"] * 9
    assert abs(total - 2600) <= 4


def test_macro_targets_for_profile_uses_stored_override():
    profile = {
        "weight_kg": 80, "macro_mode": "per_kg",
        "protein_g_per_kg": 2.5, "fat_g_per_kg": 1.0,
    }
    m = energy.macro_targets_for_profile(profile, 2600)
    assert m["protein_g"] == 200
    assert m["fat_g"] == 80
    # A geração de dieta pelo Nootr também respeita o override salvo.
    assert energy.macro_targets_for_generation(profile, 2600)["protein_g"] == 200
