"""
Motor de ajuste de dieta.

Quando o usuário reporta um desvio (comeu/vai comer algo diferente, ou trocou
um ingrediente), a refeição alvo é ajustada por TROCA: só os alimentos
planejados que a pessoa diz que não comeu saem (`skipped_names`), o que ela
comeu no lugar entra (`new_foods`, pode ser vazio = nada no lugar), e tudo
mais que já estava na refeição continua igual, a pessoa nunca precisa
redescrever a refeição inteira, só o que mudou. Depois reajustamos as
PORÇÕES das refeições seguintes do dia buscando DOIS alvos ao mesmo tempo: as
CALORIAS e a PROTEÍNA do dia.

Como um único fator por alimento não permite acertar vários alvos
independentes, separamos os alimentos em grupos (proteico, gorduroso,
carboidrato/outros) e resolvemos, em cascata, sistemas lineares 2x2 pro fator
de cada grupo (ver `_solve_three_group`): calorias e proteína primeiro
(estrutura original), depois, dentro do que sobra, gordura (carboidrato
absorve a folga, é o macro mais elástico numa troca). Alimentos de baixa
densidade calórica (salada, folha) ficam de fora do ajuste de quantidade
(`_is_low_density`), multiplicar a porção deles por 2x quase não muda
calorias e só deixa o prato com quantidade sem sentido. As quantidades
(gramas + rótulo) são atualizadas de verdade, porque a mudança principal é
justamente na quantidade de cada alimento.

A redistribuição entre as refeições ajustáveis NÃO aplica o mesmo fator pra
todas (isso concentrava o ajuste do jeito errado, ex: engordava ainda mais
uma janta que já tinha proteína de sobra e deixava um lanche sem nada).
Em vez disso, cada refeição recebe uma fatia-alvo de calorias/proteína
proporcional ao seu PAPEL (almoço/jantar ~30% cada, demais dividem o resto,
ver services/meal_planning.role_weights) e é resolvida individualmente,
favorecendo quem está mais abaixo da própria meta. Uma segunda passada de
ajuste fino garante que a meta do DIA (a restrição rígida, sem tolerância)
seja batida mesmo quando a distribuição por papel não fecha sozinha (ex:
alguma refeição ficou vazia e não pôde absorver a fatia que lhe cabia). Uma
terceira passada (`_apply_floor_pass`) garante, best-effort, que nenhuma
refeição ajustável fique abaixo do próprio piso (~25% almoço/jantar, ~10% as
demais, ver services/meal_planning.meal_floor_share), redistribuindo só entre
as refeições ajustáveis com folga, sem nunca violar a meta do dia.
"""
from datetime import datetime, time as dt_time

from backend.app.services import meal_planning, portion

_MIN_FACTOR = 0.3
_MAX_FACTOR = 2.0
_PROTEIN_GROUP_RATIO = 0.25  # alimento é "proteico" se >=25% das kcal vêm de proteína
_FAT_GROUP_RATIO = 0.35  # dentre os NÃO proteicos, "gorduroso" se >=35% das kcal vêm de gordura
# Abaixo disso (ex: folha, salada, pepino), o alimento fica de fora do ajuste de
# QUANTIDADE: dobrar uma salada quase não muda calorias e só deixa a porção sem
# sentido (ver _solve_group_factors). O déficit que sobraria pra ela recai sobre
# os alimentos de verdade ajustáveis da mesma refeição.
_LOW_DENSITY_KCAL_PER_100G = 40.0


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def _parse_time(value: str) -> dt_time:
    return dt_time.fromisoformat(value)


def _meal_macros(meal: dict) -> dict:
    return {
        "calories": sum(f["calories"] for f in meal["foods"]),
        "protein_g": sum(f["protein_g"] for f in meal["foods"]),
        "carbs_g": sum(f["carbs_g"] for f in meal["foods"]),
        "fat_g": sum(f["fat_g"] for f in meal["foods"]),
    }


def _day_macros(meals: list[dict]) -> dict:
    """Totais do dia + % de cada macro sobre as calorias."""
    total = {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0}
    for meal in meals:
        m = _meal_macros(meal)
        for k in total:
            total[k] += m[k]
    cals = total["calories"] or 1
    return {
        "calories": round(total["calories"]),
        "protein_g": round(total["protein_g"]),
        "carbs_g": round(total["carbs_g"]),
        "fat_g": round(total["fat_g"]),
        "protein_pct": round(total["protein_g"] * 4 / cals * 100),
        "carbs_pct": round(total["carbs_g"] * 4 / cals * 100),
        "fat_pct": round(total["fat_g"] * 9 / cals * 100),
    }


def _pick_default_meal(diet: dict, forward_looking: bool) -> dict:
    now = datetime.now().time()
    meals = diet["meals"]
    if forward_looking:
        upcoming = [m for m in meals if _parse_time(m["time"]) > now]
        return upcoming[0] if upcoming else meals[-1]
    already = [m for m in meals if _parse_time(m["time"]) <= now]
    return already[-1] if already else meals[0]


def _targets(diet: dict, targets: dict | None) -> dict:
    """Metas do dia: do perfil, se vier; senão os totais da própria dieta."""
    if targets:
        return targets
    return {
        "calories": diet["daily_calories"],
        "protein_g": diet["daily_protein_g"],
        "carbs_g": diet["daily_carbs_g"],
        "fat_g": diet["daily_fat_g"],
    }


def _scale_food(f: dict, factor: float) -> dict:
    """
    Escala um alimento por `factor`. Se ele tem uma medida caseira
    reconhecida (ex: "3 unidades", "2 fatias"), RECALCULA a contagem e
    preserva a medida (ver portion.rescale_quantity), em vez de descartá-la e
    só devolver gramas cruas ("339g"), que além de perder a medida caseira
    também não bate com nenhuma porção real (ex: 339g de ovo). A contagem
    final é capada a um crescimento realista (rescale_quantity) e as gramas
    finais (já arredondadas/capadas) são a base real do reescalonamento de
    calorias/macros, não o `factor` bruto.
    """
    grams = f.get("grams")
    if not grams or abs(factor - 1.0) < 1e-4:
        return {
            **f,
            "calories": round(f["calories"] * factor, 1),
            "protein_g": round(f["protein_g"] * factor, 1),
            "carbs_g": round(f["carbs_g"] * factor, 1),
            "fat_g": round(f["fat_g"] * factor, 1),
        }
    new_grams, label = portion.rescale_quantity(f.get("quantity", ""), grams * factor, f.get("name", ""))
    real_factor = new_grams / grams
    return {
        **f,
        "calories": round(f["calories"] * real_factor, 1),
        "protein_g": round(f["protein_g"] * real_factor, 1),
        "carbs_g": round(f["carbs_g"] * real_factor, 1),
        "fat_g": round(f["fat_g"] * real_factor, 1),
        "grams": new_grams,
        "quantity": label,
    }


