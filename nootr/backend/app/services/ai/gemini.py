"""
Adapter mínimo do Google Gemini (grátis para testes).

Usa a API REST via httpx (já é dependência), sem SDK pesado, e força saída
em JSON estruturado com `responseSchema`. Faz só o parsing de linguagem; nada
de macros ou TACO aqui.
"""
import json

import httpx

from backend.app.config import get_settings
from backend.app.services.ai import AIError

_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

# Dialeto de schema do Gemini (tipos em MAIÚSCULAS).
_SCHEMA = {
    "type": "ARRAY",
    "items": {
        "type": "OBJECT",
        "properties": {
            "name": {"type": "STRING"},
            "quantity": {"type": "STRING"},
        },
        "required": ["name", "quantity"],
    },
}


# Cópia de _SCHEMA + "dish_name", só usada no fluxo de importação de doc
# (_DIET_DOC_SCHEMA). NÃO reaproveita _SCHEMA porque esse é usado por outros
# prompts (_CONVERSE_SCHEMA, _WILDCARD_SCHEMA, etc.) que não precisam desse
# campo, ver find_food/DishReviewModal no frontend, que usa "dish_name" pra
# agrupar os ingredientes de um mesmo prato composto e oferecer "salvar como
# receita" antes de gravar a dieta.
_DIET_DOC_FOOD_SCHEMA = {
    "type": "ARRAY",
    "items": {
        "type": "OBJECT",
        "properties": {
            "name": {"type": "STRING"},
            "quantity": {"type": "STRING"},
            "dish_name": {"type": "STRING"},
        },
        "required": ["name", "quantity"],
    },
}

_DIET_SCHEMA = {
    "type": "ARRAY",
    "items": {
        "type": "OBJECT",
        "properties": {
            "meal": {"type": "STRING"},
            "time": {"type": "STRING"},
            "foods": _DIET_DOC_FOOD_SCHEMA,
        },
        "required": ["meal", "foods"],
    },
}


def _generate_from_contents(contents: list[dict], schema: dict | None, system_instruction: str | None = None) -> str:
    """Chamada base ao Gemini (multi-turno); devolve o texto do candidato."""
    settings = get_settings()
    if not settings.gemini_api_key:
        raise AIError("Gemini não configurado: defina GEMINI_API_KEY em nootr/.env")

    gen_config = {"temperature": 0.2}
    if schema is not None:
        gen_config["responseMimeType"] = "application/json"
        gen_config["responseSchema"] = schema

    body: dict = {"contents": contents, "generationConfig": gen_config}
    if system_instruction:
        body["systemInstruction"] = {"parts": [{"text": system_instruction}]}

    url = _ENDPOINT.format(model=settings.gemini_model)
    try:
        resp = httpx.post(url, params={"key": settings.gemini_api_key}, json=body, timeout=30.0)
    except httpx.HTTPError as exc:
        raise AIError(f"Falha de rede ao chamar o Gemini: {exc}") from exc
    if resp.status_code >= 300:
        raise AIError(f"Gemini {resp.status_code}: {resp.text[:300]}")
    try:
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as exc:
        raise AIError(f"Resposta inesperada do Gemini: {exc}") from exc


def _generate(prompt: str, schema: dict | None) -> str:
    """Chamada base ao Gemini (turno único); devolve o texto do candidato."""
    return _generate_from_contents([{"parts": [{"text": prompt}]}], schema)


