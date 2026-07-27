"""Rotas Nootr, indicadores de uso (sequência de check-in)."""
from datetime import date, timedelta

from fastapi import APIRouter

from backend.app.auth import CurrentUser, CurrentUserDep
from backend.app.services import repository, streak

router = APIRouter(prefix="/nootr/stats", tags=["Nootr - Estatísticas"])


@router.get("/streak")
def get_streak(user: CurrentUser = CurrentUserDep):
    """Sequência de dias em que a pessoa usou o app (ver services/streak.py)."""
    today = date.today()
    since = (today - timedelta(days=streak.LOOKBACK_DAYS)).isoformat()
    return streak.compute(repository.day_plan_dates(user, since), today)