def _is_protein_food(f: dict) -> bool:
    cal = f["calories"]
    return cal > 0 and (f["protein_g"] * 4 / cal) >= _PROTEIN_GROUP_RATIO


def _solve_two_group(cal_a: float, prot_a: float, cal_b: float, prot_b: float,
                     need_cal: float, need_prot: float) -> tuple[float, float] | None:
    """
    Fatores (a, b) para o grupo proteico (A) e energético (B).

    Prioridade: as CALORIAS do dia batem a meta (sem tolerância pedida pelo
    usuário), é a restrição rígida. Dentro do que sobra de liberdade (a,b
    fisicamente possíveis, entre _MIN_FACTOR e _MAX_FACTOR), escolhemos o
    ponto que deixa a PROTEÍNA o mais perto possível da meta. Isso evita o
    problema do sistema 2x2 "exato": ele podia pedir um fator negativo
    (impossível) quando a proteína que falta não cabe na composição dos
    alimentos restantes sem estourar as calorias.
    """
    if cal_a <= 0 and cal_b <= 0:
        return None

    # Só um grupo com calorias: um único fator disponível, mira as calorias.
    if cal_a <= 0:
        b = _clamp(need_cal / cal_b, _MIN_FACTOR, _MAX_FACTOR)
        return 1.0, b
    if cal_b <= 0:
        a = _clamp(need_cal / cal_a, _MIN_FACTOR, _MAX_FACTOR)
        return a, 1.0

    # Faixa de "a" para a qual existe um "b" no range válido que zera o
    # desvio de calorias: a*cal_a + b*cal_b = need_cal, com b em [MIN,MAX].
    # b(a) = (need_cal - a*cal_a) / cal_b é decrescente em a (cal_a,cal_b>0).
    a_for_b_max = (need_cal - _MAX_FACTOR * cal_b) / cal_a
    a_for_b_min = (need_cal - _MIN_FACTOR * cal_b) / cal_a
    a_lo = _clamp(min(a_for_b_max, a_for_b_min), _MIN_FACTOR, _MAX_FACTOR)
    a_hi = _clamp(max(a_for_b_max, a_for_b_min), _MIN_FACTOR, _MAX_FACTOR)

    if a_lo <= a_hi:
        # Calorias exatas são alcançáveis: dentro de [a_lo, a_hi], minimiza o
        # desvio de proteína. protein(a) = a*prot_a + b(a)*prot_b é linear em a.
        slope = prot_a - prot_b * cal_a / cal_b
        if abs(slope) < 1e-9:
            a = _clamp(1.0, a_lo, a_hi)  # proteína não muda com "a": mexe o mínimo possível
        else:
            a_star = (need_prot - prot_b * need_cal / cal_b) / slope
            a = _clamp(a_star, a_lo, a_hi)
        b = _clamp((need_cal - a * cal_a) / cal_b, _MIN_FACTOR, _MAX_FACTOR)
        return a, b

    # Calorias exatas não são alcançáveis nos limites físicos: escala tudo
    # igual, priorizando bater as calorias o quanto der (fallback honesto).
    f = _clamp(need_cal / (cal_a + cal_b), _MIN_FACTOR, _MAX_FACTOR)
    return f, f


def _is_fat_food(f: dict) -> bool:
    """Dentre os alimentos NÃO proteicos, esse é o "gorduroso" (ex: azeite,
    manteiga, queijo mais gordo). Quem já é proteico (ovo, carne) fica no
    grupo proteico mesmo tendo bastante gordura, ver _solve_three_group."""
    cal = f["calories"]
    return cal > 0 and not _is_protein_food(f) and (f["fat_g"] * 9 / cal) >= _FAT_GROUP_RATIO


def _is_low_density(f: dict) -> bool:
    grams = f.get("grams")
    if not grams:
        return False
    return (f["calories"] / grams * 100) < _LOW_DENSITY_KCAL_PER_100G


def _solve_three_group(
    foods: list[dict], need_cal: float, need_prot: float, need_fat: float,
) -> list[float] | None:
    """
    Como `_solve_two_group`, mas mira GORDURA também, não só calorias e
    proteína (ver limitação descrita no docstring do módulo). Resolve em dois
    níveis, reaproveitando `_solve_two_group` duas vezes:
    1) separa proteico vs resto mirando (calorias, proteína), exatamente como
       antes, protegendo proteína sem regressão;
    2) dentro do "resto", separa gorduroso vs carboidrato/outros mirando as
       MESMAS calorias que o nível 1 já decidiu pro grupo (não pode mudar,
       senão quebra a meta de calorias do nível 1) e a gordura que falta.
       Carboidrato absorve a folga, é o macro mais elástico numa troca.

    Devolve um fator por alimento (mesma ordem de `foods`), ou None se não
    houver nenhum grupo com calorias > 0 pra ajustar.
    """
    cal_a, prot_a, cal_b, prot_b = _group_totals(foods)
    solution = _solve_two_group(cal_a, prot_a, cal_b, prot_b, need_cal, need_prot)
    if solution is None:
        return None
    a, b = solution

    cal_f = fat_f = cal_c = fat_c = fat_a = 0.0
    for f in foods:
        if _is_protein_food(f):
            fat_a += f["fat_g"]
        elif _is_fat_food(f):
            cal_f += f["calories"]
            fat_f += f["fat_g"]
        else:
            cal_c += f["calories"]
            fat_c += f["fat_g"]

    need_fat_b = need_fat - a * fat_a
    fat_fix = _solve_two_group(cal_f, fat_f, cal_c, fat_c, b * cal_b, need_fat_b)
    f_factor, c_factor = fat_fix if fat_fix is not None else (b, b)

    factors = []
    for food in foods:
        if _is_protein_food(food):
            factors.append(a)
        elif _is_fat_food(food):
            factors.append(f_factor)
        else:
            factors.append(c_factor)
    return factors


def _solve_group_factors(
    foods: list[dict], need_cal: float, need_prot: float, need_fat: float,
) -> list[float] | None:
    """
    Fator de escala por alimento (mesma ordem de `foods`) que faz o grupo
    bater `need_cal` (rígido) e ficar o mais perto possível de `need_prot` E
    `need_fat` ao mesmo tempo (ver `_solve_three_group`). Alimentos de baixa
    densidade calórica (`_is_low_density`) ficam de fora do ajuste, sempre
    fator 1.0, o déficit recai sobre os demais alimentos do grupo.
    """
    scalable_idx = [i for i, f in enumerate(foods) if not _is_low_density(f)]
    if not scalable_idx:
        # Sem NENHUMA alternativa de densidade normal no grupo (ex: refeição
        # é só sopa rala), mexer no que tem é melhor que travar o ajuste.
        scalable_idx = list(range(len(foods)))
    scalable = [foods[i] for i in scalable_idx]
    fixed_idx = set(range(len(foods))) - set(scalable_idx)
    fixed_cal = sum(foods[i]["calories"] for i in fixed_idx)
    fixed_prot = sum(foods[i]["protein_g"] for i in fixed_idx)
    fixed_fat = sum(foods[i]["fat_g"] for i in fixed_idx)

    sub_factors = _solve_three_group(
        scalable, need_cal - fixed_cal, need_prot - fixed_prot, need_fat - fixed_fat,
    )
    if sub_factors is None:
        return None

    factors = [1.0] * len(foods)
    for pos, idx in enumerate(scalable_idx):
        factors[idx] = sub_factors[pos]
    return factors


