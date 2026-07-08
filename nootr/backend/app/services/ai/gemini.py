"""
Adapter mínimo do Google Gemini (grátis para testes).

Usa a API REST via httpx (já é dependência) — sem SDK pesado — e força saída
em JSON estruturado com `responseSchema`. Faz só o parsing de linguagem; nada
de macros ou TACO aqui.
"""
import json

import httpx

from backend.app.config import get_settings
from backend.app.services.ai import AIError

_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

_PROMPT = """Você é um extrator de itens alimentares. A pessoa descreve o que comeu ou vai comer, em português.
Extraia cada alimento com sua quantidade em medida caseira ou gramas.
Regras:
- Um objeto por alimento distinto.
- "quantity" deve ser curto e no estilo caseiro: "2 fatias", "1 unidade", "100 g", "1 colher de sopa", "1 prato".
- Se a pessoa não disser a quantidade, use "1 porção".
- Não invente alimentos que não foram citados.

Texto: {text}"""

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


_DIET_PROMPT = """Você recebe uma dieta escrita por um nutricionista, em português.
Extraia as refeições em ordem, com horário e os alimentos de cada uma.
Regras:
- "meal": nome da refeição (ex: "Café da manhã", "Almoço").
- "time": horário no formato HH:MM (se não houver, estime um coerente).
- "foods": lista de alimentos, cada um com um nome e uma quantidade curta e caseira ("2 fatias", "100 g", "1 unidade").
- Não invente alimentos ou refeições que não estejam no texto.

Dieta:
{text}"""

