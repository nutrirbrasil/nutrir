from datetime import date, timedelta

from backend.app.services import streak


def _iso(today: date, *offsets: int) -> list[str]:
    return [(today - timedelta(days=o)).isoformat() for o in offsets]


def test_counts_consecutive_days_up_to_today():
    today = date(2026, 7, 27)
    r = streak.compute(_iso(today, 0, 1, 2), today)
    assert r["current_streak"] == 3
    assert r["used_today"] is True


def test_today_still_open_does_not_break_the_streak():
    # Abriu ontem e anteontem, mas ainda não hoje: a sequência continua de pé
    # (o dia só quebra quando ONTEM também fica sem uso).
    today = date(2026, 7, 27)
    r = streak.compute(_iso(today, 1, 2), today)
    assert r["current_streak"] == 2
    assert r["used_today"] is False


def test_gap_breaks_the_streak():
    today = date(2026, 7, 27)
    r = streak.compute(_iso(today, 0, 1, 3, 4), today)
    assert r["current_streak"] == 2   # hoje e ontem
    assert r["longest_streak"] == 2


def test_longest_streak_looks_at_the_whole_window():
    today = date(2026, 7, 27)
    r = streak.compute(_iso(today, 0, 5, 6, 7, 8), today)
    assert r["current_streak"] == 1
    assert r["longest_streak"] == 4


def test_window_has_seven_days_oldest_first():
    today = date(2026, 7, 27)
    r = streak.compute(_iso(today, 0, 2), today)
    assert len(r["days"]) == 7
    assert r["days"][-1]["date"] == today.isoformat()
    assert r["days"][-1]["used"] is True
    assert r["days"][-2]["used"] is False  # ontem


def test_no_usage_at_all():
    today = date(2026, 7, 27)
    r = streak.compute([], today)
    assert r == {
        "current_streak": 0, "longest_streak": 0, "used_today": False,
        "days": r["days"],
    }
    assert all(not d["used"] for d in r["days"])
