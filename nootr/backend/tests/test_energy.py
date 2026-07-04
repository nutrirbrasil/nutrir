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