def _meals_after(meals: list[dict], meal_id: str) -> set[str]:
    """IDs das refeições que vêm depois de `meal_id` na ordem da lista."""
    idx = next(i for i, m in enumerate(meals) if m["id"] == meal_id)
    return {m["id"] for m in meals[idx + 1:]}


def _group_totals(foods: list[dict]) -> tuple[float, float, float, float]:
    """(cal_proteico, prot_proteico, cal_energetico, prot_energetico) de uma lista de alimentos."""
    cal_a = prot_a = cal_b = prot_b = 0.0
    for f in foods:
        if _is_protein_food(f):
            cal_a += f["calories"]
            prot_a += f["protein_g"]
        else:
            cal_b += f["calories"]
            prot_b += f["protein_g"]
    return cal_a, prot_a, cal_b, prot_b


def _apply_floor_pass(
    remaining: list[dict], adjusted_by_id: dict[str, dict], solvable_ids: list[str], targets: dict,
) -> bool:
    """
    3ª passada: garante o piso de cada papel (~25% almoço/jantar, ~10% as
    demais, ver meal_planning.meal_floor_share) redistribuindo calorias E
    proteína só ENTRE as próprias refeições ajustáveis que sobraram com folga
    acima do próprio piso, o suficiente pra cobrir o déficit sem sobrar nem
    faltar (soma líquida movida é zero), então a meta do dia (a restrição
    rígida das passadas 1/2) nunca é afetada por esta passada. Se não houver
    folga suficiente (ex: um desvio grande mais cedo já deixou o resto do dia
    apertado), cobre só uma fração proporcional do déficit e aceita o
    resultado parcial, nunca viola a meta do dia pra perseguir o piso.
    """
    if len(solvable_ids) < 2:
        return False

    name_by_id = {m["id"]: m["name"] for m in remaining}
    cal_by_id: dict[str, float] = {}
    prot_by_id: dict[str, float] = {}
    floor_cal_by_id: dict[str, float] = {}
    floor_prot_by_id: dict[str, float] = {}
    for mid in solvable_ids:
        mm = _meal_macros(adjusted_by_id[mid])
        cal_by_id[mid] = mm["calories"]
        prot_by_id[mid] = mm["protein_g"]
        share = meal_planning.meal_floor_share(name_by_id[mid])
        floor_cal_by_id[mid] = share * targets["calories"]
        floor_prot_by_id[mid] = share * targets["protein_g"]

    def _redistribute(current: dict[str, float], floor: dict[str, float]) -> dict[str, float]:
        deficits = {mid: max(0.0, floor[mid] - current[mid]) for mid in solvable_ids}
        surpluses = {mid: max(0.0, current[mid] - floor[mid]) for mid in solvable_ids}
        total_deficit = sum(deficits.values())
        total_surplus = sum(surpluses.values())
        if total_deficit <= 1e-6 or total_surplus <= 1e-6:
            return {mid: 0.0 for mid in solvable_ids}
        amount = min(total_deficit, total_surplus)
        return {
            mid: deficits[mid] * (amount / total_deficit) - surpluses[mid] * (amount / total_surplus)
            for mid in solvable_ids
        }

    delta_cal = _redistribute(cal_by_id, floor_cal_by_id)
    delta_prot = _redistribute(prot_by_id, floor_prot_by_id)
    if all(abs(v) < 1e-6 for v in delta_cal.values()) and all(abs(v) < 1e-6 for v in delta_prot.values()):
        return False

    changed = False
    for mid in solvable_ids:
        if abs(delta_cal[mid]) < 1e-6 and abs(delta_prot[mid]) < 1e-6:
            continue
        foods = adjusted_by_id[mid]["foods"]
        cal_a, prot_a, cal_b, prot_b = _group_totals(foods)
        solution = _solve_two_group(
            cal_a, prot_a, cal_b, prot_b,
            cal_by_id[mid] + delta_cal[mid], prot_by_id[mid] + delta_prot[mid],
        )
        if solution is None:
            continue
        a, b = solution
        if abs(a - 1) >= 0.001 or abs(b - 1) >= 0.001:
            changed = True
        adjusted_by_id[mid] = {
            **adjusted_by_id[mid],
            "foods": [_scale_food(f, a if _is_protein_food(f) else b) for f in foods],
        }
    return changed


# Nenhuma refeição pode concentrar mais que essa fração da proteína do DIA
# INTEIRO (ex: jantar com 101g de proteína num dia de meta 159g é 63%, acima
# do teto), teto absoluto, não relativo ao peso de papel da própria refeição
# (um teto relativo ao peso de papel deixava passar esse exato caso: o peso
# de papel do jantar já é alto por design, "fatia justa" dele já era grande
# o bastante pra disfarçar a concentração).
_PROTEIN_MAX_MEAL_SHARE = 0.5