# Regra de decomposição de alimentos, compartilhada entre a leitura de PDF
# (_DIET_DOC_PROMPT) e o "Descrever com IA" de desvios (_CONVERSE_SYSTEM).
# Ficava só no primeiro; um prato composto citado num desvio (ex: "comi uma
# crepioca no lugar do pão") não era decomposto porque essa regra não existia
# no outro prompt. Um lugar só evita essa divergência de novo.
_FOOD_DECOMPOSITION_RULES = """- "quantity" é SÓ a medida caseira (número + unidade: xícara, colher, fatia, \
unidade, concha, copo, gramas). NUNCA misture um adjetivo de preparo dentro dela (ex: "1 xícara de maçã \
picada": quantity é "1 xícara", NUNCA "1 xícara picada", "picada" não é medida, é forma de cortar). Se o \
preparo for nutricionalmente relevante (cru vs cozido, por exemplo), ele entra no nome do alimento, nunca \
na quantidade.
- NUNCA junte dois alimentos distintos no mesmo nome de item, cada item é sempre um único alimento, pra \
casar corretamente com a tabela nutricional. Isso vale tanto pra "e" quanto pra "com" quando os dois lados \
são alimentos de verdade (não um é preparo/complemento do outro): "alface e tomate" -> dois itens, "alface" \
e "tomate". "café com leite" -> dois itens, "café" e "leite" (NÃO "café" sozinho, o leite é metade das \
calorias da bebida). "mostarda com mel" -> dois itens, "mostarda" e "mel". "pão com manteiga" -> dois \
itens, "pão" e "manteiga". "ovo mexido no azeite" -> dois itens, "ovo mexido" e "azeite" (entrou como \
ingrediente de preparo, não só tempero leve, ver regra de óleos/gorduras abaixo). Releia cada alimento \
perguntando "isso é UM alimento ou DOIS numa frase só?" antes de decidir.
- Se um alimento for um PRATO PRONTO/COMPOSTO que normalmente reúne vários ingredientes-base (ex: canja de \
galinha, sopa, estrogonofe, feijoada, torta salgada, VITAMINA/vitamina de frutas, hambúrguer/x-burguer/x- \
salada/x-tudo, sanduíche, cachorro-quente, crepioca, tapioca recheada, omelete recheado, panqueca recheada) \
em vez de um ingrediente único, DECOMPONHA-O nos ingredientes principais estimados:
  * "canja de galinha" -> frango desfiado, arroz ou macarrão, cenoura, batata.
  * "vitamina de frutas"/"vitamina de banana" -> leite, a(s) fruta(s) citada(s), e aveia também SE o texto \
mencionar aveia. "vitamina" aqui NUNCA significa a "Mistura para vitamina" industrializada (produto à base \
de trigo/cevada/aveia), é sempre a bebida caseira batida de fruta com leite.
  * "hambúrguer" (o sanduíche, não só a carne) -> pão de hambúrguer, carne de hambúrguer, queijo, salada, \
óleo/maionese, NÃO duplique a carne como dois itens (nunca "carne moída" E "carne de hambúrguer" juntos: \
é UM disco de carne só).
  * "sanduíche natural"/sanduíche sem mais detalhe -> "pão de forma" (padrão de sanduíche natural no \
Brasil, só use outro tipo se o texto nomear um específico, ex: "pão sírio", "pão integral"), o recheio \
citado (ex: "isca de carne", "atum", "frango desfiado") e CADA complemento/molho citado como item separado \
(ex: "salada crua" -> item "salada"; "mostarda com mel" -> dois itens, "mostarda" e "mel"; "maionese" -> \
item próprio).
  * "crepioca" -> ovo e goma de tapioca (ou polvilho azedo), mais o recheio citado como item(ns) \
separado(s) (ex: "crepioca de frango com queijo" -> + frango desfiado + queijo). Sem recheio especificado, \
só ovo + goma de tapioca.
  * "tapioca" sozinha, sem recheio citado, é o item único já conhecido (goma de tapioca simples), só \
decomponha em ovo/recheio se o texto citar um recheio (ex: "tapioca de queijo" -> goma de tapioca + queijo).
  Cada ingrediente decomposto vira um item separado, com uma quantidade proporcional razoável para uma \
porção do prato/copo/sanduíche. Não liste o prato pronto como um único item, a tabela nutricional (TACO) \
não tem preparações prontas, só ingredientes crus/básicos. "Salada" sozinha (sem listar quais vegetais) \
vira só o item genérico "salada", nunca "salada com maionese" nem uma lista inventada de vegetais.
- TEMPEROS/CONDIMENTOS LEVES (açafrão, orégano, sal, pimenta, alho, cebola em pequena quantidade, ervas, \
etc.) usados só pra temperar NÃO viram item separado, têm calorias desprezíveis e "casam errado" se \
listados sozinhos. Ignore-os, ou deixe-os como parte do nome do alimento principal (ex: "peito de frango \
com açafrão" continua um item só). ÓLEOS E GORDURAS (azeite, óleo, manteiga, margarina, banha), ao \
contrário, SEMPRE viram item separado mesmo em pouca quantidade, têm impacto real em gordura/calorias \
(ex: "ovo mexido no azeite" -> "ovo mexido" + "azeite", quantity "1 colher de chá" se não disser quanto)."""


