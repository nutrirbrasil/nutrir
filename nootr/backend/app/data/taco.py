"""
Carrega a Tabela TACO (4ª ed. revisada e ampliada, NEPA/UNICAMP) a partir do
CSV vendorizado em `taco.csv`.

Fonte: https://github.com/machine-learning-mocha/taco (formatados/alimentos.csv),
que redistribui os valores publicados em nepa.unicamp.br/taco. Baixado em 2026-07-03.
Um item foi conferido manualmente contra `nutrir/lib/taco-foods.ts` (Arroz tipo 1
cozido: 128 kcal, 2.5g proteína, 28.1g carboidrato, 0.2g gordura, 1.6g fibra,
1mg sódio), os valores batem exatamente.

597 alimentos. Nem todo alimento tem todos os nutrientes medidos na tabela
original (fibra em especial: ~39% dos itens não têm esse valor), por isso os
campos são Optional.
"""
import csv
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Optional

_CSV_PATH = Path(__file__).resolve().parent / "taco.csv"
_DISPLAY_CSV_PATH = Path(__file__).resolve().parent / "taco_display_names.csv"
_EXTRA_CSV_PATH = Path(__file__).resolve().parent / "taco_extra.csv"

# Detecta mudanças nos arquivos CSV pra invalidar cache automaticamente
_last_mtime = {"display": None, "extra": None, "taco": None}


def _check_file_changed() -> bool:
    """Retorna True se qualquer CSV foi modificado desde a última leitura."""
    changed = False

    if _DISPLAY_CSV_PATH.exists():
        mtime = _DISPLAY_CSV_PATH.stat().st_mtime
        if _last_mtime["display"] is not None and _last_mtime["display"] != mtime:
            changed = True
        _last_mtime["display"] = mtime

    if _EXTRA_CSV_PATH.exists():
        mtime = _EXTRA_CSV_PATH.stat().st_mtime
        if _last_mtime["extra"] is not None and _last_mtime["extra"] != mtime:
            changed = True
        _last_mtime["extra"] = mtime

    mtime = _CSV_PATH.stat().st_mtime
    if _last_mtime["taco"] is not None and _last_mtime["taco"] != mtime:
        changed = True
    _last_mtime["taco"] = mtime

    return changed


@dataclass(frozen=True)
class TacoFood:
    id: int
    category: str
    name: str
    display_name: str  # nome "bonito" para a UI (curado em taco_display_names.csv)
    kcal: Optional[float]
    protein_g: Optional[float]
    carbs_g: Optional[float]
    fat_g: Optional[float]
    fiber_g: Optional[float]
    sodium_mg: Optional[float]


def _parse_float(value: str) -> Optional[float]:
    value = value.strip()
    if not value or value == "NA":
        return None
    return float(value)


@lru_cache
def _load_display_names() -> dict[int, str]:
    """Mapa taco_id -> nome de exibição (editável em taco_display_names.csv)."""
    if not _DISPLAY_CSV_PATH.exists():
        return {}
    with open(_DISPLAY_CSV_PATH, encoding="utf-8") as f:
        return {int(row["taco_id"]): row["display"] for row in csv.DictReader(f)}


def load_display_names() -> dict[int, str]:
    """Wrapper público que invalida cache se CSV mudou."""
    if _check_file_changed():
        _load_display_names.cache_clear()
    return _load_display_names()


@lru_cache
def _load_extras() -> list[TacoFood]:
    """
    Itens curados que a TACO não cobre (ex: macarrão cozido), ids >= 9000.
    Editável em taco_extra.csv, revisável item a item.
    """
    if not _EXTRA_CSV_PATH.exists():
        return []
    with open(_EXTRA_CSV_PATH, encoding="utf-8") as f:
        return [
            TacoFood(
                id=int(row["id"]),
                category=row["category"],
                name=row["display"],
                display_name=row["display"],
                kcal=_parse_float(row["kcal"]),
                protein_g=_parse_float(row["protein_g"]),
                carbs_g=_parse_float(row["carbs_g"]),
                fat_g=_parse_float(row["fat_g"]),
                fiber_g=_parse_float(row["fiber_g"]),
                sodium_mg=_parse_float(row["sodium_mg"]),
            )
            for row in csv.DictReader(f)
        ]


def load_extras() -> list[TacoFood]:
    """Wrapper público que invalida cache se CSV mudou."""
    if _check_file_changed():
        _load_extras.cache_clear()
    return _load_extras()


# A fonte original da TACO tem uns poucos itens sem energia/macros medidos
# (ficam None, ver docstring do módulo). Pra alimentos raros isso é só uma
# lacuna sem impacto prático, mas "leite integral"/"leite desnatado UHT" são
# básicos frequentes em dieta e apareceriam com 0 kcal, o que é enganoso.
# Valores de referência nutricional padrão (não vêm da TACO, mas de tabelas
# de composição comuns) só pra esses casos de alto impacto, não editamos o
# CSV vendorizado.
_NUTRIENT_PATCHES: dict[int, dict[str, float]] = {
    457: {"kcal": 35.0, "protein_g": 3.4, "carbs_g": 4.9, "fat_g": 0.2},  # Leite, de vaca, desnatado, UHT
    458: {"kcal": 61.0, "protein_g": 2.9, "carbs_g": 4.3, "fat_g": 3.2},  # Leite, de vaca, integral
    450: {"kcal": 68.0, "protein_g": 2.6, "carbs_g": 9.5, "fat_g": 2.3},  # Iogurte, sabor abacaxi
}


@lru_cache
def _load_taco_foods_cached() -> list[TacoFood]:
    """Carrega a tabela completa (TACO + extras). Cacheado internamente."""
    display = load_display_names()
    with open(_CSV_PATH, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        foods = []
        for row in reader:
            food_id = int(row["Número do Alimento"])
            patch = _NUTRIENT_PATCHES.get(food_id, {})
            foods.append(TacoFood(
                id=food_id,
                category=row["Categoria do alimento"],
                name=row["Descrição dos alimentos"],
                display_name=display.get(food_id, row["Descrição dos alimentos"]),
                kcal=patch.get("kcal", _parse_float(row["Energia..kcal."])),
                protein_g=patch.get("protein_g", _parse_float(row["Proteína..g."])),
                carbs_g=patch.get("carbs_g", _parse_float(row["Carboidrato..g."])),
                fat_g=patch.get("fat_g", _parse_float(row["Lipídeos..g."])),
                fiber_g=_parse_float(row["Fibra.Alimentar..g."]),
                sodium_mg=_parse_float(row["Sódio..mg."]),
            ))
    return foods + load_extras()


def load_taco_foods() -> list[TacoFood]:
    """Wrapper público que invalida cache se qualquer CSV mudou."""
    if _check_file_changed():
        _load_taco_foods_cached.cache_clear()
    return _load_taco_foods_cached()