_DIET_SCHEMA = {
    "type": "ARRAY",
    "items": {
        "type": "OBJECT",
        "properties": {
            "meal": {"type": "STRING"},
            "time": {"type": "STRING"},
            "foods": _SCHEMA,
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


def parse_meal(text: str) -> list[dict]:
    raw = _generate(_PROMPT.replace("{text}", text), _SCHEMA)
    try:
        items = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise AIError(f"JSON inválido do Gemini: {exc}") from exc
    result = []
    for it in items if isinstance(items, list) else []:
        name = str(it.get("name", "")).strip()
        quantity = str(it.get("quantity", "")).strip() or "1 porção"
        if name:
            result.append({"name": name, "quantity": quantity})
    return result


def parse_diet(text: str) -> list[dict]:
    raw = _generate(_DIET_PROMPT.replace("{text}", text), _DIET_SCHEMA)
    try:
        meals = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise AIError(f"JSON inválido do Gemini: {exc}") from exc
    result = []
    for m in meals if isinstance(meals, list) else []:
        name = str(m.get("meal", "")).strip()
        foods = []
        for f in m.get("foods", []) or []:
            fname = str(f.get("name", "")).strip()
            fqty = str(f.get("quantity", "")).strip() or "1 porção"
            if fname:
                foods.append({"name": fname, "quantity": fqty})
        if name and foods:
            result.append({"meal": name, "time": str(m.get("time", "")).strip(), "foods": foods})
    return result


_DIET_DOC_PROMPT = """Você recebe o texto (convertido em Markdown) de um documento — PDF, Word ou \
Excel — com uma dieta montada por um(a) nutricionista para um(a) paciente, em português. Se vier de \
uma planilha Excel, células vazias de uma tabela aparecem como "NaN" no texto — trate isso como \
célula vazia (ex: numa linha de tabela em que "Refeição" está "NaN", significa que é a mesma \
refeição da linha anterior), nunca como um alimento ou valor de verdade. Extraia TRÊS coisas:

1. Os CARDÁPIOS do documento, em "menus". Na maioria das vezes há só UM cardápio (um conjunto de \
refeições que vale pra dieta inteira) — nesse caso "menus" tem um único item. Mas às vezes o \
documento traz MAIS DE UM cardápio distinto (ex: "dia de treino" / "dia de descanso", "opção 1" / \
"opção 2", um cardápio de segunda a sexta e outro de fim de semana). Nesse caso, cada um vira um \
item separado em "menus", cada um com:
   - "label": um nome curto pro cardápio, se o documento der um (ex: "Dia de treino"). Se não der \
nome, deixe vazio.
   - "days": os dias da semana em que ESSE cardápio específico deve ser usado, APENAS SE o \
documento disser isso explicitamente — array de inteiros, 0=segunda, 1=terça, 2=quarta, 3=quinta, \
4=sexta, 5=sábado, 6=domingo. "Final de semana"/"fim de semana" = [5, 6]. "Dias de treino: segunda, \
quarta e sexta" = [0, 2, 4]. Se o documento NÃO disser para quais dias esse cardápio é, deixe "days" \
como array vazio — o app decide a distribuição sozinho.
   - "meals": as refeições desse cardápio, em ordem, com horário e os alimentos de cada uma. Regras \
importantes:
     * "time" em HH:MM, "quantity" curto e caseiro.
     * NUNCA invente alimentos, e NUNCA misture alimentos de uma refeição em outra — cada alimento \
pertence exclusivamente à refeição em que o documento o lista. Se o layout da tabela for confuso, \
releia com cuidado a qual refeição cada linha pertence antes de decidir.
     * Se um alimento for um PRATO PRONTO/COMPOSTO que normalmente reúne vários ingredientes-base \
(ex: canja de galinha, sopa, estrogonofe, feijoada, torta salgada) em vez de um ingrediente único, \
DECOMPONHA-O nos ingredientes principais estimados (ex: "canja de galinha" -> frango desfiado, \
arroz ou macarrão, cenoura, batata — cada um como um item de "foods" separado, com uma quantidade \
proporcional razoável para uma porção do prato). Não liste o prato pronto como um único item — a \
tabela nutricional (TACO) não tem preparações prontas, só ingredientes crus/básicos.
     * TEMPEROS/CONDIMENTOS (açafrão, orégano, sal, pimenta, alho, cebola em pequena quantidade, \
ervas, etc.) usados só pra temperar NÃO viram item separado em "foods" — eles têm calorias \
desprezíveis e "casam errado" se listados sozinhos. Ignore-os, ou deixe-os como parte do NOME do \
alimento principal (ex: "peito de frango com açafrão" continua um item só, não dois).

2. Qualquer contexto sobre o paciente que o documento carregue, em geral escrito como observações, \
notas de rodapé ou parênteses do(a) nutricionista:
   - "allergies": alergias ou restrições alimentares mencionadas (ex: "sem lactose", "alérgico a \
camarão").
   - "dislikes": alimentos que o paciente não gosta ou pediu para evitar.
   - "likes": alimentos que o paciente gosta ou prefere.
   - "notes": um resumo curto (2-4 frases) de qualquer outra orientação relevante — especialmente \
substituições que a nutricionista já sugeriu para esse paciente (ex: "pode trocar o arroz por \
batata-doce", "evitar frituras à noite"). Se não houver nada relevante, devolva string vazia.

3. Metas nutricionais diárias da dieta, se o documento as mencionar explicitamente (em "targets"):
   - "daily_calories": total de calorias diárias (ex: "dieta de 2000 kcal", "VET: 1800 kcal").
   - "protein_pct"/"carbs_pct"/"fat_pct": percentual de cada macro sobre as calorias, se explícito \
(ex: "40% carboidrato, 30% proteína, 30% gordura").
   - Se NÃO houver percentual, mas houver o TOTAL de gramas diárias de cada macro declarado à parte \
da lista de alimentos (ex: "meta diária: 150g de proteína, 200g de carboidrato, 60g de gordura"), \
preencha "protein_g"/"carbs_g"/"fat_g" com esses totais.
   - Não invente nem calcule nada aqui — deixe de fora (não inclua a chave) qualquer valor que não \
esteja explícito no documento.

Se o documento não mencionar nada sobre alergias/gostos/notas/metas, devolva listas vazias, notes="" \
e "targets" vazio ({{}}).

Texto do PDF:
{text}"""

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
                if fname:
                    foods.append({"name": fname, "quantity": fqty})
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


_CONVERSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "needs_question": {"type": "BOOLEAN"},
        "question": {"type": "STRING"},
        "items": _SCHEMA,
    },
    "required": ["needs_question", "question", "items"],
}

_CONVERSE_SYSTEM = """Você ajuda a registrar o que uma pessoa comeu ou vai comer, para depois calcular \
calorias e macros usando a tabela TACO. Converse em português, de forma natural e objetiva.

Preferências desta pessoa (respeite sempre, nunca finalize sugerindo algo da lista de alergias):
- Alergias/restrições: {allergies}
- Não gosta: {dislikes}
- Gosta/prefere: {likes}
- Costuma ter em casa: {pantry}
- Observações gerais da pessoa (leve em conta ao interpretar e ao decidir se precisa perguntar algo): {notes}

Regras:
1. Se a quantidade de algum alimento citado não estiver clara (ex: "vou comer pizza" sem dizer \
quantas fatias), pergunte a quantidade antes de finalizar. Uma pergunta objetiva por vez.
2. Se o alimento for um prato ambíguo (hambúrguer, pizza, sanduíche, torta, etc.) que pode ser \
caseiro, de uma marca/rede conhecida, ou de uma lanchonete/padaria local sem marca, pergunte qual \
dos três antes de finalizar.
   - CASEIRO: peça os ingredientes principais para somar depois (ex: "o que tinha dentro?").
   - MARCA conhecida (McDonald's, Burger King, Subway, etc.): use seu conhecimento sobre os \
valores nutricionais aproximados desse produto específico da marca.
   - Lanchonete/padaria LOCAL sem marca famosa: estime com uma média típica para esse tipo de prato.
3. Assim que tiver quantidade e tipo definidos (ou os ingredientes, no caso caseiro), finalize.
4. No máximo uma pergunta por vez; não repita uma pergunta já respondida no histórico.
5. Ingrediente restrito x versão livre: se o alimento citado costuma conter um ingrediente da \
lista de alergias/restrições (ex: pão/massa/cerveja contêm glúten; leite/queijo/iogurte contêm \
lactose) e existe uma versão "sem" desse ingrediente amplamente conhecida, NÃO assuma qual é — \
pergunte se é a versão comum ou a versão sem-[ingrediente] antes de finalizar. Nunca finalize \
registrando a versão que contém o ingrediente restrito sem confirmar.
6. Preparo restrito: se houver restrição a frituras e o prato citado costuma ser frito (batata \
frita, frango à milanesa, pastel, etc.), pergunte a forma de preparo (frito, assado, grelhado...) \
antes de finalizar em vez de assumir que foi frito.

Responda estritamente no formato JSON do schema:
- Se precisar perguntar algo: needs_question=true, question=<pergunta curta e objetiva>, items=[].
- Caso contrário: needs_question=false, question="", items=<lista final de alimentos com name e quantity>."""


def converse_meal(history: list[dict], preferences: dict) -> dict:
    system = _CONVERSE_SYSTEM.format(
        allergies=", ".join(preferences.get("allergies") or []) or "nenhuma informada",
        dislikes=", ".join(preferences.get("dislikes") or []) or "nenhuma informada",
        likes=", ".join(preferences.get("likes") or []) or "nenhuma informada",
        pantry=", ".join(preferences.get("pantry") or []) or "nenhuma informada",
        notes=preferences.get("notes") or "nenhuma informada",
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

    items = []
    for it in data.get("items", []) or []:
        name = str(it.get("name", "")).strip()
        quantity = str(it.get("quantity", "")).strip() or "1 porção"
        if name:
            items.append({"name": name, "quantity": quantity})

    return {
        "needs_question": bool(data.get("needs_question")) and not items,
        "question": str(data.get("question", "")).strip(),
        "items": items,
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
carboidratos; se for uma proteína, outras proteínas). NÃO sugira nada da lista de alergias ou do \
que a pessoa não gosta.

Alergias/restrições: {allergies}
Não gosta: {dislikes}

Responda só com os nomes dos alimentos (um item por string), sem explicações nem numeração."""


def suggest_substitutes(missing_food: str, preferences: dict) -> list[str]:
    prompt = _SUBSTITUTES_PROMPT.format(
        missing=missing_food,
        allergies=", ".join(preferences.get("allergies") or []) or "nenhuma informada",
        dislikes=", ".join(preferences.get("dislikes") or []) or "nenhuma informada",
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
refeição — ex: não sugira algo doce numa refeição salgada, nem embutido numa refeição de café \
da tarde se não fizer sentido).
2. Ajude a cobrir a lacuna de {gap_macro}.

Se nenhum item da lista combinar bem ou ajudar de verdade, responda food="" (vazio) — não force \
uma escolha ruim.

Responda estritamente no formato JSON do schema: {{"food": "<nome escolhido ou vazio>"}}."""


def suggest_wildcard(meal_name: str, current_foods: list[str], gap_macro: str, pantry: list[str]) -> str | None:
    prompt = _WILDCARD_PROMPT.format(
        meal_name=meal_name,
        gap_macro=gap_macro,
        current_foods=", ".join(current_foods) or "nenhum",
        pantry=", ".join(pantry),
    )
    raw = _generate(prompt, _WILDCARD_SCHEMA)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise AIError(f"JSON inválido do Gemini: {exc}") from exc
    food = str(data.get("food", "")).strip()
    return food or None
