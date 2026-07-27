"""
Sequência de dias de uso ("check-in").

O sinal de uso é a existência do plano do dia (`day_plans.plan_date`), criado
na primeira vez que a pessoa abre a dieta naquele dia (ver
repository.get_or_create_day_plan). Não é um diário de refeições nem exige
confirmação: abrir o app e olhar o dia já conta.

A sequência atual NÃO quebra quando o dia de hoje ainda não foi usado, só
quando o de ontem também não foi. Assim quem abre o app de manhã não vê a
sequência zerada até fazer o primeiro check-in do dia.
"""
from datetime import date, timedelta

# Quantos dias a faixa visual mostra (ver StreakCard no frontend).
WINDOW_DAYS = 7
# Janela consultada no banco, o suficiente pra calcular o recorde sem trazer
# o histórico inteiro de quem usa há muito tempo.
LOOKBACK_DAYS = 180


def _parse(value: str) -> date:
    return date.fromisoformat(value[:10])


def compute(used_dates: list[str], today: date) -> dict:
    """
    `used_dates`: datas ISO em que houve uso (ordem não importa, repetições
    são toleradas). Devolve a sequência atual, o recorde e a faixa dos
    últimos WINDOW_DAYS dias pra UI desenhar os check-ins.
    """
    days = {_parse(d) for d in used_dates if d}

    # Sequência atual: conta pra trás a partir de hoje; se hoje ainda não teve
    # uso, tenta a partir de ontem (o dia ainda está "em aberto").
    start = today if today in days else today - timedelta(days=1)
    current = 0
    cursor = start
    while cursor in days:
        current += 1
        cursor -= timedelta(days=1)

    # Recorde: maior sequência de dias consecutivos em toda a janela.
    longest = 0
    run = 0
    previous: date | None = None
    for day in sorted(days):
        run = run + 1 if previous is not None and day - previous == timedelta(days=1) else 1
        longest = max(longest, run)
        previous = day

    window = [
        {"date": (today - timedelta(days=offset)).isoformat(),
         "used": (today - timedelta(days=offset)) in days}
        for offset in range(WINDOW_DAYS - 1, -1, -1)
    ]
    return {
        "current_streak": current,
        "longest_streak": max(longest, current),
        "days": window,
        "used_today": today in days,
    }
