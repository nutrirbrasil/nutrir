"""
Fase 3 do import da Tucunduva: junta os 3 CSVs revisados manualmente
(unique_candidates, gray_zone, likely_duplicate, ja filtrados a mao pelo
usuario pra sobrar so o que e de fato diferente da TACO) e gera as linhas
novas pro taco_extra.csv real, no formato que taco.py espera
(id,category,display,kcal,protein_g,carbs_g,fat_g,fiber_g,sodium_mg).

A Tucunduva nao tem sodio medido, entao sodium_mg fica sempre vazio (None).
Categoria e atribuida por palavra-chave no nome (heuristica, nao perfeita,
mesmo padrao "revisavel item a item" que ja vale pro taco_extra.csv inteiro).

Uso: python backend/scripts/build_taco_extra_from_tucunduva.py
(roda a partir de nootr/, le os 3 CSVs revisados, imprime prévia por
categoria; so grava em taco_extra.csv se rodado com --apply)
"""
import csv
import re
import sys
from pathlib import Path

_DATA_DIR = Path(__file__).resolve().parents[1] / "app" / "data"
_REVIEWED_FILES = [
    "tucunduva_unique_candidates.csv",
    "tucunduva_gray_zone.csv",
    "tucunduva_likely_duplicate.csv",
]
_EXTRA_PATH = _DATA_DIR / "taco_extra.csv"

# Renomeia manualmente os poucos itens com nome igual mas valores diferentes
# (variantes que a OCR nao conseguiu diferenciar no texto original).
_RENAME_ON_DUPLICATE = {
    ("Farinha de aveia", 390.0, 60.0, 10.0): "Farinha de aveia",
    ("Farinha de aveia", 390.0, 61.0, 0.0): "Farinha de aveia (sem gordura)",
    ("Molho de tomate", 35.0, 7.7, 1.0): "Molho de tomate (caseiro)",
    ("Molho de tomate", 39.47, 5.27, 2.08): "Molho de tomate (industrializado)",
    ("Suco de fruta sem açúcar", 22.07, 5.56, 0.19): "Suco de fruta sem açúcar",
    ("Suco de fruta sem açúcar", 28.02, 6.3, 0.38): "Suco de fruta sem açúcar (integral)",
}

_CATEGORY_KEYWORDS: list[tuple[str, list[str]]] = [
    ("Pescados e frutos do mar", [
        "peixe", "salmao", "atum", "sardinha", "merluza", "tilapia", "bacalhau",
        "camarao", "lula", "polvo", "mexilhao", "ostra", "marisco", "corvina",
        "pescada", "robalo", "linguado", "cacao", "traira", "tainha", "arenque",
        "caviar", "siri", "sururu", "badejo", "dourado", "pintado", "surubim",
        "namorado",
    ]),
    ("Ovos e derivados", ["ovo", "ovos", "clara de ovo", "gema"]),
    ("Leite e derivados", [
        "leite", "queijo", "iogurte", "requeijao", "creme de leite", "ricota",
        "mussarela", "mucarela", "coalhada", "nata", "cottage", "parmesao",
        "prato", "provolone", "cream cheese", "catupiry", "chantili",
        "chantilly", "bebida lactea", "danone", "chamyto", "yakult", "iogurt",
    ]),
    ("Carnes e derivados", [
        "carne", "bovin", "frango", "peito de", "coxa", "sobrecoxa", "lombo",
        "bacon", "linguica", "salsicha", "presunto", "mortadela", "hamburguer",
        "costela", "picanha", "alcatra", "patinho", "cupim", "figado", "peru",
        "pato", "carneiro", "porco", "suino", "salame", "file mignon", "musculo",
        "acem", "maminha", "fraldinha", "coracao", "moela", "toucinho",
        "coelho", "buchada", "chuleta", "javali", "codorna", "codorniz",
        "paio", "copa", "pepperoni", "carneseca", "carne seca", "charque",
        "jerked",
    ]),
    ("Nozes e sementes", [
        "castanha", "amendoim", "amendoa", "noz", "nozes", "semente", "girassol",
        "chia", "linhaca", "gergelim", "pistache", "macadamia", "amendocrem",
    ]),
    ("Leguminosas e derivados", [
        "feijao", "lentilha", "grao-de-bico", "grao de bico", "ervilha seca",
        "soja", "fava", "ervilha",
    ]),
    ("Gorduras e óleos", ["oleo", "azeite", "margarina", "banha", "gordura vegetal", "creme vegetal"]),
    ("Produtos açucarados", [
        "acucar", "doce", "mel", "geleia", "chocolate", "bala", "pirulito",
        "sorvete", "pudim", "brigadeiro", "bolo", "torta doce", "sobremesa",
        "goiabada", "marmelada", "cocada", "paçoca", "pacoca", "bombom",
        "beijinho", "chocotone", "colomba pascal", "panetone", "amandita",
        "wafer", "trufa", "mousse", "gelatina", "flan", "sonho", "rosquinha",
        "sagu",
    ]),
    ("Bebidas (alcoólicas e não alcoólicas)", [
        "suco", "refrigerante", "agua", "cha ", "cha de", "cafe", "cerveja",
        "vinho", "vodka", "energetico", "isotonico", "achocolatado", "licor",
        "whisky", "drink", "caipirinha", "coca-cola", "coca cola", "cidra",
        "guarana", "tang",
    ]),
    ("Cereais e derivados", [
        "arroz", "macarrao", "massa", "pao", "farinha", "aveia", "trigo",
        "milho", "cuscuz", "granola", "cereal", "biscoito", "bolacha",
        "torrada", "tapioca", "polenta", "canjica", "quinoa", "centeio",
        "bisnaguinha", "all bran", "sucrilhos", "corn flakes",
    ]),
    ("Verduras, hortaliças e derivados", [
        "alface", "couve", "espinafre", "brocolis", "tomate", "cenoura",
        "abobrinha", "berinjela", "pepino", "repolho", "rucula", "agriao",
        "vagem", "chuchu", "beterraba", "cebola", "pimentao", "batata",
        "abobora", "mandioca", "aipim", "quiabo", "acelga", "salsa", "coentro",
        "alcachofra", "aspargo", "nabo", "rabanete", "inhame", "cara",
    ]),
    ("Frutas e derivados", [
        "banana", "maca", "laranja", "manga", "mamao", "melancia", "melao",
        "uva", "morango", "abacaxi", "pera", "pessego", "kiwi", "acai",
        "acerola", "goiaba", "caju", "coco", "limao", "tangerina", "mexerica",
        "abacate", "avocado", "ameixa", "figo", "jaca", "maracuja", "graviola",
        "carambola", "cereja", "framboesa", "amora", "romã", "roma", "pitaya",
    ]),
    ("Alimentos preparados", [
        "lasanha", "empadao", "estrogonofe", "estrogonof", "risoto", "sanduiche",
        "pizza", "torta salgada", "salada de", "prato feito", "feijoada",
        "strogonoff", "escondidinho", "yakisoba", "kibe", "esfirra", "coxinha",
        "pastel", "quiche", "big mac", "mc donald", "burguer king", "cheeseburguer",
        "cheseburguer", "cachorro quente", "bacalhoada", "casquinha de siri",
        "nuggets", "empanado",
    ]),
    ("Outros alimentos industrializados", [
        "cheetos", "elma chips", "salgadinho", "chips", "doritos", "fandangos",
        "temperado", "maionese", "ketchup", "catchup", "mostarda", "molho ingles",
        "molho shoyu", "shoyu", "caldo de", "extrato de tomate", "sazon",
        "vinagrete",
    ]),
]