_DIET_DOC_PROMPT = """Você recebe o texto (convertido em Markdown) de um documento, PDF, Word ou \
Excel, com uma dieta montada por um(a) nutricionista para um(a) paciente, em português. Se vier de \
uma planilha Excel, células vazias de uma tabela aparecem como "NaN" no texto, trate isso como \
célula vazia (ex: numa linha de tabela em que "Refeição" está "NaN", significa que é a mesma \
refeição da linha anterior), nunca como um alimento ou valor de verdade. Extraia TRÊS coisas:

1. Os CARDÁPIOS do documento, em "menus". Na maioria das vezes há só UM cardápio (um conjunto de \
refeições que vale pra dieta inteira), nesse caso "menus" tem um único item. Mas às vezes o \
documento traz MAIS DE UM cardápio distinto (ex: "dia de treino" / "dia de descanso", "opção 1" / \
"opção 2", um cardápio de segunda a sexta e outro de fim de semana). Nesse caso, cada um vira um \
item separado em "menus", cada um com:
   - "label": um nome curto pro cardápio, se o documento der um (ex: "Dia de treino"). Se não der \
nome, deixe vazio.
   - "days": os dias da semana em que ESSE cardápio específico deve ser usado, array de inteiros, \
0=segunda, 1=terça, 2=quarta, 3=quinta, 4=sexta, 5=sábado, 6=domingo. Preencha sempre que o \
documento amarrar esse cardápio a dia(s) específico(s), incluindo quando isso vier do NOME/RÓTULO \
da coluna ou seção (ex: se o documento é uma tabela com uma coluna "Segunda-feira" e outra \
"Terça-feira", cada coluna vira um menu separado com "days": [0] e "days": [1] respectivamente, \
NÃO deixe vazio só porque a associação veio do cabeçalho da coluna em vez de uma frase explícita). \
"Final de semana"/"fim de semana" = [5, 6]. "Dias de treino: segunda, quarta e sexta" = [0, 2, 4]. \
Só deixe "days" como array vazio quando o cardápio genuinamente vale pra semana toda ou o documento \
não amarra a nenhum dia específico.
   - "meals": as refeições desse cardápio, em ordem, com horário e os alimentos de cada uma. Regras \
importantes:
     * "time": SOMENTE se o documento disser um horário explícito para a refeição (ex: "08:00", \
"às 12h"), extraia em HH:MM. Se o documento NÃO disser um horário pra essa refeição, devolva "time" \
como string vazia, NÃO estime, invente ou copie o horário de outra refeição. O app já tem horários \
padrão por tipo de refeição para quando o documento não especifica.
     * NUNCA invente alimentos, e NUNCA misture alimentos de uma refeição em outra, cada alimento \
pertence exclusivamente à refeição em que o documento o lista. Se o layout da tabela for confuso, \
releia com cuidado a qual refeição cada linha pertence antes de decidir.
{{RULES}}
     * "dish_name": preencha SÓ quando esse item de comida for resultado de você ter DECOMPOSTO um \
prato composto (ver regra de decomposição acima), coloque o nome original do prato tal como o \
documento o descreveu (ex: "Canja de galinha"), usando o MESMO texto exato em TODOS os ingredientes \
que vieram dessa mesma decomposição (pra o app conseguir agrupá-los de volta). Deixe "dish_name" como \
string vazia para qualquer item que já era um alimento simples no documento (não decomposto).

2. Qualquer contexto sobre o paciente que o documento carregue, em geral escrito como observações, \
notas de rodapé ou parênteses do(a) nutricionista:
   - "allergies": alergias ou restrições alimentares mencionadas (ex: "sem lactose", "alérgico a \
camarão").
   - "dislikes": alimentos que o paciente não gosta ou pediu para evitar.
   - "likes": alimentos que o paciente gosta ou prefere.
   - "notes": um resumo curto (2-4 frases) de qualquer outra orientação relevante, especialmente \
substituições que a nutricionista já sugeriu para esse paciente (ex: "pode trocar o arroz por \
batata-doce", "evitar frituras à noite"). Se não houver nada relevante, devolva string vazia.

3. Metas nutricionais diárias da dieta, se o documento as mencionar explicitamente (em "targets"):
   - "daily_calories": total de calorias diárias (ex: "dieta de 2000 kcal", "VET: 1800 kcal").
   - "protein_pct"/"carbs_pct"/"fat_pct": percentual de cada macro sobre as calorias, se explícito \
(ex: "40% carboidrato, 30% proteína, 30% gordura").
   - Se NÃO houver percentual, mas houver o TOTAL de gramas diárias de cada macro declarado à parte \
da lista de alimentos (ex: "meta diária: 150g de proteína, 200g de carboidrato, 60g de gordura"), \
preencha "protein_g"/"carbs_g"/"fat_g" com esses totais.
   - Não invente nem calcule nada aqui, deixe de fora (não inclua a chave) qualquer valor que não \
esteja explícito no documento.

Se o documento não mencionar nada sobre alergias/gostos/notas/metas, devolva listas vazias, notes="" \
e "targets" vazio ({{}}).

Texto do PDF:
{text}"""

_DIET_DOC_PROMPT = _DIET_DOC_PROMPT.replace("{{RULES}}", _FOOD_DECOMPOSITION_RULES)

_MENU_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "label": {"type": "STRING"},
        "days": {"type": "ARRAY", "items": {"type": "INTEGER"}},
        "meals": _DIET_SCHEMA,
    },
    "required": ["meals"],
}

_DIET_DOC_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "menus": {"type": "ARRAY", "items": _MENU_SCHEMA},
        "preferences": {
            "type": "OBJECT",
            "properties": {
                "allergies": {"type": "ARRAY", "items": {"type": "STRING"}},
                "dislikes": {"type": "ARRAY", "items": {"type": "STRING"}},
                "likes": {"type": "ARRAY", "items": {"type": "STRING"}},
                "notes": {"type": "STRING"},
            },
            "required": ["allergies", "dislikes", "likes", "notes"],
        },
        "targets": {
            "type": "OBJECT",
            "properties": {
                "daily_calories": {"type": "NUMBER"},
                "protein_pct": {"type": "NUMBER"},
                "carbs_pct": {"type": "NUMBER"},
                "fat_pct": {"type": "NUMBER"},
                "protein_g": {"type": "NUMBER"},
                "carbs_g": {"type": "NUMBER"},
                "fat_g": {"type": "NUMBER"},
            },
        },
    },
    "required": ["menus", "preferences"],
}


