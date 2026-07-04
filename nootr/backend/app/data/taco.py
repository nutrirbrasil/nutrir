"""
Carrega a Tabela TACO (4ª ed. revisada e ampliada, NEPA/UNICAMP) a partir do
CSV vendorizado em `taco.csv`.

Fonte: https://github.com/machine-learning-mocha/taco (formatados/alimentos.csv),
que redistribui os valores publicados em nepa.unicamp.br/taco. Baixado em 2026-07-03.
Um item foi conferido manualmente contra `nutrir/lib/taco-foods.ts` (Arroz tipo 1
cozido: 128 kcal, 2.5g proteína, 28.1g carboidrato, 0.2g gordura, 1.6g fibra,
1mg sódio) — os valores batem exatamente.

597 alimentos. Nem todo alimento tem todos os nutrientes medidos na tabela
original (fibra em especial: ~39% dos itens não têm esse valor) — por isso os
campos são Optional.
"""
import csv
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Optional

_CSV_PATH = Path(__file__).resolve().parent / "taco.csv"
_DISPLAY_CSV_PATH = Path(__file__).resolve().parent / "taco_display_names.csv"


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


@lru_cache
def load_taco_foods() -> list[TacoFood]:
    """Lê e cacheia a tabela completa na primeira chamada."""
    display = _load_display_names()
    with open(_CSV_PATH, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return [
            TacoFood(
                id=int(row["Número do Alimento"]),
                category=row["Categoria do alimento"],
                name=row["Descrição dos alimentos"],
                display_name=display.get(
                    int(row["Número do Alimento"]), row["Descrição dos alimentos"]
                ),
                kcal=_parse_float(row["Energia..kcal."]),
                protein_g=_parse_float(row["Proteína..g."]),
                carbs_g=_parse_float(row["Carboidrato..g."]),
                fat_g=_parse_float(row["Lipídeos..g."]),
                fiber_g=_parse_float(row["Fibra.Alimentar..g."]),
                sodium_mg=_parse_float(row["Sódio..mg."]),
            )
            for row in reader
        ]