def _strip_accents(s: str) -> str:
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def guess_category(name: str) -> str:
    norm = _strip_accents(name).lower()
    for category, keywords in _CATEGORY_KEYWORDS:
        for kw in keywords:
            if kw in norm:
                return category
    return "Miscelâneas"


def parse_float(value: str) -> float:
    """Aceita tanto '11.74' quanto '11,74' (edicao manual no Excel/Cursor pode
    ter trocado o separador decimal pra virgula)."""
    return float(value.strip().replace(",", "."))


def resolve_display_name(name: str, kcal: float, carbs: float, fat: float) -> str:
    key = (name, kcal, carbs, fat)
    return _RENAME_ON_DUPLICATE.get(key, name)


def load_reviewed_rows() -> list[dict]:
    rows = []
    for fname in _REVIEWED_FILES:
        path = _DATA_DIR / fname
        with open(path, encoding="utf-8") as f:
            rows.extend(csv.DictReader(f))
    return rows


def next_id() -> int:
    with open(_EXTRA_PATH, encoding="utf-8") as f:
        ids = [int(row["id"]) for row in csv.DictReader(f)]
    return max(ids) + 1 if ids else 9000


def main(apply: bool):
    rows = load_reviewed_rows()
    start_id = next_id()

    new_rows = []
    for i, r in enumerate(rows):
        name = r["name"].strip()
        kcal = parse_float(r["kcal"])
        carbs = parse_float(r["carbs_g"]) if r["carbs_g"].strip() else 0.0
        fat = parse_float(r["fat_g"]) if r["fat_g"].strip() else 0.0
        protein = r["protein_g"].strip()
        fiber = r["fiber_g"].strip()
        display = resolve_display_name(name, kcal, carbs, fat)
        category = guess_category(display)
        new_rows.append({
            "id": start_id + i,
            "category": category,
            "display": display,
            "kcal": str(kcal),
            "protein_g": str(parse_float(protein)) if protein else "",
            "carbs_g": str(carbs),
            "fat_g": str(fat),
            "fiber_g": str(parse_float(fiber)) if fiber else "",
            "sodium_mg": "",
        })

    from collections import Counter
    cat_counts = Counter(r["category"] for r in new_rows)
    print(f"total de itens novos: {len(new_rows)} (ids {start_id} a {start_id + len(new_rows) - 1})")
    print("por categoria:")
    for cat, count in cat_counts.most_common():
        print(f"  {cat}: {count}")

    misc = [r["display"] for r in new_rows if r["category"] == "Miscelâneas"]
    print(f"\nsem categoria clara ({len(misc)}), foram pra Miscelâneas:")
    for name in misc[:40]:
        print(f"  {name}")
    if len(misc) > 40:
        print(f"  ... e mais {len(misc) - 40}")

    if apply:
        with open(_EXTRA_PATH, "a", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["id", "category", "display", "kcal", "protein_g", "carbs_g", "fat_g", "fiber_g", "sodium_mg"])
            w.writerows(new_rows)
        print(f"\ngravado em {_EXTRA_PATH}")
    else:
        print("\n(dry-run, rode com --apply pra gravar de verdade em taco_extra.csv)")


if __name__ == "__main__":
    main(apply="--apply" in sys.argv)