def parse_diet_document(text: str) -> dict:
    raw = _generate(_DIET_DOC_PROMPT.replace("{text}", text), _DIET_DOC_SCHEMA)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise AIError(f"JSON inválido do Gemini: {exc}") from exc

    menus = []
    for menu_raw in data.get("menus", []) or []:
        meals = []
        for m in menu_raw.get("meals", []) or []:
            name = str(m.get("meal", "")).strip()
            foods = []
            for f in m.get("foods", []) or []:
                fname = str(f.get("name", "")).strip()
                fqty = str(f.get("quantity", "")).strip() or "1 porção"
                fdish = str(f.get("dish_name", "")).strip()
                if fname:
                    foods.append({"name": fname, "quantity": fqty, "dish_name": fdish})
            if name and foods:
                meals.append({"meal": name, "time": str(m.get("time", "")).strip(), "foods": foods})
        if not meals:
            continue
        days = sorted({int(d) for d in (menu_raw.get("days") or []) if isinstance(d, (int, float)) and 0 <= int(d) <= 6})
        menus.append({"label": str(menu_raw.get("label", "")).strip(), "days": days, "meals": meals})

    prefs_raw = data.get("preferences", {}) or {}
    preferences = {
        "allergies": [str(x).strip() for x in (prefs_raw.get("allergies") or []) if str(x).strip()],
        "dislikes": [str(x).strip() for x in (prefs_raw.get("dislikes") or []) if str(x).strip()],
        "likes": [str(x).strip() for x in (prefs_raw.get("likes") or []) if str(x).strip()],
        "notes": str(prefs_raw.get("notes", "")).strip(),
    }

    targets_raw = data.get("targets") or {}

    def _num(key: str) -> float | None:
        value = targets_raw.get(key)
        try:
            return float(value) if value is not None else None
        except (TypeError, ValueError):
            return None

    targets = {
        "daily_calories": _num("daily_calories"),
        "protein_pct": _num("protein_pct"),
        "carbs_pct": _num("carbs_pct"),
        "fat_pct": _num("fat_pct"),
        "protein_g": _num("protein_g"),
        "carbs_g": _num("carbs_g"),
        "fat_g": _num("fat_g"),
    }
    return {"menus": menus, "preferences": preferences, "targets": targets}


# Geração de dieta do zero (Pro, ver POST /nootr/diets/generate), a IA monta
# um dia inteiro batendo caloria/macro-alvo; sempre passa por revisão de um
# nutricionista parceiro antes de chegar ao usuário (ver /aprovar), então não
# precisa ser sofisticada, só coerente e segura. Reaproveita as mesmas regras
# de decomposição do import de PDF pra nunca listar prato composto pronto.
_GENERATE_DIET_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "meals": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "meal": {"type": "STRING"},
                    "time": {"type": "STRING"},
                    "foods": _SCHEMA,
                },
                "required": ["meal", "time", "foods"],
            },
        },
    },
    "required": ["meals"],
}

_GENERATE_DIET_PROMPT = """Monte uma dieta básica de UM dia, em português, pra uma pessoa de \
{country}, respeitando ESTRITAMENTE as metas abaixo:

- Calorias diárias: {calories} kcal
- Proteína: {protein_g}g
- Carboidrato: {carbs_g}g
- Gordura: {fat_g}g

Distribua em 4 a 5 refeições comuns no Brasil (café da manhã, almoço, lanche da tarde, jantar, \
ceia se fizer sentido), cada uma com horário típico (formato HH:MM). Cada alimento precisa ser \
um item ATÔMICO da tabela TACO (nunca um prato composto pronto, ver regras abaixo) com \
quantidade em medida caseira (xícara, colher, fatia, unidade, gramas).
{{RULES}}

RESTRIÇÕES DE SEGURANÇA, NUNCA, em hipótese nenhuma, inclua um alimento da lista de alergias, \
mesmo que pareça combinar bem nutricionalmente, é restrição de segurança, não preferência. \
Também não inclua o que a pessoa não gosta, e considere qualquer condição médica nas observações \
(ex: diabetes -> evite doces/açúcar simples; hipertensão -> evite algo claramente rico em sódio).

Alergias (NUNCA incluir): {allergies}
Não gosta: {dislikes}
Gosta / costuma ter em casa: {likes_pantry}
Observações/condições médicas: {notes}

Essa é uma dieta BÁSICA/genérica, será revisada por um nutricionista antes de chegar à pessoa,
não precisa ser sofisticada, só nutricionalmente coerente e realista pro dia a dia brasileiro.

Responda estritamente no formato do schema."""

_GENERATE_DIET_PROMPT = _GENERATE_DIET_PROMPT.replace("{{RULES}}", _FOOD_DECOMPOSITION_RULES)


def generate_diet(
    target_calories: float, protein_g: float, carbs_g: float, fat_g: float,
    preferences: dict, country: str,
) -> dict:
    prompt = _GENERATE_DIET_PROMPT.format(
        country=country,
        calories=round(target_calories),
        protein_g=round(protein_g),
        carbs_g=round(carbs_g),
        fat_g=round(fat_g),
        allergies=", ".join(preferences.get("allergies") or []) or "nenhuma informada",
        dislikes=", ".join(preferences.get("dislikes") or []) or "nenhuma informada",
        likes_pantry=", ".join([*(preferences.get("likes") or []), *(preferences.get("pantry") or [])]) or "nenhuma informada",
        notes=preferences.get("notes") or "nenhuma informada",
    )
    raw = _generate(prompt, _GENERATE_DIET_SCHEMA)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise AIError(f"JSON inválido do Gemini: {exc}") from exc

    meals = []
    for m in data.get("meals", []) or []:
        name = str(m.get("meal", "")).strip()
        foods = []
        for f in m.get("foods", []) or []:
            fname = str(f.get("name", "")).strip()
            fqty = str(f.get("quantity", "")).strip() or "1 porção"
            if fname:
                foods.append({"name": fname, "quantity": fqty})
        if name and foods:
            meals.append({"meal": name, "time": str(m.get("time", "")).strip(), "foods": foods})
    return {"meals": meals}


_CONVERSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "needs_question": {"type": "BOOLEAN"},
        "question": {"type": "STRING"},
        # "text" (pergunta normal) ou "confirm_ingredients" (pedindo pra pessoa
        # confirmar/corrigir os ingredientes de um prato composto desconhecido
        # que a IA teve que adivinhar, ver regra 8 do prompt).
        "question_kind": {"type": "STRING"},
        "skipped_names": {"type": "ARRAY", "items": {"type": "STRING"}},
        "new_items": _SCHEMA,
        # Preenchido junto com question_kind="confirm_ingredients", e também
        # no turno final (needs_question=false) quando esse prato foi
        # decomposto agora, o app usa pra oferecer "salvar como receita".
        "proposed_dish_name": {"type": "STRING"},
        "proposed_ingredients": _SCHEMA,
    },
    "required": ["needs_question", "question", "skipped_names", "new_items"],
}

_CONVERSE_SYSTEM = """Você ajuda a registrar um DESVIO do que uma pessoa comeu (ou vai comer) numa \
refeição específica que já estava planejada, para depois recalcular calorias e macros usando a \
tabela TACO. Converse em português, de forma natural e objetiva.

A refeição planejada é "{meal_name}", com estes alimentos: {meal_foods}.

REGRA CENTRAL, troca, não redescrição: a pessoa só precisa dizer o que MUDOU. Qualquer alimento \
da lista acima que ela não mencionar como "não comi"/"troquei"/"não teve" continua exatamente como \
estava planejado, NUNCA peça para ela confirmar ou redescrever a refeição inteira. \
- "skipped_names": copie EXATAMENTE (mesma grafia) os itens da lista acima que a pessoa disse que \
NÃO comeu ou trocou. Se ela não disse que deixou de comer nada (só mencionou algo extra), deixe vazio.
- "new_items": o que ela comeu NO LUGAR (ou a mais). Se ela disser que não comeu nada no lugar do \
que faltou (ex: "não comi o pão e não comi nada no lugar"), deixe a lista vazia, isso é válido e \
não precisa de pergunta.

Preferências desta pessoa (respeite sempre, nunca finalize sugerindo algo da lista de alergias):
- Alergias/restrições: {allergies}
- Não gosta: {dislikes}
- Gosta/prefere: {likes}
- Costuma ter em casa: {pantry}
- Observações gerais da pessoa (leve em conta ao interpretar e ao decidir se precisa perguntar algo): {notes}

RECEITAS SALVAS desta pessoa (pratos que ela já confirmou os ingredientes antes, use ESSES ingredientes \
EXATOS, com essas quantidades, sempre que ela citar um desses nomes, sem perguntar de novo):
{saved_recipes}

Como montar "new_items" (o que foi comido no lugar, ou a mais), mesmas regras de decomposição usadas \
em todo o app, pra um prato composto (ex: "sanduíche", "hambúrguer") virar os ingredientes reais em vez \
de ficar como um item só que não bate com nada na tabela nutricional:
{decomposition_rules}

Regras:
1. Se a quantidade de algum alimento citado em "new_items" não estiver clara (ex: "comi bolo" sem \
dizer o tanto), pergunte a quantidade antes de finalizar. Uma pergunta objetiva por vez.
2. Se o alimento citado for um prato ambíguo (hambúrguer, pizza, sanduíche, torta, etc.) que pode \
ser caseiro, de uma marca/rede conhecida, ou de uma lanchonete/padaria local sem marca, pergunte \
qual dos três antes de finalizar.
   - CASEIRO: decomponha nos ingredientes principais (ver regras de decomposição acima), se não \
estiver óbvio, pergunte "o que tinha dentro?".
   - MARCA conhecida (McDonald's, Burger King, Subway, etc.): use seu conhecimento sobre os \
valores nutricionais aproximados desse produto específico da marca (não decomponha nesse caso).
   - Lanchonete/padaria LOCAL sem marca famosa: estime com uma média típica para esse tipo de prato.
3. Ingrediente restrito x versão livre: se o alimento citado costuma conter um ingrediente da \
lista de alergias/restrições (ex: pão/massa/cerveja contêm glúten; leite/queijo/iogurte contêm \
lactose) e existe uma versão "sem" desse ingrediente amplamente conhecida, NÃO assuma qual é, \
pergunte se é a versão comum ou a versão sem-[ingrediente] antes de finalizar.
4. Preparo restrito: se houver restrição a frituras e o prato citado costuma ser frito (batata \
frita, frango à milanesa, pastel, etc.), pergunte a forma de preparo antes de finalizar.
5. "O resto da refeição continuou igual?": só pergunte isso quando a frase da pessoa for GENUINAMENTE \
ambígua sobre se ela trocou só uma coisa ou a refeição toda (ex: "comi outra coisa no almoço", sem \
dizer o quê especificamente foi trocado nem confirmar o resto). NÃO pergunte quando a frase já deixa \
claro que é uma troca pontual (ex: "não comi X e comi Y no lugar", "troquei X por Y", "em vez de X \
comi Y"), nesses casos presuma direto que o resto continua igual.
6. No máximo uma pergunta por vez; não repita uma pergunta já respondida no histórico.
7. Assim que "skipped_names" e "new_items" estiverem decididos (mesmo que algum fique vazio), finalize.
8. CONFIRMAÇÃO DE PRATO NÃO CONHECIDO: se você precisar DECOMPOR um prato composto que a pessoa citou \
comendo e esse prato NÃO está nas RECEITAS SALVAS acima nem é um dos pratos já cobertos pelas regras de \
decomposição (canja, sopa, estrogonofe, feijoada, torta salgada, vitamina, hambúrguer/x-burguer/x-salada/ \
x-tudo, sanduíche, cachorro-quente, crepioca, tapioca), ou seja, você está usando seu próprio \
conhecimento geral pra adivinhar os ingredientes de um prato que o app ainda não conhece, NÃO finalize \
direto: pergunte confirmando. Nesse caso:
   - needs_question=true, question_kind="confirm_ingredients".
   - question=<pergunta curta no formato "Esses são os ingredientes da sua [nome do prato]?", ex: \
"Esses são os ingredientes da sua crepioca?">.
   - proposed_dish_name=<nome curto do prato, ex: "Crepioca">.
   - proposed_ingredients=<sua melhor estimativa dos ingredientes com quantidade caseira>.
   - skipped_names e new_items ficam vazios nesse turno (ainda não confirmado).
   Quando a pessoa responder confirmando (ex: "sim", "isso mesmo") ou corrigindo (ex: "também tem \
queijo"), finalize NESSE turno seguinte com new_items = a lista final (já com a correção, se houve) e \
"proposed_dish_name" preenchido de novo com o mesmo nome do prato (pra o app oferecer salvar como \
receita), não pergunte "confirmar ingredientes" duas vezes pro mesmo prato na mesma conversa.

Responda estritamente no formato JSON do schema:
- Pergunta normal: needs_question=true, question_kind="text", question=<pergunta curta e objetiva>, \
skipped_names=[], new_items=[], proposed_dish_name="", proposed_ingredients=[].
- Confirmar ingredientes de prato desconhecido (regra 8): needs_question=true, \
question_kind="confirm_ingredients", question=<pergunta de confirmação>, skipped_names=[], new_items=[], \
proposed_dish_name=<nome do prato>, proposed_ingredients=<ingredientes estimados>.
- Finalizado: needs_question=false, question="", question_kind="", \
skipped_names=<itens da refeição não comidos>, new_items=<o que foi comido no lugar ou a mais, pode ser \
vazio>, proposed_dish_name=<preenchido só se um prato novo foi decomposto e confirmado agora, senão \
vazio>, proposed_ingredients=<os mesmos ingredientes de new_items relativos a esse prato, se aplicável>."""


