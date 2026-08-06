"""
Extração da Tabela Tucunduva (Philippi, "Tabela de Composição de Alimentos:
suporte para decisão nutricional"), a partir de um PDF fornecido pelo usuário
(fonte legal confirmada por ele, arquivo em nootr/local-assets/, fora do git,
ver .gitignore). O texto do PDF é OCR degradado em partes (acentos quebrados,
dígitos trocados nas colunas mais à direita), então esse script só extrai o
que dá pra confiar pro schema do Nootr (TacoFood): nome + kcal/carboidrato/
gordura (3 primeiros números da linha do alimento) + proteína/fibra (2
primeiros números da linha de continuação), que são os tokens mais bem
preservados pelo OCR.

Gera backend/app/data/tucunduva_staging.csv, um CSV de STAGING, NÃO plugado
em taco.py/load_taco_foods(). Antes de qualquer merge com a base viva
(taco_extra.csv):
1. revisar as linhas com suspect=True (kcal > 900/100g, provável dígito
   fantasma do OCR, ex: "570" virando "1570");
2. preencher/checar as linhas sem protein_g (a linha de continuação não foi
   reconhecida, geralmente porque o nome do alimento quebrou em 2 linhas);
3. comparar por nome com backend/app/data/taco.csv e remover as duplicatas
   (a Tucunduva cobre muito alimento que a TACO já tem).

Rodar de novo (se o PDF mudar): python backend/scripts/extract_tucunduva.py
nootr/local-assets/Tucunduva.pdf backend/app/data/tucunduva_staging.csv
"""
import csv
import re
import sys

import pdfplumber

NUM_RE = re.compile(r"^-?\d+[.,]\d+$|^nd$|^-$", re.IGNORECASE)


def parse_number(tok: str) -> float | None:
    if tok.lower() in ("nd", "-"):
        return None
    tok = tok.replace(".", "").replace(",", ".") if tok.count(",") == 1 and tok.count(".") <= 1 else tok
    try:
        return float(tok.replace(",", "."))
    except ValueError:
        return None


def split_name_and_numbers(line: str) -> tuple[str, list[str]] | None:
    tokens = line.split()
    if not tokens:
        return None
    name_tokens = []
    i = 0
    while i < len(tokens) and not NUM_RE.match(tokens[i]):
        name_tokens.append(tokens[i])
        i += 1
    if not name_tokens or i >= len(tokens):
        return None
    return " ".join(name_tokens), tokens[i:]


def looks_like_continuation(line: str) -> bool:
    """Linha de continuação começa direto com números (proteína etc)."""
    tokens = line.split()
    if not tokens:
        return False
    return bool(NUM_RE.match(tokens[0]))


def main(pdf_path: str, out_path: str, start_page: int = 9):
    rows = []
    skipped = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_idx in range(start_page, len(pdf.pages)):
            text = pdf.pages[page_idx].extract_text() or ""
            lines = [l.strip() for l in text.split("\n") if l.strip()]
            i = 0
            while i < len(lines):
                line = lines[i]
                parsed = split_name_and_numbers(line)
                if not parsed:
                    i += 1
                    continue
                name, nums = parsed
                # Algumas linhas (itens industrializados) têm um "-" solto
                # antes da Energia (provável artefato de OCR numa coluna
                # anterior ausente nesses itens); se o 1º token não é um
                # número de verdade, tenta a partir do próximo.
                offset = 0
                while offset < len(nums) and parse_number(nums[offset]) is None and nums[offset] not in ("nd", "-"):
                    offset += 1
                if nums[offset:offset + 1] == ["-"]:
                    offset += 1
                nums = nums[offset:]
                if len(nums) < 3:
                    i += 1
                    continue
                kcal = parse_number(nums[0])
                carb = parse_number(nums[1])
                fat = parse_number(nums[2])
                protein = fiber = None
                # O nome às vezes quebra pra uma 2ª linha antes da linha de
                # continuação (proteína/fibra/...); olha até 2 linhas à
                # frente, pulando as que ainda são texto (parte do nome).
                consumed = 1
                for lookahead in (1, 2):
                    if i + lookahead >= len(lines):
                        break
                    if looks_like_continuation(lines[i + lookahead]):
                        cont = lines[i + lookahead].split()
                        if len(cont) >= 1:
                            protein = parse_number(cont[0])
                        if len(cont) >= 2:
                            fiber = parse_number(cont[1])
                        consumed = lookahead + 1
                        break
                i += consumed
                if kcal is None:
                    skipped.append((page_idx, name, nums[:3]))
                    continue
                # Kcal >900/100g é implausível pra quase todo alimento (só
                # óleo puro chega perto de 900); sinaliza como suspeito em vez
                # de aceitar calado, é um padrão de corrupção de OCR visto na
                # amostra (ex: "570" virando "1570").
                suspect = kcal is not None and kcal > 900
                rows.append({
                    "page": page_idx,
                    "name": name,
                    "kcal": kcal,
                    "carbs_g": carb,
                    "fat_g": fat,
                    "protein_g": protein,
                    "fiber_g": fiber,
                    "suspect": suspect,
                })

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["page", "name", "kcal", "carbs_g", "fat_g", "protein_g", "fiber_g", "suspect"])
        w.writeheader()
        w.writerows(rows)

    suspects = sum(1 for r in rows if r["suspect"])
    missing_protein = sum(1 for r in rows if r["protein_g"] is None)
    print(f"extraidos: {len(rows)}")
    print(f"  suspeitos (kcal > 900): {suspects}")
    print(f"  sem proteina: {missing_protein}")
    print(f"pulados (sem kcal parseavel): {len(skipped)}")
    for s in skipped[:15]:
        print("  skip:", s)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
