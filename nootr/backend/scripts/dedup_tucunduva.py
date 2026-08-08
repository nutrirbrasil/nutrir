"""
Fase 2 do import da Tucunduva: compara cada item do staging
(tucunduva_staging.csv) com a TACO por nome, pra separar duplicata de
alimento novo antes de decidir o que vira taco_extra.csv de verdade.

As duas tabelas nomeiam diferente ("Arroz, tipo 1, cozido" na TACO vs "Arroz
branco (cozido)" na Tucunduva), então não dá pra comparar string exata: usa
similaridade de conjunto de palavras (Jaccard) sobre o nome normalizado
(mesma normalização de food_matcher.normalize, sem acento/pontuação).

Gera tucunduva_staging.csv com duas colunas novas:
- taco_match: nome da TACO mais parecido encontrado (vazio se nenhum bateu)
- taco_similarity: 0 a 1, quanto maior mais provável ser o mesmo alimento

Uso: python backend/scripts/dedup_tucunduva.py
(roda a partir de nootr/, lê/grava backend/app/data/tucunduva_staging.csv)
"""
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.app.data.taco import load_taco_foods
from backend.app.services.food_matcher import normalize

_STOPWORDS = {"de", "da", "do", "em", "com", "sem", "e", "a", "o", "1", "2"}


def tokenize(name: str) -> set[str]:
    return {t for t in normalize(name).split() if t and t not in _STOPWORDS}


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def main():
    staging_path = Path(__file__).resolve().parents[1] / "app" / "data" / "tucunduva_staging.csv"
    rows = list(csv.DictReader(open(staging_path, encoding="utf-8")))

    taco_foods = load_taco_foods()
    taco_tokens = [(f.name, tokenize(f.name)) for f in taco_foods]

    for r in rows:
        tokens = tokenize(r["name"])
        best_name, best_score = "", 0.0
        for taco_name, tset in taco_tokens:
            score = jaccard(tokens, tset)
            if score > best_score:
                best_name, best_score = taco_name, score
        r["taco_match"] = best_name
        r["taco_similarity"] = round(best_score, 3)

    fieldnames = list(rows[0].keys())
    with open(staging_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    likely_dup = sum(1 for r in rows if float(r["taco_similarity"]) >= 0.6)
    maybe_dup = sum(1 for r in rows if 0.35 <= float(r["taco_similarity"]) < 0.6)
    likely_unique = sum(1 for r in rows if float(r["taco_similarity"]) < 0.35)
    print(f"total: {len(rows)}")
    print(f"  provavel duplicata (similaridade >= 0.6): {likely_dup}")
    print(f"  duvidoso (0.35 a 0.6): {maybe_dup}")
    print(f"  provavelmente unico (< 0.35): {likely_unique}")


if __name__ == "__main__":
    main()