def _parse_food_items(raw_items: list | None) -> list[dict]:
    items = []
    for it in raw_items or []:
        name = str(it.get("name", "")).strip()
        quantity = str(it.get("quantity", "")).strip() or "1 porção"
        if name:
            items.append({"name": name, "quantity": quantity})
    return items


def _format_saved_recipes(recipes: list[dict] | None) -> str:
    if not recipes:
        return "nenhuma"
    lines = []
    for r in recipes:
        ingredients = ", ".join(
            f'{i.get("name", "")} ({i.get("quantity", "")})' for i in (r.get("ingredients") or [])
        )
        lines.append(f'- "{r.get("name", "")}": {ingredients}')
    return "\n".join(lines)


def converse_meal(
    history: list[dict], meal_name: str, meal_foods: list[str], preferences: dict,
    force_finalize: bool = False, recipes: list[dict] | None = None,
) -> dict:
    system = _CONVERSE_SYSTEM.format(
        meal_name=meal_name or "refeição",
        meal_foods=", ".join(meal_foods) or "nenhum alimento cadastrado",
        allergies=", ".join(preferences.get("allergies") or []) or "nenhuma informada",
        dislikes=", ".join(preferences.get("dislikes") or []) or "nenhuma informada",
        likes=", ".join(preferences.get("likes") or []) or "nenhuma informada",
        pantry=", ".join(preferences.get("pantry") or []) or "nenhuma informada",
        notes=preferences.get("notes") or "nenhuma informada",
        decomposition_rules=_FOOD_DECOMPOSITION_RULES,
        saved_recipes=_format_saved_recipes(recipes),
    )
    if force_finalize:
        system += (
            "\n\nIMPORTANTE: você já perguntou o suficiente nesta conversa. NÃO pergunte mais nada, "
            "finalize agora (needs_question=false) com sua melhor estimativa de skipped_names e "
            "new_items a partir de tudo que a pessoa já disse, mesmo que falte algum detalhe. Isso "
            "inclui uma confirmação de ingredientes pendente (regra 8), se a pessoa ainda não "
            "confirmou, finalize com sua melhor estimativa dos ingredientes mesmo assim."
        )
    contents = [
        {"role": "model" if turn["role"] == "assistant" else "user", "parts": [{"text": turn["text"]}]}
        for turn in history
    ]
    raw = _generate_from_contents(contents, _CONVERSE_SCHEMA, system_instruction=system)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise AIError(f"JSON inválido do Gemini: {exc}") from exc

    new_items = _parse_food_items(data.get("new_items"))
    proposed_ingredients = _parse_food_items(data.get("proposed_ingredients"))

    valid_names = set(meal_foods)
    skipped_names = [
        str(n).strip() for n in (data.get("skipped_names") or [])
        if str(n).strip() in valid_names
    ]

    question_kind = str(data.get("question_kind", "")).strip() or "text"
    needs_question = bool(data.get("needs_question")) and not new_items and not skipped_names and not force_finalize
    return {
        "needs_question": needs_question,
        "question": str(data.get("question", "")).strip(),
        "question_kind": question_kind if needs_question else "",
        "skipped_names": skipped_names,
        "new_items": new_items,
        "proposed_dish_name": str(data.get("proposed_dish_name", "")).strip(),
        "proposed_ingredients": proposed_ingredients if needs_question else new_items,
    }