def _apply_protein_ceiling_pass(
    remaining: list[dict], adjusted_by_id: dict[str, dict], solvable_ids: list[str], targets: dict,
) -> bool:
    """
    4ª passada: se uma refeição ficou com mais de `_PROTEIN_MAX_MEAL_SHARE`
    (50%) da proteína do DIA inteiro, mas outra refeição ajustável ainda tem
    espaço abaixo desse mesmo teto, move o excedente de uma pra outra: cresce
    o grupo proteico de quem está abaixo, encolhe o de quem está acima,
    compensando com o grupo carboidrato/outros de cada uma pra manter as
    CALORIAS de cada refeição intactas (só redistribui a PROTEÍNA entre elas,
    não mexe no total do dia). Best-effort, como `_apply_floor_pass`: se não
    houver folga suficiente, corrige só uma fração e aceita o resultado
    parcial.
    """
    if len(solvable_ids) < 2:
        return False

    cap = _PROTEIN_MAX_MEAL_SHARE * targets["protein_g"]
    prot_by_id = {mid: _meal_macros(adjusted_by_id[mid])["protein_g"] for mid in solvable_ids}
    surpluses = {mid: max(0.0, prot_by_id[mid] - cap) for mid in solvable_ids}
    room = {mid: max(0.0, cap - prot_by_id[mid]) for mid in solvable_ids}
    total_surplus = sum(surpluses.values())
    total_room = sum(room.values())
    if total_surplus <= 1e-6 or total_room <= 1e-6:
        return False
    amount = min(total_surplus, total_room)
    delta_prot = {
        mid: room[mid] * (amount / total_room) - surpluses[mid] * (amount / total_surplus)
        for mid in solvable_ids
    }
    if all(abs(v) < 1e-6 for v in delta_prot.values()):
        return False

    changed = False
    for mid in solvable_ids:
        if abs(delta_prot[mid]) < 1e-6:
            continue
        foods = adjusted_by_id[mid]["foods"]
        cal_a, prot_a, cal_b, prot_b = _group_totals(foods)
        current_cal = cal_a + cal_b
        solution = _solve_two_group(cal_a, prot_a, cal_b, prot_b, current_cal, prot_by_id[mid] + delta_prot[mid])
        if solution is None:
            continue
        a, b = solution
        if abs(a - 1) >= 0.001 or abs(b - 1) >= 0.001:
            changed = True
        adjusted_by_id[mid] = {
            **adjusted_by_id[mid],
            "foods": [_scale_food(f, a if _is_protein_food(f) else b) for f in foods],
        }
    return changed


# Um alimento que precisou crescer perto do próprio teto pra fechar a meta
# quase sempre virou uma porção pouco realista (ex: 300ml de leite virando
# 750ml), mesmo estando matematicamente "certo". É informativo demais pra só
# aceitar calado, ver `_rebalance`/`day_topup.try_day_topup`: quando isso
# acontece, vale perguntar pra IA se existe uma escolha mais sensata (outro
# alimento, ou o mesmo em quantidade menor) em vez de aceitar a porção extrema.
_NEAR_CEILING_FACTOR = _MAX_FACTOR - 0.2


def _cap_total_growth(baseline: list[dict], adjusted_by_id: dict[str, dict]) -> list[str]:
    """
    Limita o crescimento ACUMULADO de cada alimento a `_MAX_FACTOR` sobre
    `baseline` (a porção ORIGINAL do dia, antes de qualquer ajuste, ver
    `original_meals` em `_rebalance`). Muda `adjusted_by_id` in-place e
    devolve os nomes dos alimentos que chegaram perto do teto (ver
    `_NEAR_CEILING_FACTOR`), úteis pra sinalizar que vale revisão da IA.

    Cada passada respeita o próprio teto, mas os tetos se compõem: três
    passadas de 2,5x davam até 15x, e um arroz de 150g virava 915g pra
    absorver sozinho um desvio grande. Porção irreal é pior que meta
    imperfeita, então o teto vale sobre o total. Além disso, o baseline
    precisa ser o do DIA inteiro, não o da última mensagem/ajuste: se cada
    conversa recalculasse o teto sobre o resultado da conversa anterior, o
    limite continuaria valendo passada a passada mas o alimento cresceria
    sem fim ao longo de várias mensagens no mesmo dia. O que não couber aqui
    fica como diferença honesta no fim do dia (ver `remaining_calories`), que
    é o mesmo caminho de quando não há refeição ajustável.
    """
    original_by_id = {m["id"]: {f["name"]: f for f in m["foods"]} for m in baseline}
    near_ceiling: list[str] = []
    for meal_id, meal in adjusted_by_id.items():
        originals = original_by_id.get(meal_id, {})
        capped = []
        for food in meal["foods"]:
            before = originals.get(food["name"])
            grams_before = (before or {}).get("grams") or 0
            grams_now = food.get("grams") or 0
            if grams_before and grams_now > grams_before * _MAX_FACTOR:
                capped.append(_scale_food(before, _MAX_FACTOR))
                near_ceiling.append(food["name"])
            else:
                capped.append(food)
                if grams_before and grams_now >= grams_before * _NEAR_CEILING_FACTOR:
                    near_ceiling.append(food["name"])
        adjusted_by_id[meal_id] = {**meal, "foods": capped}
    return near_ceiling


_CALORIE_TOLERANCE_PCT = 0.02  # o dia nunca pode fechar mais de 2% longe da meta
_CALORIE_TOLERANCE_MIN_KCAL = 10.0  # abaixo de ~10 kcal a diferença é ruído, não vale mexer mais


def calorie_tolerance(target_calories: float) -> float:
    """Máximo aceitável de diferença entre o dia e a meta de calorias: 2%,
    ou 10 kcal, o que for maior. Usado tanto aqui (ver `_enforce_calorie_tolerance`)
    quanto pelas rotas pra decidir se vale a pena pedir um top-up à IA."""
    return max(_CALORIE_TOLERANCE_MIN_KCAL, target_calories * _CALORIE_TOLERANCE_PCT)


def _enforce_calorie_tolerance(
    baseline: list[dict], adjusted_by_id: dict[str, dict], fixed_calories: float, target_calories: float,
) -> bool:
    """
    Última rede de segurança: o dia SEMPRE tem que fechar dentro de 2% da
    meta de calorias (ou 10 kcal, o que for maior). O `_cap_total_growth`
    protege contra porção irreal, mas podia deixar sobrar uma diferença
    grande sem ninguém cobrir depois, e "meta imperfeita" não é aceitável
    aqui, diferente do piso de proteína (`_apply_floor_pass`), que é
    best-effort.

    Distribui o resíduo PROPORCIONALMENTE entre os alimentos das refeições
    ajustáveis que ainda têm espaço (entre o piso de _MIN_FACTOR e o teto de
    _MAX_FACTOR sobre a porção original do dia, ver `baseline`), em vez de
    concentrar tudo num alimento só. Em poucas passadas (alimentos que batem
    no próprio limite numa passada sobram pra quem ainda tem espaço na
    próxima). Se ninguém tiver mais espaço, aceita o resultado (caso raro:
    todo mundo já está no teto/piso), o mesmo comportamento de antes.
    """
    tolerance = calorie_tolerance(target_calories)
    baseline_by_id = {
        m["id"]: {f["name"]: f.get("grams") or 0 for f in m["foods"]} for m in baseline
    }
    changed = False

    for _ in range(4):
        current = fixed_calories + sum(
            f["calories"] for meal in adjusted_by_id.values() for f in meal["foods"]
        )
        deviation = target_calories - current
        if abs(deviation) <= tolerance:
            return changed

        candidates = []  # (meal_id, food_index, room_kcal)
        for mid, meal in adjusted_by_id.items():
            originals = baseline_by_id.get(mid, {})
            for i, food in enumerate(meal["foods"]):
                if _is_low_density(food):
                    continue
                grams = food.get("grams")
                kcal_per_g = food["calories"] / grams if grams else 0
                if not grams or kcal_per_g <= 0:
                    continue
                original = originals.get(food["name"]) or grams
                if deviation > 0:
                    room_grams = original * _MAX_FACTOR - grams
                else:
                    room_grams = grams - original * _MIN_FACTOR
                if room_grams > 0.5:
                    candidates.append((mid, i, room_grams * kcal_per_g))

        if not candidates:
            return changed

        total_room = sum(room for _, _, room in candidates)
        share = min(1.0, abs(deviation) / total_room)
        sign = 1 if deviation > 0 else -1
        for mid, i, room in candidates:
            food = adjusted_by_id[mid]["foods"][i]
            grams = food["grams"]
            add_kcal = sign * room * share
            new_grams = grams + add_kcal / (food["calories"] / grams)
            adjusted_by_id[mid]["foods"][i] = _scale_food(food, new_grams / grams)
        changed = True

    return changed


