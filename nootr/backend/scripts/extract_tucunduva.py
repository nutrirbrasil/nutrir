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


def strip_leading_noise(tokens: list[str]) -> list[str]:
    """
    Descarta tokens de ruído de OCR (ex: "I" solto, "-" solto, às vezes os
    dois juntos: "- I 165,00...") antes do primeiro valor de verdade. Usado
    tanto na linha do alimento (depois do nome) quanto na linha de
    continuação, que tem exatamente o mesmo tipo de sujeira. Só avança
    enquanto o token for claramente ruído (não é "nd" nem número), ou for um
    "-"/"I" isolado bem curto; um "nd" já é um valor de coluna de verdade
    (não determinado), não ruído, então para ali.
    """
    offset = 0
    while offset < len(tokens):
        tok = tokens[offset]
        if parse_number(tok) is not None or tok.lower() == "nd":
            break
        if tok == "-" or len(tok) <= 2:
            offset += 1
            continue
        break
    return tokens[offset:]


def looks_like_continuation(line: str) -> list[str] | None:
    """
    Linha de continuação começa (a menos de ruído de OCR solto) com números
    (proteína, fibra...). Devolve os tokens já limpos, ou None se a linha
    ainda parece ser nome de alimento (texto real, não ruído de 1-2 chars).
    """
    tokens = line.split()
    if not tokens:
        return None
    cleaned = strip_leading_noise(tokens)
    # Ruído de OCR é sempre bem curto (1-3 chars); se sobrou muito texto
    # antes do primeiro número, é nome de alimento quebrando a linha, não
    # continuação.
    noise_len = sum(len(t) for t in tokens[:len(tokens) - len(cleaned)])
    if not cleaned or noise_len > 3:
        return None
    return cleaned


_GHOST_DIGIT_TOLERANCE_KCAL = 80.0


def correct_ghost_digit(rows: list[dict]) -> int:
    """
    Corrige o "1" fantasma grudado na frente da Energia (padrão de OCR visto
    na amostra: "570" virando "1570"), conferido contra a fórmula de Atwater
    (kcal = carb*4 + gordura*9 + proteína*4) calculada com os OUTROS valores
    da própria linha, que não têm esse problema. Só corrige quando o valor
    sem o "1" bate com Atwater dentro de uma tolerância generosa (nozes/
    oleaginosas têm mais gordura "não digerível" que o Atwater simples não
    captura, por isso a folga); fora disso mantém `suspect` pra revisão
    manual (ex: "Banha de porco", que legitimamente passa de 900 kcal/100g,
    é gordura quase pura).
    Muda `rows` in-place, devolve quantas linhas foram corrigidas.
    """
    corrected = 0
    for r in rows:
        if not r["suspect"] or r["kcal"] < 1000:
            continue
        atwater = (r["carbs_g"] or 0) * 4 + (r["fat_g"] or 0) * 9 + (r["protein_g"] or 0) * 4
        stripped = r["kcal"] - 1000
        if abs(stripped - atwater) <= _GHOST_DIGIT_TOLERANCE_KCAL:
            r["kcal"] = round(stripped, 2)
            r["suspect"] = False
            corrected += 1
    return corrected


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
                nums = strip_leading_noise(nums)
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
                    cont = looks_like_continuation(lines[i + lookahead])
                    if cont is not None:
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
                # óleo puro chega perto de 900); provável "1" fantasma
                # grudado no OCR (ver correct_ghost_digit no pós-processo).
                # Sinaliza em vez de aceitar calado ou corrigir sem checar.
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

    fixed = correct_ghost_digit(rows)

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["page", "name", "kcal", "carbs_g", "fat_g", "protein_g", "fiber_g", "suspect"])
        w.writeheader()
        w.writerows(rows)

    suspects = sum(1 for r in rows if r["suspect"])
    missing_protein = sum(1 for r in rows if r["protein_g"] is None)
    print(f"extraidos: {len(rows)}")
    print(f"  corrigidos (digito fantasma na energia): {fixed}")
    print(f"  suspeitos restantes (kcal > 900): {suspects}")
    print(f"  sem proteina: {missing_protein}")
    print(f"pulados (sem kcal parseavel): {len(skipped)}")
    for s in skipped[:15]:
        print("  skip:", s)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