def explain_change(context: dict) -> str:
    prompt = (
        "Você é um nutricionista explicando, em 1 a 2 frases curtas e diretas (português), "
        "o ajuste feito na dieta do dia. Fale das mudanças de quantidade e de como os macros "
        "ficaram em relação à meta. Sem saudação, sem markdown.\n\n"
        f"Dados: {json.dumps(context, ensure_ascii=False)}"
    )
    return _generate(prompt, None).strip()


_SUBSTITUTES_SCHEMA = {"type": "ARRAY", "items": {"type": "STRING"}}

_SUBSTITUTES_PROMPT = """Uma pessoa está sem o alimento "{missing}" para uma refeição e precisa de \
opções para substituir. Sugira de 4 a 6 alimentos comuns no Brasil que cumprem a MESMA função \
nutricional/culinária de "{missing}" na refeição (ex: se for um carboidrato, sugira outros \
carboidratos; se for uma proteína, outras proteínas). NUNCA, em hipótese nenhuma, sugira algo da \
lista de alergias, é uma restrição de segurança, não preferência. Também não sugira o que a \
pessoa não gosta, e leve em conta qualquer condição médica nas observações (ex: diabetes -> evite \
doces/açúcar simples; hipertensão -> evite algo claramente rico em sódio).

Alergias (NUNCA sugerir): {allergies}
Não gosta: {dislikes}
Observações/condições médicas: {notes}

Responda só com os nomes dos alimentos (um item por string), sem explicações nem numeração."""


def suggest_substitutes(missing_food: str, preferences: dict) -> list[str]:
    prompt = _SUBSTITUTES_PROMPT.format(
        missing=missing_food,
        allergies=", ".join(preferences.get("allergies") or []) or "nenhuma informada",
        dislikes=", ".join(preferences.get("dislikes") or []) or "nenhuma informada",
        notes=preferences.get("notes") or "nenhuma informada",
    )
    raw = _generate(prompt, _SUBSTITUTES_SCHEMA)
    try:
        items = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise AIError(f"JSON inválido do Gemini: {exc}") from exc
    return [str(x).strip() for x in items if isinstance(items, list) and str(x).strip()][:6]


_WILDCARD_SCHEMA = {
    "type": "OBJECT",
    "properties": {"food": {"type": "STRING"}},
    "required": ["food"],
}

_WILDCARD_PROMPT = """A refeição "{meal_name}" ficou faltando {gap_macro} depois de um ajuste.
Alimentos já presentes nessa refeição: {current_foods}.
Alimentos que a pessoa tem em casa disponíveis: {pantry}.

Escolha NO MÁXIMO 1 alimento da lista "tem em casa" que:
1. Combine bem com os alimentos já presentes (faça sentido comer junto, mesmo contexto de \
refeição, ex: não sugira algo doce numa refeição salgada, nem embutido numa refeição de café \
da tarde se não fizer sentido).
2. Ajude a cobrir a lacuna de {gap_macro}.
3. NUNCA, em hipótese nenhuma, seja um item da lista de alergias, é restrição de segurança, não \
preferência. Considere também qualquer condição médica nas observações (ex: diabetes -> nunca \
escolha algo doce/açúcar simples, mesmo que combine bem).

Alergias (NUNCA escolher): {allergies}
Observações/condições médicas: {notes}

Se nenhum item da lista combinar bem, ajudar de verdade, ou todos violarem alguma restrição acima, \
responda food="" (vazio), não force uma escolha ruim.

Responda estritamente no formato JSON do schema: {{"food": "<nome escolhido ou vazio>"}}."""


def suggest_wildcard(meal_name: str, current_foods: list[str], gap_macro: str, preferences: dict) -> str | None:
    prompt = _WILDCARD_PROMPT.format(
        meal_name=meal_name,
        gap_macro=gap_macro,
        current_foods=", ".join(current_foods) or "nenhum",
        pantry=", ".join(preferences.get("pantry") or []),
        allergies=", ".join(preferences.get("allergies") or []) or "nenhuma informada",
        notes=preferences.get("notes") or "nenhuma informada",
    )
    raw = _generate(prompt, _WILDCARD_SCHEMA)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise AIError(f"JSON inválido do Gemini: {exc}") from exc
    food = str(data.get("food", "")).strip()
    return food or None