def _rebalance(
    meals: list[dict], adjustable_ids: set[str], targets: dict, original_meals: list[dict] | None = None,
) -> tuple[list[dict], bool, bool, list[str], list[str]]:
    """
    Ajusta as porções das refeições em `adjustable_ids` para o dia bater as
    CALORIAS e a PROTEÍNA do alvo ao mesmo tempo (grupos proteico/energético).
    Devolve (refeições, rebalanceou?, havia refeição ajustável?), o terceiro
    valor diferencia "não havia nada pra ajustar" de "havia, mas o fator ficou
    ~1 (já estava dentro da meta)", pra decidir se vale a pena tentar um
    ajuste extra (adicionar/remover alimento) além da escala de quantidade.

    `original_meals`: porção original do dia (antes de qualquer ajuste hoje),
    usada só como teto do `_cap_total_growth` (ver lá o porquê). Se não vier
    (chamadas antigas, testes), usa o próprio `meals` recebido aqui, que é o
    comportamento anterior.

    Em vez de aplicar o MESMO fator a todas as refeições ajustáveis (o que
    concentrava calorias/proteína ainda mais na refeição que já tinha mais),
    cada refeição recebe uma fatia-alvo proporcional ao seu papel (almoço e
    jantar ~30% do dia cada, as demais dividem o resto, ver
    services/meal_planning.role_weights) e é resolvida sozinha, o que
    favorece naturalmente quem está mais abaixo da própria meta. Uma segunda
    passada corrige o resíduo (ex: uma refeição vazia não conseguiu absorver
    a fatia que lhe cabia) pra garantir a meta do DIA, que é a restrição
    rígida, sem tolerância.
    """
    remaining = [m for m in meals if m["id"] in adjustable_ids]
    had_adjustable = bool(remaining)
    if not remaining:
        return meals, False, False, [], []

    consumed = {"calories": 0.0, "protein_g": 0.0, "fat_g": 0.0}
    for m in meals:
        if m["id"] not in adjustable_ids:
            mm = _meal_macros(m)
            consumed["calories"] += mm["calories"]
            consumed["protein_g"] += mm["protein_g"]
            consumed["fat_g"] += mm["fat_g"]

    need_cal = targets["calories"] - consumed["calories"]
    need_prot = targets["protein_g"] - consumed["protein_g"]
    need_fat = targets["fat_g"] - consumed["fat_g"]

    weights = meal_planning.role_weights(
        [m["name"] for m in remaining], all_meal_names=[m["name"] for m in meals],
    )

    adjusted_by_id: dict[str, dict] = {}
    changed = False
    solvable_ids: list[str] = []

    # 1ª passada: aloca a fatia-alvo de cada refeição (proporcional ao papel)
    # e resolve individualmente.
    for m, w in zip(remaining, weights):
        target_cal_m = need_cal * w
        target_prot_m = need_prot * w
        target_fat_m = need_fat * w
        factors = _solve_group_factors(m["foods"], target_cal_m, target_prot_m, target_fat_m)
        if factors is None:
            # Refeição vazia ou só com alimentos de baixa densidade, sua
            # fatia sobra pra a 2ª passada redistribuir entre as demais.
            adjusted_by_id[m["id"]] = m
            continue
        if any(abs(fac - 1) >= 0.02 for fac in factors):
            changed = True
        solvable_ids.append(m["id"])
        adjusted_by_id[m["id"]] = {
            **m,
            "foods": [_scale_food(f, fac) for f, fac in zip(m["foods"], factors)],
        }

    # 2ª passada: ajuste fino global só nas refeições que sobraram com
    # alimentos utilizáveis, pra fechar exatamente a meta do dia mesmo quando
    # a distribuição por papel não fecha sozinha.
    achieved_cal = consumed["calories"]
    achieved_prot = consumed["protein_g"]
    achieved_fat = consumed["fat_g"]
    for m in remaining:
        mm = _meal_macros(adjusted_by_id[m["id"]])
        achieved_cal += mm["calories"]
        achieved_prot += mm["protein_g"]
        achieved_fat += mm["fat_g"]
    residual_cal = targets["calories"] - achieved_cal
    residual_prot = targets["protein_g"] - achieved_prot
    residual_fat = targets["fat_g"] - achieved_fat

    if solvable_ids and (abs(residual_cal) > 3 or abs(residual_prot) > 1):
        cur_cal = cur_prot = cur_fat = 0.0
        all_foods: list[dict] = []
        positions: list[tuple[str, int]] = []
        for mid in solvable_ids:
            foods = adjusted_by_id[mid]["foods"]
            mm = _meal_macros(adjusted_by_id[mid])
            cur_cal += mm["calories"]
            cur_prot += mm["protein_g"]
            cur_fat += mm["fat_g"]
            for idx in range(len(foods)):
                positions.append((mid, idx))
            all_foods.extend(foods)
        fix_factors = _solve_group_factors(
            all_foods, cur_cal + residual_cal, cur_prot + residual_prot, cur_fat + residual_fat,
        )
        if fix_factors is not None:
            if any(abs(fac - 1) >= 0.001 for fac in fix_factors):
                changed = True
            new_foods_by_mid = {mid: list(adjusted_by_id[mid]["foods"]) for mid in solvable_ids}
            for flat_idx, (mid, idx) in enumerate(positions):
                new_foods_by_mid[mid][idx] = _scale_food(all_foods[flat_idx], fix_factors[flat_idx])
            for mid in solvable_ids:
                adjusted_by_id[mid] = {**adjusted_by_id[mid], "foods": new_foods_by_mid[mid]}

    if _apply_floor_pass(remaining, adjusted_by_id, solvable_ids, targets):
        changed = True

    cap_source = original_meals if original_meals is not None else meals
    cap_baseline = [m for m in cap_source if m["id"] in adjustable_ids]
    near_ceiling = _cap_total_growth(cap_baseline, adjusted_by_id)

    # O teto de crescimento acima pode ter deixado o dia longe da meta de
    # calorias de novo; fecha essa diferença (dentro do que os alimentos
    # ainda suportam) antes de aceitar o resultado. Sempre depois do teto,
    # nunca antes, senão essa passada é que estouraria o teto.
    if _enforce_calorie_tolerance(cap_baseline, adjusted_by_id, consumed["calories"], targets["calories"]):
        changed = True

    # Proteína por último: as passadas acima mexem em calorias sem saber de
    # proteína (ex: _enforce_calorie_tolerance pode ter jogado calorias de
    # volta pro alimento proteico pra fechar a meta), então essa concentração
    # só pode ser corrigida depois de tudo. Preserva as CALORIAS de cada
    # refeição (só troca o "recheio" proteína/carboidrato dentro dela), por
    # isso rodar por último não desfaz o fechamento de calorias acima.
    if _apply_protein_ceiling_pass(remaining, adjusted_by_id, solvable_ids, targets):
        changed = True

    # Refeição cuja proteína ficou bem abaixo da própria fatia-alvo mesmo
    # depois de todas as passadas (ver _apply_protein_ceiling_pass): sinal de
    # que ela não tem alimento proteico NENHUM pra puxar via quantidade (ex:
    # só pão e banana), só um alimento novo resolve, ver day_topup.
    protein_poor_meals = []
    for m, w in zip(remaining, weights):
        fair_share = w * targets["protein_g"]
        actual = _meal_macros(adjusted_by_id.get(m["id"], m))["protein_g"]
        if fair_share > 5 and actual < fair_share * 0.5:
            protein_poor_meals.append(m["name"])

    if not changed:
        return meals, False, had_adjustable, [], protein_poor_meals

    adjusted = [adjusted_by_id.get(m["id"], m) if m["id"] in adjustable_ids else m for m in meals]
    return adjusted, True, had_adjustable, near_ceiling, protein_poor_meals


