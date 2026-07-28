from datetime import date, datetime

from backend.app.services import repository


def test_day_stays_the_same_between_midnight_and_the_rollover_hour():
    # 01:30 ainda é "27", só vira "28" às 3h. É pra quem janta tarde e mexe
    # no app depois da meia-noite ainda estar ajustando o mesmo dia.
    late_night = datetime(2026, 7, 28, 1, 30, tzinfo=repository._TZ)
    assert repository._app_date(late_night) == date(2026, 7, 27)


def test_day_rolls_over_at_the_configured_hour():
    at_rollover = datetime(2026, 7, 28, 3, 0, tzinfo=repository._TZ)
    assert repository._app_date(at_rollover) == date(2026, 7, 28)


def test_day_is_unaffected_well_after_the_rollover_hour():
    afternoon = datetime(2026, 7, 28, 15, 0, tzinfo=repository._TZ)
    assert repository._app_date(afternoon) == date(2026, 7, 28)