_DAY_TOPUP_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "meal_name": {"type": "STRING"},
        "additions": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {"name": {"type": "STRING"}, "quantity": {"type": "STRING"}},
                "required": ["name", "quantity"],
            },
        },
        "removals": {"type": "ARRAY", "items": {"type": "STRING"}},
    },
    "required": ["meal_name", "additions", "removals"],
}

_DAY_TOPUP_PROMPT = """A dieta do dia ficou {direction} da meta depois de um ajuste de quantidades: \
faltam/sobram aproximadamente {gap_calories} kcal e {gap_protein}g de proteína pra bater a meta \
diária, e só escalar as porções já presentes não foi suficiente (ou deixaria de ser realista).

Refeições ainda ajustáveis hoje (nome: alimentos atuais com quantidade):
{meals_desc}

Escolha UMA dessas refeições pra fazer um pequeno ajuste ADICIONAL (além da escala já feita): \
adicionar um alimento novo, remover um que já está lá, ou os dois. Regras:
1. Mantenha quantidades realistas, nunca porções absurdas (ex: não adicione 500g de arroz).
2. O alimento adicionado precisa combinar com os outros da mesma refeição (mesmo contexto: não \
sugira algo doce numa refeição salgada, nem embutido num café da tarde se não fizer sentido).
3. Prefira alimentos comuns no Brasil; considere o que a pessoa tem em casa quando ajudar.
4. NUNCA, em hipótese nenhuma, adicione algo da lista de alergias, é restrição de segurança, não \
preferência. Considere também condições médicas nas observações (ex: diabetes -> nunca adicione \
algo doce/açúcar simples).
5. Se nenhuma mudança realista resolver a diferença, devolva additions=[] e removals=[], não \
force uma escolha ruim só pra fechar a meta.

Alergias (NUNCA adicionar): {allergies}
Não gosta: {dislikes}. Costuma ter em casa: {pantry}.
Observações/condições médicas: {notes}

Responda estritamente no formato do schema."""


def suggest_day_topup(
    pending_meals: list[dict], gap_calories: float, gap_protein: float, preferences: dict,
) -> dict | None:
    if not pending_meals:
        return None
    meals_desc = "\n".join(
        f"- {m['name']}: " + (", ".join(f'{f["name"]} ({f["quantity"]})' for f in m["foods"]) or "vazia")
        for m in pending_meals
    )
    prompt = _DAY_TOPUP_PROMPT.format(
        direction="abaixo" if gap_calories >= 0 else "acima",
        gap_calories=abs(round(gap_calories)),
        gap_protein=abs(round(gap_protein)),
        meals_desc=meals_desc,
        allergies=", ".join(preferences.get("allergies") or []) or "nenhuma informada",
        dislikes=", ".join(preferences.get("dislikes") or []) or "nenhuma informada",
        pantry=", ".join(preferences.get("pantry") or []) or "nenhuma informada",
        notes=preferences.get("notes") or "nenhuma informada",
    )
    raw = _generate(prompt, _DAY_TOPUP_SCHEMA)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise AIError(f"JSON inválido do Gemini: {exc}") from exc

    meal_name = str(data.get("meal_name", "")).strip()
    additions = [
        {"name": str(a.get("name", "")).strip(), "quantity": str(a.get("quantity", "")).strip() or "1 porção"}
        for a in (data.get("additions") or []) if str(a.get("name", "")).strip()
    ]
    removals = [str(r).strip() for r in (data.get("removals") or []) if str(r).strip()]
    if not meal_name or (not additions and not removals):
        return None
    return {"meal_name": meal_name, "additions": additions, "removals": removals}


_COMMON_VARIANT_SCHEMA = {
    "type": "OBJECT",
    "properties": {"choice": {"type": "STRING"}},
    "required": ["choice"],
}

_COMMON_VARIANT_PROMPT = """Uma pessoa de {country} descreveu um alimento só como "{query}", sem dizer a \
variedade/tipo. Um banco de dados nutricional tem VÁRIAS opções que batem igualmente bem com essa busca \
(estão empatadas), e é preciso escolher UMA só, a mais comum, padrão ou genérica quando alguém desse país \
fala só "{query}" sem qualificar mais nada (ex: se a pessoa diz só "pão", a resposta mais comum no Brasil é \
"pão francês", não "pão de forma" nem "pão de queijo"; se diz só "azeite", é o de oliva, não o de dendê).

Opções empatadas (escolha o texto EXATO de uma delas):
{options}

Responda estritamente no formato do schema: {{"choice": "<texto exato de uma das opções>"}}."""


def resolve_common_variant(query: str, candidates: list[str], country: str) -> str | None:
    prompt = _COMMON_VARIANT_PROMPT.format(
        country=country,
        query=query,
        options="\n".join(f"- {c}" for c in candidates),
    )
    raw = _generate(prompt, _COMMON_VARIANT_SCHEMA)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise AIError(f"JSON inválido do Gemini: {exc}") from exc
    choice = str(data.get("choice", "")).strip()
    return choice if choice in candidates else None