def day_macros(meals: list[dict]) -> dict:
    """Wrapper público de `_day_macros`, usado pra recalcular o dia depois de
    um ajuste extra (top-up) aplicado fora do motor (ver `apply_meal_changes`)."""
    return _day_macros(meals)


def apply_meal_changes(
    meals: list[dict], meal_name: str, new_foods: list[dict], removal_names: list[str],
) -> list[dict] | None:
    """
    Aplica um ajuste extra numa refeição pelo NOME (case-insensitive): remove
    os alimentos cujo nome está em `removal_names` e adiciona `new_foods` (já
    resolvidos/escalados, ver food_matcher, chamado pela rota, não aqui).
    Devolve None se a refeição não existir. Usado pro "top-up" sugerido pela
    IA quando só escalar as quantidades não é suficiente pra bater a meta.
    """
    idx = next((i for i, m in enumerate(meals) if m["name"].lower() == meal_name.lower()), None)
    if idx is None:
        return None
    meal = meals[idx]
    removal_set = {r.lower() for r in removal_names}
    kept = [f for f in meal["foods"] if f["name"].lower() not in removal_set]
    updated_meal = {**meal, "foods": kept + new_foods}
    return [updated_meal if i == idx else m for i, m in enumerate(meals)]


_QTY_CHANGE_TOLERANCE_G = 1.0  # abaixo disso é ruído de arredondamento, não mudança


def merge_foods(foods: list[dict]) -> list[dict]:
    """
    Junta itens repetidos pelo nome, somando quantidade e macros.

    Comer "mais 80g de feijão" numa refeição que já tem feijão é 180g de
    feijão, não duas linhas de feijão. Além de ser o que a pessoa espera ver,
    duplicata quebrava o diff (`diff_meals` indexa por nome e só enxergaria
    uma das linhas, reportando uma redução que não houve).
    """
    merged: dict[str, dict] = {}
    for food in foods:
        existing = merged.get(food["name"])
        if existing is None:
            merged[food["name"]] = dict(food)
            continue
        grams = (existing.get("grams") or 0) + (food.get("grams") or 0)
        existing.update({
            "calories": round(existing["calories"] + food["calories"], 1),
            "protein_g": round(existing["protein_g"] + food["protein_g"], 1),
            "carbs_g": round(existing["carbs_g"] + food["carbs_g"], 1),
            "fat_g": round(existing["fat_g"] + food["fat_g"], 1),
        })
        if grams:
            existing["grams"] = round(grams, 1)
            existing["quantity"] = f"{round(grams)}g"
    return list(merged.values())


def diff_meals(before: list[dict], after: list[dict]) -> list[dict]:
    """
    O que mudou de fato, refeição por refeição: quantidades aumentadas ou
    reduzidas, alimentos que entraram e alimentos que saíram.

    É o coração do que o app entrega, então o resultado precisa ser explícito
    em vez de "os macros mudaram": alimenta tanto a explicação da IA (ver
    ai.explain_change, que sem isso só sabia falar de totais e saía genérica)
    quanto a exibição do dia ajustado no frontend.

    Devolve [{"meal", "changes": [{"kind", "name", "from", "to"}]}], só com as
    refeições que realmente mudaram. `kind` é "increased" | "decreased" |
    "added" | "removed".
    """
    after_by_id = {m["id"]: m for m in after}
    out: list[dict] = []

    for meal_before in before:
        meal_after = after_by_id.get(meal_before["id"])
        if meal_after is None:
            continue
        foods_before = {f["name"]: f for f in meal_before["foods"]}
        foods_after = {f["name"]: f for f in meal_after["foods"]}
        changes: list[dict] = []

        for name, fb in foods_before.items():
            fa = foods_after.get(name)
            if fa is None:
                changes.append({"kind": "removed", "name": name, "from": fb.get("quantity", ""), "to": ""})
                continue
            gb, ga = fb.get("grams") or 0, fa.get("grams") or 0
            if abs(ga - gb) < _QTY_CHANGE_TOLERANCE_G:
                continue
            changes.append({
                "kind": "increased" if ga > gb else "decreased",
                "name": name,
                "from": fb.get("quantity", ""),
                "to": fa.get("quantity", ""),
            })

        for name, fa in foods_after.items():
            if name not in foods_before:
                changes.append({"kind": "added", "name": name, "from": "", "to": fa.get("quantity", "")})

        if changes:
            out.append({"meal": meal_before["name"], "changes": changes})
    return out


def build_day_view(before: list[dict], after: list[dict]) -> dict:
    """
    O dia INTEIRO pronto pra tela, com o que mudou marcado alimento a
    alimento. Diferente de `diff_meals` (que lista só as alterações), aqui
    vem toda a dieta: a pessoa precisa ver o plano completo, não um extrato.

    Cada alimento carrega `kind` ("added" | "removed" | "increased" |
    "decreased" | None) e a quantidade anterior, pra UI colorir sem precisar
    cruzar duas listas. Alimentos removidos continuam na lista da refeição,
    marcados, senão sumiriam da tela sem explicação.

    Cada refeição e o dia trazem os totais ANTES e DEPOIS (kcal + macros).
    """
    before_by_id = {m["id"]: m for m in before}
    meals: list[dict] = []

    for meal_after in after:
        meal_before = before_by_id.get(meal_after["id"], {"foods": []})
        foods_before = {f["name"]: f for f in meal_before.get("foods", [])}
        foods: list[dict] = []

        for food in meal_after["foods"]:
            previous = foods_before.get(food["name"])
            if previous is None:
                kind = "added"
            else:
                delta = (food.get("grams") or 0) - (previous.get("grams") or 0)
                kind = (
                    "increased" if delta > _QTY_CHANGE_TOLERANCE_G
                    else "decreased" if delta < -_QTY_CHANGE_TOLERANCE_G
                    else None
                )
            foods.append({
                "name": food["name"],
                "quantity": food.get("quantity", ""),
                "calories": round(food["calories"], 1),
                "protein_g": round(food["protein_g"], 1),
                "carbs_g": round(food["carbs_g"], 1),
                "fat_g": round(food["fat_g"], 1),
                "kind": kind,
                "previous_quantity": (previous or {}).get("quantity", "") if kind in ("increased", "decreased") else "",
            })

        # Removidos ficam na lista (marcados) pra pessoa ver o que saiu.
        names_after = {f["name"] for f in meal_after["foods"]}
        for name, food in foods_before.items():
            if name not in names_after:
                foods.append({
                    "name": name, "quantity": food.get("quantity", ""),
                    "calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0,
                    "kind": "removed", "previous_quantity": "",
                })

        meals.append({
            "id": meal_after["id"],
            "name": meal_after["name"],
            "time": meal_after.get("time", ""),
            "before": _meal_macros(meal_before) if meal_before.get("foods") else
                      {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0},
            "after": _meal_macros(meal_after),
            "foods": foods,
        })

    return {
        "meals": meals,
        "macros_before": _day_macros(before),
        "macros_after": _day_macros(after),
    }


def _build_result(
    diet: dict, adjusted_meals: list[dict], targets: dict, headline: str,
    rebalanced: bool, had_adjustable: bool = False, adjustable_meal_ids: set[str] | None = None,
    near_ceiling_foods: list[str] | None = None, protein_poor_meals: list[str] | None = None,
) -> dict:
    before = _day_macros(diet["meals"])
    after = _day_macros(adjusted_meals)
    tgt = {
        "calories": round(targets["calories"]),
        "protein_g": round(targets["protein_g"]),
        "carbs_g": round(targets["carbs_g"]),
        "fat_g": round(targets["fat_g"]),
    }
    remaining_calories = round(tgt["calories"] - after["calories"])
    remaining_protein = round(tgt["protein_g"] - after["protein_g"])
    remaining_fat = round(tgt["fat_g"] - after["fat_g"])

    if rebalanced:
        adj = (
            "Ajustamos as quantidades das refeições seguintes para o dia bater a meta de "
            "calorias e ficar dentro de ~5% da meta de proteína."
        )
    elif had_adjustable:
        adj = "As refeições seguintes já estavam dentro da meta, nenhum ajuste de quantidade foi necessário."
    else:
        adj = "Não havia refeições seguintes para reajustar hoje, veja abaixo como o dia fechou."

    return {
        "adjusted_meals": adjusted_meals,
        "suggestion": f"{headline} {adj}",
        "macros_before": before,
        "macros_after": after,
        "targets": tgt,
        "remaining_calories": remaining_calories,
        "remaining_protein_g": remaining_protein,
        "remaining_fat_g": remaining_fat,
        # Alimentos que precisaram crescer perto do próprio teto de porção
        # pra fechar a meta (ver _cap_total_growth): sinal de que a quantidade
        # pode ter ficado pouco realista mesmo com a meta numérica batida,
        # usado por day_topup pra decidir se vale perguntar uma alternativa à IA.
        "near_ceiling_foods": sorted(set(near_ceiling_foods or [])),
        # Refeições cuja proteína ficou bem abaixo da própria fatia-alvo mesmo
        # depois de tudo (ver _apply_protein_ceiling_pass): geralmente porque
        # ela não tem NENHUM alimento proteico pra puxar via quantidade (ex:
        # só pão e fruta), só um alimento novo resolve, ver day_topup.
        "protein_poor_meals": sorted(set(protein_poor_meals or [])),
        "rebalanced": rebalanced,
        # se há refeição ajustável e a rota decidir que a diferença que sobrou
        # ainda é grande, ela pode pedir um "top-up" (adicionar/remover
        # alimento) pra IA nessas refeições, ver suggest_day_topup.
        "can_top_up": had_adjustable,
        "adjustable_meal_ids": sorted(adjustable_meal_ids or set()),
        # O que mudou de verdade, item a item (ver diff_meals): usado pela
        # explicação da IA e pela exibição do dia ajustado.
        "changes": diff_meals(diet["meals"], adjusted_meals),
    }


def _apply_deviation(
    diet: dict, meal: dict, skipped_names: list[str], new_foods: list[dict],
    adjustable_ids: set[str], targets: dict | None,
) -> dict:
    """
    Aplica um desvio na refeição por TROCA, não por descrição completa: os
    alimentos do plano cujo nome está em `skipped_names` saem, `new_foods`
    entra no lugar (pode ser vazio = "não comi nada no lugar"), e tudo mais
    que já estava na refeição permanece exatamente como estava, a pessoa só
    precisa dizer o que mudou, não descrever a refeição inteira de novo.
    """
    tgt = _targets(diet, targets)
    skipped_set = set(skipped_names)
    kept_foods = [f for f in meal["foods"] if f["name"] not in skipped_set]
    skipped_foods = [f for f in meal["foods"] if f["name"] in skipped_set]
    updated_foods = merge_foods(kept_foods + new_foods)

    skipped_kcal = sum(f["calories"] for f in skipped_foods)
    new_kcal = sum(f["calories"] for f in new_foods)
    delta_kcal = new_kcal - skipped_kcal

    replaced_meal = {**meal, "foods": updated_foods}
    meals = [replaced_meal if m["id"] == meal["id"] else m for m in diet["meals"]]
    adjusted_meals, rebalanced, had_adjustable, near_ceiling, protein_poor = _rebalance(
        meals, adjustable_ids, tgt, diet.get("original_meals"),
    )

    skipped_label = ", ".join(f["name"] for f in skipped_foods)
    new_label = ", ".join(f["name"] for f in new_foods)
    if skipped_foods and new_foods:
        headline = (
            f"Trocamos {skipped_label} por {new_label} em {meal['name']} "
            f"(diferença de {abs(round(delta_kcal))} kcal)."
        )
    elif skipped_foods and not new_foods:
        headline = f"Registramos que você não comeu {skipped_label} em {meal['name']} ({round(delta_kcal)} kcal)."
    elif new_foods:
        headline = f"Registramos {new_label} (~{round(new_kcal)} kcal) a mais em {meal['name']}."
    else:
        headline = f"Nenhuma mudança registrada em {meal['name']}."

    result = _build_result(diet, adjusted_meals, tgt, headline, rebalanced, had_adjustable, adjustable_ids, near_ceiling, protein_poor)
    result["matched_food"] = new_label or skipped_label
    result["match_confidence"] = "alta"
    result["delta_calories"] = round(delta_kcal, 1)
    return result


def apply_changes(
    diet: dict, changes: list[dict], already_eaten_ids: list[str] | None = None,
    targets: dict | None = None,
) -> dict:
    """
    Aplica VÁRIAS mudanças, em refeições diferentes, numa conta só.

    É o que as três funções manuais fazem uma de cada vez, generalizado: a
    pessoa pode dizer numa frase só que não comeu o pão do café, vai trocar o
    lanche e está sem azeite pro jantar. As trocas são todas aplicadas
    primeiro e o rebalanceamento roda UMA vez sobre o resultado, senão cada
    ajuste corrigiria o anterior e o dia ficaria distorcido.

    `changes`: [{"meal_id", "skipped_names": [...], "new_foods": [...]}].
    Refeições ajustáveis = todas as que não foram mencionadas em `changes` e
    que a pessoa ainda não comeu (`already_eaten_ids`), já que só essas ainda
    dá pra mexer.
    """
    tgt = _targets(diet, targets)
    touched_ids = {c["meal_id"] for c in changes if c.get("meal_id")}
    already_eaten = set(already_eaten_ids or [])

    meals = []
    total_delta = 0.0
    labels: list[str] = []
    for meal in diet["meals"]:
        change = next((c for c in changes if c.get("meal_id") == meal["id"]), None)
        if change is None:
            meals.append(meal)
            continue
        skipped_set = set(change.get("skipped_names") or [])
        new_foods = change.get("new_foods") or []
        kept = [f for f in meal["foods"] if f["name"] not in skipped_set]
        removed = [f for f in meal["foods"] if f["name"] in skipped_set]
        total_delta += sum(f["calories"] for f in new_foods) - sum(f["calories"] for f in removed)
        if removed and new_foods:
            labels.append(f"{', '.join(f['name'] for f in removed)} por {', '.join(f['name'] for f in new_foods)} em {meal['name']}")
        elif removed:
            labels.append(f"sem {', '.join(f['name'] for f in removed)} em {meal['name']}")
        elif new_foods:
            labels.append(f"{', '.join(f['name'] for f in new_foods)} a mais em {meal['name']}")
        meals.append({**meal, "foods": merge_foods(kept + new_foods)})

    adjustable_ids = {
        m["id"] for m in diet["meals"]
        if m["id"] not in touched_ids and m["id"] not in already_eaten
    }
    adjusted_meals, rebalanced, had_adjustable, near_ceiling, protein_poor = _rebalance(
        meals, adjustable_ids, tgt, diet.get("original_meals"),
    )

    headline = f"Registramos: {'; '.join(labels)}." if labels else "Nenhuma mudança registrada."
    result = _build_result(diet, adjusted_meals, tgt, headline, rebalanced, had_adjustable, adjustable_ids, near_ceiling, protein_poor)
    result["matched_food"] = None
    result["match_confidence"] = "alta"
    result["delta_calories"] = round(total_delta, 1)
    return result


def log_ate_different(
    diet: dict, skipped_names: list[str], new_foods: list[dict], meal_id: str | None, targets: dict | None = None,
) -> dict:
    meal = next((m for m in diet["meals"] if m["id"] == meal_id), None) or _pick_default_meal(diet, forward_looking=False)
    adjustable_ids = _meals_after(diet["meals"], meal["id"])
    return _apply_deviation(diet, meal, skipped_names, new_foods, adjustable_ids, targets)


def log_will_eat_different(
    diet: dict, skipped_names: list[str], new_foods: list[dict], meal_id: str | None,
    already_eaten_ids: list[str] | None = None, targets: dict | None = None,
) -> dict:
    """
    `already_eaten_ids`: refeições que a pessoa já comeu hoje (informado por
    ela, não dá pra inferir só pelo horário planejado) e por isso NÃO devem
    ser mexidas no reajuste. Todas as outras (menos a própria refeição sendo
    trocada) são ajustáveis, independente da ordem na lista.
    """
    meal = next((m for m in diet["meals"] if m["id"] == meal_id), None) or _pick_default_meal(diet, forward_looking=True)
    already_eaten = set(already_eaten_ids or [])
    adjustable_ids = {m["id"] for m in diet["meals"] if m["id"] not in already_eaten and m["id"] != meal["id"]}
    return _apply_deviation(diet, meal, skipped_names, new_foods, adjustable_ids, targets)


def log_missing_food(diet: dict, missing_food_name: str, meal_id: str, substitutes: list[dict], targets: dict | None = None) -> dict:
    meal = next((m for m in diet["meals"] if m["id"] == meal_id), None)
    if meal is None:
        raise ValueError("Refeição não encontrada")
    missing_food = next((f for f in meal["foods"] if f["name"] == missing_food_name), None)
    if missing_food is None:
        raise ValueError("Alimento não encontrado na refeição")

    tgt = _targets(diet, targets)
    substitutes_kcal = sum(f["calories"] for f in substitutes)
    delta_kcal = substitutes_kcal - missing_food["calories"]

    new_foods: list[dict] = []
    for f in meal["foods"]:
        if f["name"] == missing_food_name:
            new_foods.extend(substitutes)
        else:
            new_foods.append(f)
    updated_meal = {**meal, "foods": new_foods}
    meals = [updated_meal if m["id"] == meal["id"] else m for m in diet["meals"]]
    adjustable_ids = _meals_after(meals, meal["id"])
    adjusted_meals, rebalanced, had_adjustable, near_ceiling, protein_poor = _rebalance(
        meals, adjustable_ids, tgt, diet.get("original_meals"),
    )

    names = ", ".join(f["name"] for f in substitutes)
    headline = (
        f"Trocamos {missing_food['name']} por {names} em {meal['name']} "
        f"(diferença de {abs(round(delta_kcal))} kcal)."
    )
    result = _build_result(diet, adjusted_meals, tgt, headline, rebalanced, had_adjustable, adjustable_ids, near_ceiling, protein_poor)
    result["matched_food"] = names
    result["match_confidence"] = "alta"
    result["delta_calories"] = round(delta_kcal, 1)
    return result
