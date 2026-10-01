"""
Adapter mínimo do Google Gemini (grátis para testes).

Usa a API REST via httpx (já é dependência), sem SDK pesado, e força saída
em JSON estruturado com `responseSchema`. Faz só o parsing de linguagem; nada
de macros ou TACO aqui.
"""
import base64
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
# prompts (_WILDCARD_SCHEMA, etc.) que não precisam desse
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


def _generate_from_contents(
    contents: list[dict], schema: dict | None, system_instruction: str | None = None,
    timeout: float = 60.0, allow_empty: bool = False, temperature: float = 0.2,
) -> str:
    """Chamada base ao Gemini (multi-turno); devolve o texto do candidato.

    `timeout` é parametrizável porque nem toda chamada é um prompt de texto
    curto: mandar um áudio inteiro (ver transcribe_audio) sobe alguns MB e
    demora mais que o padrão. 60s de padrão (era 30s) porque o prompt do Noo
    sozinho (tabela de refeições + regras) já é grande o bastante pra às
    vezes passar de 30s numa resposta mais lenta do Gemini, sem isso ser uma
    falha de rede de verdade.

    `allow_empty`: quando a resposta vem sem `parts`, devolve "" em vez de
    levantar erro. É o que acontece quando o modelo não tem NADA a dizer, o
    caso normal de um áudio mudo/inaudível (ver transcribe_audio), que é uma
    resposta legítima, não uma falha de infraestrutura.

    `temperature`: 0.2 é o padrão (alguma variação é aceitável pra tarefas de
    julgamento/criação, ex: sugerir um alimento). Transcrição é o oposto,
    tem UMA resposta certa (o que a pessoa falou), então usa 0.0: qualquer
    grau de "criatividade" aí é a própria definição de alucinar."""
    settings = get_settings()
    if not settings.gemini_api_key:
        raise AIError("Gemini não configurado: defina GEMINI_API_KEY em nootr/.env")

    gen_config = {"temperature": temperature}
    if schema is not None:
        gen_config["responseMimeType"] = "application/json"
        gen_config["responseSchema"] = schema

    body: dict = {"contents": contents, "generationConfig": gen_config}
    if system_instruction:
        body["systemInstruction"] = {"parts": [{"text": system_instruction}]}

    url = _ENDPOINT.format(model=settings.gemini_model)
    # Um timeout de leitura, ou um 429/503 (sobrecarga temporária, a própria
    # mensagem do Gemini diz "spikes são geralmente temporários"), costuma ser
    # passageiro, não uma falha de infra de verdade: vale UMA tentativa extra
    # antes de desistir. Sem isso, um 503 passageiro derrubava silenciosamente
    # o day_topup (a última rede de segurança que fecha a meta de
    # calorias/proteína ADICIONANDO alimento quando só escalar porção não
    # basta, ver day_topup.try_day_topup, que engole AIError e desiste sem
    # avisar ninguém): a pessoa via a proteína do dia ficar abaixo da meta
    # achando que era um limite do app, quando era só o Gemini pedindo pra
    # tentar de novo.
    resp = None
    last_timeout: httpx.TimeoutException | None = None
    for attempt in range(2):
        try:
            resp = httpx.post(url, params={"key": settings.gemini_api_key}, json=body, timeout=timeout)
        except httpx.TimeoutException as exc:
            last_timeout = exc
            resp = None
            continue
        except httpx.HTTPError as exc:
            raise AIError(f"Falha de rede ao chamar o Gemini: {exc}") from exc
        if attempt == 0 and resp.status_code in (429, 503):
            continue
        break
    if resp is None:
        raise AIError(f"Falha de rede ao chamar o Gemini: {last_timeout}")
    if resp.status_code >= 300:
        raise AIError(f"Gemini {resp.status_code}: {resp.text[:300]}")
    try:
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as exc:
        if allow_empty:
            return ""
        raise AIError(f"Resposta inesperada do Gemini: {exc}") from exc


def _generate(prompt: str, schema: dict | None) -> str:
    """Chamada base ao Gemini (turno único); devolve o texto do candidato."""
    return _generate_from_contents([{"parts": [{"text": prompt}]}], schema)


# Regra de decomposição de alimentos, compartilhada entre a leitura de PDF
# (_DIET_DOC_PROMPT), a geração de dieta por IA (_GENERATE_DIET_PROMPT) e o
# Noo (_NOO_SYSTEM). Um lugar só evita a regra divergir entre os prompts (ex:
# um prato composto sendo decomposto num fluxo e não no outro).
_FOOD_DECOMPOSITION_RULES = """- "quantity" é SÓ a medida caseira (número + unidade: xícara, colher, fatia, \
unidade, concha, copo, gramas). NUNCA misture um adjetivo de preparo dentro dela (ex: "1 xícara de maçã \
picada": quantity é "1 xícara", NUNCA "1 xícara picada", "picada" não é medida, é forma de cortar). Se o \
preparo for nutricionalmente relevante (cru vs cozido, por exemplo), ele entra no nome do alimento, nunca \
na quantidade.
- "unidade" SÓ pra alimento que realmente existe em unidades discretas (1 ovo, 1 fatia de pão, 1 fruta \
inteira). NUNCA use "1 unidade" pra um corte de carne/embutido sem tamanho padrão (ex: carne seca, lombo \
suíno, linguiça, paio dentro de uma feijoada decomposta): sem tabela própria pra converter, "1 unidade" \
cai num padrão genérico de 150g SEMPRE, mesmo quando o mesmo prato tem 3 carnes diferentes, inflando o \
prato inteiro (450g de carne só, mais o feijão). Pra esses, estime a quantidade em GRAMAS diretamente, \
proporcional a uma porção normal do prato (ex: "carne seca (60g)", não "carne seca (1 unidade)").
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
salada/x-tudo, sanduíche, cachorro-quente, crepioca, tapioca recheada, omelete recheado, panqueca recheada, \
yakisoba, macarronada oriental) em vez de um ingrediente único, DECOMPONHA-O nos ingredientes principais \
estimados. Essa lista é só EXEMPLO, não exaustiva: qualquer prato pronto que reúna vários ingredientes-base \
segue a MESMA regra, mesmo sem estar nomeado aqui, releia "é um prato pronto composto ou um ingrediente \
único?" antes de decidir. Erro comum a evitar: reduzir o prato a só o item mais fácil de reconhecer (ex: \
"yakisoba de carne" virando só "carne", perdendo o macarrão, que é a BASE do prato e a maior parte das \
calorias/carboidratos) é o mesmo erro de não decompor, esconde a maior parte da refeição:
  * "canja de galinha" -> frango desfiado, arroz ou macarrão, cenoura, batata.
  * "yakisoba" -> macarrão (a base do prato, NUNCA esqueça esse item), a(s) carne(s) citada(s) (frango/carne/ \
camarão), legumes (repolho, cenoura, brócolis, o que for citado ou "legumes" genérico se não especificar), \
molho shoyu.
  * "vitamina de frutas"/"vitamina de banana" -> leite, a(s) fruta(s) citada(s), e aveia também SE o texto \
mencionar aveia. "vitamina" aqui NUNCA significa a "Mistura para vitamina" industrializada (produto à base \
de trigo/cevada/aveia), é sempre a bebida caseira batida de fruta com leite.
  * "hambúrguer" (o sanduíche, não só a carne) -> pão de hambúrguer, carne de hambúrguer, queijo, salada, \
óleo/maionese, NÃO duplique a carne como dois itens (nunca "carne moída" E "carne de hambúrguer" juntos: \
é UM disco de carne só). EXCEÇÃO: se a pessoa citar um item de rede de fast-food por NOME DE MARCA \
específico (ex: "Big Mac", "Quarteirão", "McChicken", "Cheeseburguer do McDonald's", "Whopper"), NÃO \
decomponha, mantenha como UM item atômico só com esse nome, esses já existem cadastrados na tabela \
nutricional como item medido de verdade (decompor destruiria essa precisão). Só decomponha quando for \
descrição genérica sem marca ("um hambúrguer", "um x-tudo", "um cheeseburguer" sem dizer de qual rede).
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

_GENERATE_DIET_PROMPT = """Você é um nutricionista montando uma dieta BÁSICA de UM dia pra uma \
pessoa de {country}. Escreva como um nutricionista escreveria de verdade: refeições que uma pessoa \
comum come, em porções que uma pessoa comum serve.

Use SÓ alimentos comuns do dia a dia de quem mora em {country}: coisas que se compram no mercado e \
se comem numa refeição, do jeito que essa cultura come. Nada de ingrediente de preparo que ninguém \
come sozinho (fermento, amido, essência, corante, caldo em cubo, gelatina em pó), nada de item \
exótico, importado ou caro, e nada de suplemento a não ser que a pessoa já use.

A CONTA JÁ ESTÁ FEITA, NÃO RECALCULE
Total do dia: {total_calories} kcal, {total_protein_g}g de proteína, {carbs_g}g de carboidrato, \
{fat_g}g de gordura.

Isso já está dividido refeição por refeição na tabela abaixo. Você NÃO precisa calcular \
porcentagem nem somar o dia: escolha, pra cada refeição, alimentos que batam os números DAQUELA \
linha (tolerância de ~10%). Se cada refeição bate a sua linha, o dia fecha sozinho.

{meal_targets_table}

O peso em gramas de cada linha é só uma referência de ordem de grandeza (o quanto de comida a \
refeição deve ter no prato), não uma meta a bater: o que importa são as calorias e os macros.

Use exatamente esses nomes e horários, nessa ordem, {n_meals} refeições.

COMO MONTAR CADA REFEIÇÃO
Cada refeição precisa fazer sentido PRA AQUELE MOMENTO DO DIA. Café da manhã, lanche e ceia não \
são versões menores do almoço: ninguém come peito de frango com arroz às 16h nem bife com feijão \
às 7h. Pense no que realmente se come em cada momento no Brasil, por exemplo:
- Café da manhã: pão/tapioca/cuscuz/aveia + ovo/queijo/leite/iogurte + fruta ou café.
- Lanche da manhã / lanche da tarde / ceia: iogurte, leite, queijo, fruta, pão, tapioca, ovo, \
castanhas, vitamina. Coisas leves, rápidas, que se come fora da mesa.
- Almoço e jantar: arroz/macarrão/batata + feijão/leguminosa + carne/frango/peixe/ovo + salada ou \
legume. É aqui que entram as proteínas "de prato".

Dentro desse contexto, toda refeição precisa ter pelo menos 2 alimentos diferentes, incluindo uma \
fonte real de PROTEÍNA (carne, frango, peixe, ovo, leite, iogurte, queijo, feijão, whey) e uma \
fonte real de CARBOIDRATO (pão, tapioca, cuscuz, aveia, arroz, macarrão, batata, mandioca, fruta). \
Uma refeição só de fruta, só de doce ou só de pão não é uma refeição.

QUANTIDADES
Use medida caseira (fatia, unidade, colher de sopa, xícara, copo, pote) ou gramas, e escolha \
quantidades que uma pessoa realmente serve numa sentada. Você sabe julgar isso: 7 colheres de sopa \
de doce de leite é absurdo, 1 colher é normal; 3 bananas de uma vez é demais, 1 é o normal; 5 ovos \
é exagero, 2 é o normal. Aplique esse mesmo bom senso a cada alimento, cada um tem sua própria \
noção de "muito" e "pouco".

O tamanho da porção é PROPORCIONAL À NECESSIDADE CALÓRICA da pessoa. Os exemplos acima são de uma \
pessoa média (~2000 a 2500 kcal por dia). Quem precisa de mais que isso come porções maiores, e \
isso não é exagero, é o que essa pessoa precisa: num plano de 3000 kcal as porções são um pouco \
maiores que o normal, num de 4000 ou 5000 kcal são bem maiores, e as refeições podem ter mais \
itens. Calibre pelo total do dia informado lá em cima e não entregue o dia abaixo da meta por medo \
de servir demais.

Se uma refeição está longe do alvo de calorias, NÃO infle a porção de um alimento só até ficar \
estranha, acrescente ou troque alimentos até fechar a conta com porções coerentes.

O TOTAL DO DIA TEM QUE FECHAR: a tolerância de ~10% é POR REFEIÇÃO, mas a SOMA do dia não pode \
passar de 2% de distância do total informado acima (idealmente cravado ou a menos de 10 kcal). Não \
deixe pequenos excessos ou faltas em cada refeição se somarem na mesma direção, confira a soma do \
dia inteiro antes de responder e ajuste a refeição mais fácil de mexer se estiver fora disso.

UM ITEM = UM ALIMENTO
A tabela nutricional (TACO) só tem ingredientes básicos, não preparações prontas, então cada item \
precisa ser UM alimento só. Nunca junte dois alimentos numa frase: "café com leite" são dois itens \
("café" e "leite", o leite é metade das calorias da bebida), "salada de alface e tomate" são dois \
itens ("alface" e "tomate"), "pão com manteiga" são dois itens. Prato composto (vitamina, sopa, \
sanduíche, crepioca, omelete recheado) também é decomposto nos ingredientes. Detalhes abaixo:
{{RULES}}

SEGURANÇA
NUNCA, em hipótese nenhuma, inclua um alimento da lista de alergias, mesmo que combine \
perfeitamente, é restrição de segurança, não preferência. Também não inclua o que a pessoa não \
gosta, e considere qualquer condição médica nas observações (ex: diabetes -> evite doces/açúcar \
simples; hipertensão -> evite algo claramente rico em sódio).

Alergias (NUNCA incluir): {allergies}
Não gosta: {dislikes}
Gosta / costuma ter em casa: {likes_pantry}
Observações/condições médicas: {notes}

ANTES DE RESPONDER
Releia sua dieta e se pergunte, refeição por refeição: "eu serviria isso, nessa quantidade, nesse \
horário, pra um paciente?". Se alguma resposta for não, corrija antes de responder.

Responda estritamente no formato do schema."""

_GENERATE_DIET_PROMPT = _GENERATE_DIET_PROMPT.replace("{{RULES}}", _FOOD_DECOMPOSITION_RULES)


def _format_meal_targets_table(meal_targets: list[dict]) -> str:
    """A conta pronta por refeição (ver services/meal_planning.meal_plan_targets),
    os quatro macros + peso de referência, pra IA não precisar calcular nada."""
    header = (
        "| Refeição | Horário | Calorias | Proteína | Carboidrato | Gordura | Peso aprox. |\n"
        "|---|---|---|---|---|---|---|"
    )
    rows = [
        f"| {m['name']} | {m['time']} | {m['calories']} kcal | {m['protein_g']}g | "
        f"{m.get('carbs_g', 0)}g | {m.get('fat_g', 0)}g | ~{m.get('grams', 0)}g |"
        for m in meal_targets
    ]
    return "\n".join([header, *rows])


def generate_diet(
    meal_targets: list[dict], carbs_g: float, fat_g: float,
    preferences: dict, country: str,
) -> dict:
    """
    `meal_targets`: a conta já feita por refeição (nome, horário, calorias,
    proteína, carbo, gordura, peso aproximado), calculada em
    services/meal_planning.meal_plan_targets. A IA não calcula porcentagem nem
    soma o dia, só escolhe alimentos que batam cada linha da tabela, ver
    POST /nootr/diets/generate.
    """
    prompt = _GENERATE_DIET_PROMPT.format(
        country=country,
        total_calories=round(sum(m["calories"] for m in meal_targets)),
        total_protein_g=round(sum(m["protein_g"] for m in meal_targets)),
        carbs_g=round(carbs_g),
        fat_g=round(fat_g),
        meal_targets_table=_format_meal_targets_table(meal_targets),
        n_meals=len(meal_targets),
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


_EXPLAIN_PROMPT = """Você é o nutricionista que acabou de reajustar a dieta do dia dessa pessoa \
porque ela comeu (ou vai comer) algo diferente do planejado. Explique pra ela, em 1 a 3 frases \
curtas, O QUE VOCÊ MUDOU e POR QUÊ.

Fale na primeira pessoa e cite os alimentos e as refeições pelo nome, na ordem em que você mexeu \
neles, sempre ligando cada mudança ao macro que ela resolve. Exemplo do tom esperado:
"Aumentei o leite no lanche da tarde e acrescentei um ovo pra repor a proteína que faltou, e \
reduzi o arroz do jantar pra não estourar o carboidrato do dia."

Regras:
- Descreva as mudanças da lista "alteracoes" abaixo, que é o que de fato foi feito. NUNCA invente \
uma mudança que não está lá.
- Se a lista de alterações estiver vazia, diga em uma frase que não foi preciso mexer em nada \
porque o dia continuou dentro da meta.
- Não repita a tabela de números (a pessoa já vê os macros na tela), o texto é sobre as DECISÕES.
- Se algum macro ficou fora da meta mesmo depois do ajuste, termine dizendo isso em meia frase, \
com honestidade.
- Português, sem saudação, sem markdown, sem lista com marcadores.

Dados: {context}"""


def explain_change(context: dict) -> str:
    """
    `context` traz "alteracoes" (ver diet_engine.diff_meals): sem essa lista a
    explicação só conseguia falar de totais ("os carboidratos subiram") e saía
    genérica demais pra ser útil, que é justamente o oposto do que o app
    entrega.
    """
    return _generate(_EXPLAIN_PROMPT.format(context=json.dumps(context, ensure_ascii=False)), None).strip()


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
Alimento que a pessoa ACABOU DE DIZER que está em falta agora (não confundir com a despensa \
geral, "tem em casa" é uma lista de itens que ela costuma ter, não necessariamente hoje): \
{missing_food}.

Escolha NO MÁXIMO 1 alimento da lista "tem em casa" que:
1. Combine bem com os alimentos já presentes (faça sentido comer junto, mesmo contexto de \
refeição, ex: não sugira algo doce numa refeição salgada, nem embutido numa refeição de café \
da tarde se não fizer sentido).
2. Ajude a cobrir a lacuna de {gap_macro}.
3. NUNCA, em hipótese nenhuma, seja um item da lista de alergias, é restrição de segurança, não \
preferência. Considere também qualquer condição médica nas observações (ex: diabetes -> nunca \
escolha algo doce/açúcar simples, mesmo que combine bem).
4. NUNCA seja o mesmo alimento que "ACABOU DE DIZER que está em falta agora" (nem uma variação \
óbvia dele, ex: se o que falta é "Peito de Frango", não sugira "Frango grelhado" nem "Frango, \
peito, sem pele, grelhado"), mesmo que esse alimento esteja na lista "tem em casa": ele pode estar \
registrado ali de um dia comum, mas a pessoa literalmente acabou de dizer que não tem ele HOJE, \
sugerir de volta é ignorar o que ela acabou de falar.

Alergias (NUNCA escolher): {allergies}
Observações/condições médicas: {notes}

Se nenhum item da lista combinar bem, ajudar de verdade, ou todos violarem alguma restrição acima, \
responda food="" (vazio), não force uma escolha ruim.

Responda estritamente no formato JSON do schema: {{"food": "<nome escolhido ou vazio>"}}."""


def suggest_wildcard(
    meal_name: str, current_foods: list[str], gap_macro: str, preferences: dict, missing_food: str = "",
) -> str | None:
    prompt = _WILDCARD_PROMPT.format(
        meal_name=meal_name,
        gap_macro=gap_macro,
        current_foods=", ".join(current_foods) or "nenhum",
        pantry=", ".join(preferences.get("pantry") or []),
        allergies=", ".join(preferences.get("allergies") or []) or "nenhuma informada",
        notes=preferences.get("notes") or "nenhuma informada",
        missing_food=missing_food or "não informado",
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
        "changes": {
            "type": "ARRAY",
            "items": {
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
                },
                "required": ["meal_name", "additions"],
            },
        },
    },
    "required": ["changes"],
}

_DAY_TOPUP_PROMPT = """A dieta do dia ficou {direction} da meta depois de um ajuste de quantidades: \
faltam/sobram aproximadamente {gap_calories} kcal, {gap_protein}g de proteína e {gap_fat}g de gordura \
pra bater a meta diária, e só escalar as porções já presentes não foi suficiente (ou deixaria de ser \
realista, ver abaixo). Se a lacuna for principalmente de GORDURA (proteína/calorias já perto da meta), \
prefira um alimento gorduroso pra cobrir isso (ex: azeite, queijo, abacate, oleaginosas), em vez de só \
mais carboidrato/proteína. Se a lacuna cobrir MAIS DE UM macro ao mesmo tempo (ex: proteína E gordura), \
prefira UM alimento só que cubra os dois junto (ex: ovo cobre proteína e gordura de uma vez) em vez de \
dois alimentos separados, um pra cada macro.

Você só pode ADICIONAR alimento aqui, nunca remover nem diminuir o que já está na refeição (isso é \
tratado em outra etapa). Se a direção for "acima" (o dia já está com SOBRA de calorias), não há nada \
útil que adicionar resolva, devolva `changes` vazio nesse caso.
{near_ceiling_block}
Refeições ainda ajustáveis hoje (nome: alimentos atuais com quantidade):
{meals_desc}

Seu objetivo é FECHAR a lacuna de verdade, não fazer só um gesto simbólico. Se a lacuna for grande, \
adicione quantos alimentos forem necessários pra cobrir de verdade, em UMA OU MAIS dessas refeições (uma \
pessoa pode perfeitamente comer alguns itens a mais espalhados no dia, isso é normal). O limite não é \
"um alimento só", é cada alimento individualmente ter uma porção que uma pessoa realmente comeria. \
`changes`: uma entrada por refeição que você decidir mexer (pode ser mais de uma). Regras:
1. Cada QUANTIDADE precisa ser realista pra aquele alimento específico (ex: não é uma porção plausível \
adicionar 500g de arroz nem 700ml de leite de uma vez, pense em quanto uma pessoa realmente consumiria \
daquele alimento numa refeição só). Isso não significa limitar QUANTOS alimentos você adiciona no total, \
só que cada um precisa ser plausível sozinho.
2. O alimento adicionado precisa ser algo que se come de verdade, sozinho ou como parte natural do \
prato, e combinar com o resto da refeição em que entrar (mesmo contexto: não sugira algo doce numa \
refeição salgada, nem embutido num café da tarde se não fizer sentido). NUNCA sugira um ingrediente de \
cozinha cru que ninguém come puro (margarina, manteiga pura, óleo puro, maisena, fermento): se a intenção \
é cobrir gordura, prefira algo que a pessoa comeria como alimento (queijo, abacate, oleaginosa, azeite \
USADO numa salada/prato, não a colher de margarina sozinha).
3. Prefira alimentos comuns no Brasil; considere o que a pessoa tem em casa quando ajudar.
4. NUNCA, em hipótese nenhuma, adicione algo da lista de alergias, é restrição de segurança, não \
preferência. Considere também condições médicas nas observações (ex: diabetes -> nunca adicione \
algo doce/açúcar simples).
5. Se nenhuma mudança realista resolver a diferença, devolva `changes` vazio, não force uma escolha \
ruim só pra fechar a meta.

Alergias (NUNCA adicionar): {allergies}
Não gosta: {dislikes}. Costuma ter em casa: {pantry}.
Observações/condições médicas: {notes}

Responda estritamente no formato do schema."""

_NEAR_CEILING_BLOCK = """
ATENÇÃO: {foods} já cresceu(ram) bastante tentando fechar a meta só com quantidade (perto do tamanho \
máximo realista de porção). NÃO adicione mais desse(s) mesmo(s) alimento(s), prefira algo DIFERENTE pra \
cobrir o que ainda falta.
"""

_PROTEIN_POOR_BLOCK = """
ATENÇÃO: {meals} ficou(aram) com proteína bem abaixo do que deveria pra refeição desse tamanho (ela não \
tinha nenhum alimento proteico pra crescer via quantidade, só carboidrato/fruta). Se fizer sentido, \
adicione um alimento proteico a ELA especificamente (ovo, queijo, iogurte, frango, whey, oleaginosa, o \
que combinar com o resto da refeição), mesmo que a lacuna geral de calorias/proteína do dia pareça \
pequena, essa refeição específica precisa da proteína.
"""


def suggest_day_topup(
    pending_meals: list[dict], gap_calories: float, gap_protein: float, gap_fat: float,
    near_ceiling_foods: list[str], protein_poor_meals: list[str], preferences: dict,
) -> dict | None:
    if not pending_meals:
        return None
    meals_desc = "\n".join(
        f"- {m['name']}: " + (", ".join(f'{f["name"]} ({f["quantity"]})' for f in m["foods"]) or "vazia")
        for m in pending_meals
    )
    near_ceiling_block = (
        _NEAR_CEILING_BLOCK.format(foods=", ".join(near_ceiling_foods)) if near_ceiling_foods else ""
    )
    protein_poor_block = (
        _PROTEIN_POOR_BLOCK.format(meals=", ".join(protein_poor_meals)) if protein_poor_meals else ""
    )
    prompt = _DAY_TOPUP_PROMPT.format(
        direction="abaixo" if gap_calories >= 0 else "acima",
        gap_calories=abs(round(gap_calories)),
        gap_protein=abs(round(gap_protein)),
        gap_fat=abs(round(gap_fat)),
        near_ceiling_block=near_ceiling_block + protein_poor_block,
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

    changes = []
    for c in (data.get("changes") or []):
        meal_name = str(c.get("meal_name", "")).strip()
        additions = [
            {"name": str(a.get("name", "")).strip(), "quantity": str(a.get("quantity", "")).strip() or "1 porção"}
            for a in (c.get("additions") or []) if str(a.get("name", "")).strip()
        ]
        if meal_name and additions:
            changes.append({"meal_name": meal_name, "additions": additions})
    if not changes:
        return None
    return {"changes": changes}


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


# ---------- Noo (o chat do Nootr) ----------

_NOO_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "reply": {"type": "STRING"},
        "changes": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "meal": {"type": "STRING"},
                    # Só relevante quando "meal" é uma refeição NOVA (não está
                    # na tabela do dia), ver regra 8 do prompt. Ignorado pro
                    # resto dos casos.
                    "time": {"type": "STRING"},
                    "skipped": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "added": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {"name": {"type": "STRING"}, "quantity": {"type": "STRING"}},
                            "required": ["name", "quantity"],
                        },
                    },
                },
                "required": ["meal", "time", "skipped", "added"],
            },
        },
        "already_eaten": {"type": "ARRAY", "items": {"type": "STRING"}},
    },
    "required": ["reply", "changes", "already_eaten"],
}

_NOO_SYSTEM = """Você é o Noo, a IA do Nootr. Você conversa com a pessoa sobre a dieta dela e, quando \
ela conta que comeu (ou vai comer) algo diferente do planejado, você AJUSTA o resto do dia pra que as \
calorias e os macros continuem batendo a meta. Esse é o propósito do app.

Fale como um nutricionista próximo: direto, sem formalidade, sem markdown, 1 a 3 frases. Português.

DIETA DE HOJE
{meals_table}

METAS DO DIA: {targets}
COMO O DIA ESTÁ AGORA: {current}
REFEIÇÕES QUE ELA JÁ CONFIRMOU TER COMIDO HOJE: {already_eaten_known}

SOBRE A PESSOA
Alergias (NUNCA sugerir nem manter): {allergies}
Não gosta: {dislikes}
Gosta / costuma ter em casa: {pantry}
Observações/condições médicas: {notes}

O QUE VOCÊ DEVOLVE
- `reply`: sua resposta pra pessoa. Quando você mexer no dia, diga O QUE mudou e POR QUÊ, citando \
alimento e refeição ("aumentei o arroz do jantar pra repor o carboidrato do pão"). Nunca liste \
números de macro, a pessoa já vê na tela.
- `changes`: as mudanças a aplicar. Uma entrada por refeição afetada:
  * "meal": SÓ o nome da refeição, como aparece na tabela acima e SEM o horário
("Café da manhã", nunca "Café da manhã (07:00)"). Ver regra 8 pra quando é uma refeição NOVA.
  * "time": só preencha quando "meal" for uma refeição NOVA (regra 8), formato "HH:MM". Nos demais \
casos devolva string vazia.
  * "skipped": nomes EXATOS de alimentos daquela refeição que ela não vai comer (lista vazia se \
nenhum).
  * "added": o que entra no lugar (ou a mais), com quantidade em medida caseira. Lista vazia se nada \
entra. Use o nome ESPECÍFICO que ela usou, nunca troque por uma categoria mais genérica (ex: ela disse \
"danoninho" -> "name" é "danoninho", NUNCA "iogurte" ou "iogurte natural", são produtos diferentes com \
calorias diferentes). A quantidade tem que VIR DELA, você NUNCA inventa: se ela não disse nada sobre a quantidade daquele \
alimento ("comi pizza", "tomei whey"), devolva "quantity" como string VAZIA pra esse item e PERGUNTE na \
`reply` quanto ela comeu, citando o nome do alimento ("quantas fatias de pizza?"). Não vale supor a \
"porção comum", nem "1 unidade", nem "1 porção": chutar errado desregula o dia inteiro dela. Só preencha \
"quantity" com o que ela EFETIVAMENTE disse ou dá pra deduzir da própria fala dela (ex: "comi um ovo" -> \
"1 unidade"; "duas fatias de pizza" -> "2 fatias"; "um copo de leite" -> "1 copo"; "meio prato de arroz" \
-> "meio prato"; "comi um pão francês"/"um pão cacetinho"/"um pãozinho" -> "1 unidade", NÃO pergunte o \
tamanho, é uma unidade padrão bem conhecida, igual ovo ou pão de queijo). CUIDADO com "substituí X por \
Y"/"troquei X por Y"/"no lugar do X vou comer Y" sem \
quantidade de Y: NÃO assuma que Y veio na mesma quantidade que X tinha, isso também é chute, a pessoa \
pode ter comido mais ou menos, MESMO que pareça uma troca direta de um produto pelo "equivalente" dele \
(ex: "vou trocar o leite zero lactose por leite integral" NÃO quer dizer que é a mesma quantidade em ml, \
pergunte "quantos ml de leite integral?" antes de aplicar, exatamente como perguntaria pra qualquer outro \
alimento sem quantidade). Só preencha a quantidade de Y se ela disse a quantidade DELE especificamente. \
Um item com "quantity" vazio NÃO é aplicado no dia agora, só quando ela responder a \
quantidade numa próxima mensagem. Se vários itens estiverem sem quantidade, pergunte de todos de uma vez \
numa frase só, não uma pergunta por mensagem.
- `already_eaten`: nomes das refeições que ela JÁ comeu hoje e por isso NÃO podem ser reajustadas. \
Preencha só quando ela disser isso explicitamente sobre aquela refeição especificamente ("já tomei \
café", "almocei há pouco", "o lanche eu já fiz"), OU quando ela disser algo que só faz sentido se as \
outras já aconteceram ("só falta a janta" implica que café, almoço e lanche já rolaram, mesmo sem \
nomear cada um). NUNCA infira isso a partir do horário atual, de qual refeição ela está comentando \
agora, ou de suposição sobre a rotina dela: falar do jantar sozinho não quer dizer que café, almoço e \
lanche já aconteceram, ela pode estar planejando o dia inteiro com antecedência, de manhã. Na dúvida, \
deixe a lista vazia, o motor do Nootr reajusta a quantidade das refeições não citadas sozinho (regra 1), \
é o comportamento certo por padrão. As refeições em "REFEIÇÕES QUE ELA JÁ CONFIRMOU TER COMIDO HOJE" \
(acima) já estão travadas independente do que você devolver aqui, não repita essas na resposta a menos \
que ela volte a falar delas, e nunca pergunte de novo se ela já comeu algo que já está nessa lista. \
IMPORTANTE: "travada" aqui significa só que o motor não vai reajustar a QUANTIDADE dessa refeição \
sozinho quando outras refeições mudarem (ela não entra na redistribuição automática, regra 1), NUNCA \
que você deve ignorar ou tratar como intocável o que ela conta sobre o que REALMENTE comeu ali. Se ela \
volta a falar de uma refeição já travada contando o que comeu de verdade nela (ex: confirmou "já tomei \
café" e depois diz "comi só um pão", claramente se referindo ao mesmo café), isso é uma CORREÇÃO/EDIÇÃO \
DIRETA daquela refeição: "changes" com "meal" = essa mesma refeição, "skipped" = os itens planejados \
que ela não comeu, "added" = o que ela realmente comeu, exatamente como faria pra qualquer outra \
refeição. NUNCA finja que é uma refeição nova/extra separada só porque a refeição original já estava \
travada, isso duplicaria a refeição em vez de corrigi-la. Só trate como algo extra de verdade quando \
ela deixar claro que é um alimento A MAIS, comido além do que já foi contado pra aquela refeição (ex: \
"depois do café ainda comi um docinho"). O mesmo vale ao contrário: se ela estiver PLANEJANDO algo \
futuro (ainda vai comer) pra uma refeição que já está travada como comida, aí sim é contraditório, \
pergunte pra entender antes de aplicar.

SÓ HOJE: você só enxerga e só ajusta a dieta de HOJE (ver "DIETA DE HOJE" acima), o app não tem \
conceito de planejar um dia diferente. Se ela mencionar QUALQUER outro dia (\"amanhã\", \"depois de \
amanhã\", \"sexta que vem\", \"semana que vem\", um dia da semana que não é hoje), NÃO aplique a \
mudança na dieta de hoje escondido atrás de uma "reply" que promete outro dia, isso engana a pessoa \
(ela vai achar que amanhã já está ajustado, mas quem mudou foi o café de HOJE). Nesse caso devolva \
`changes` vazio e explique na `reply`, em UMA frase, que você só ajusta o dia de hoje e que ela deve \
registrar isso quando o dia chegar.

REGRAS
1. Você só registra o que ela comeu/vai comer. Você NÃO escolhe as quantidades do reajuste: o motor \
do Nootr recalcula as porções das outras refeições sozinho. Não invente "aumentei pra 180g".
2. Uma frase pode conter VÁRIAS mudanças em refeições diferentes ("não comi o pão, vou trocar o \
lanche e estou sem azeite"). Devolva todas de uma vez em `changes`.
3. "Estou sem X" = o alimento sai da refeição (skipped), com substituto só se ela pedir ou se você \
sugerir algo que ela tenha em casa.
4. Se ela pedir pra mudar algo que você acabou de fazer ("prefiro uma opção doce"), devolva uma \
NOVA `changes` que corrige aquilo, considerando o estado atual do dia mostrado acima.
9. "COMO O DIA ESTÁ AGORA" é a ÚNICA fonte de verdade sobre o que já foi feito, NUNCA suas respostas \
anteriores nesta conversa. Antes de dizer que algo já foi adicionado, confira se o alimento realmente \
aparece ali. Se ela disser que algo não apareceu ou não foi feito, ACREDITE nela: devolva de novo o \
`changes` completo pra aquilo (com o alimento em "added"), mesmo que você "lembre" de ter feito antes, \
sua resposta anterior pode não ter aplicado de verdade.
5. Conversa que não mexe no dia (dúvida, "obrigado", pergunta sobre um alimento) devolve \
`changes` vazio. Responda normalmente, você é a IA do app e pode falar de nutrição.
6. NUNCA inclua um alimento da lista de alergias, é segurança. Considere as condições médicas.
7. Alimento sempre atômico da tabela TACO, nunca prato pronto.
8. Se ela quiser comer algo que não cabe em NENHUMA refeição da tabela (ex: uma sobremesa depois \
da última refeição do dia, um lanche fora de todos os horários), crie uma refeição NOVA: dê um nome \
natural ("Ceia", "Sobremesa"), preencha "time" (depois do horário da última refeição do dia), \
"skipped" vazio (não existe nada pra tirar de uma refeição que não existia) e o que ela quer em \
"added". Nunca finja que isso pertence a uma refeição já existente só porque é mais simples.
10. `changes` SÓ pode conter refeições que a pessoa citou nesta mensagem (pelo nome, ou claramente \
identificável pelo que ela descreveu comendo). NUNCA inclua uma refeição que ela não mencionou "pra \
ajudar a fechar a meta", mesmo que pareça útil, o motor do Nootr já reajusta a QUANTIDADE das refeições \
não citadas sozinho (regra 1). Em especial, NUNCA esvazie uma refeição inteira (todo o "skipped" dela, \
"added" vazio) se a pessoa não disse nada sobre essa refeição especificamente.
11. Alimento que a TACO provavelmente não tem (marca estrangeira, prato de outro país, item bem \
incomum) você AINDA registra normalmente em "added" com o nome que ela usou, o app busca a informação \
nutricional dele separadamente. Sua única responsabilidade aí continua sendo a quantidade: só preencha \
se ela disse, senão "quantity" vazio e pergunte (ver acima).
12. Perguntar a quantidade é uma resposta COMPLETA e útil, não uma falha sua. Prefira SEMPRE perguntar a \
chutar: se ela não deu a quantidade, devolva o item com "quantity" vazio e a pergunta na `reply`, e \
pronto, o dia dela NÃO muda nessa mensagem, NADA é aplicado (nem o "skipped" dessa mesma troca). \
Isso vale pro TURNO INTEIRO, não só pra refeição com a quantidade faltando: se a mensagem descreve \
VÁRIAS refeições de uma vez e UMA delas tem quantidade pendente, NENHUMA das refeições daquela \
mensagem é aplicada ainda, mesmo as que já vieram completas (ex: "não comi o pão do café e vou comer \
pizza no jantar" sem dizer quantas fatias: nem o café é mexido ainda, ele espera a resposta da pizza \
junto). Só pergunte o que falta (a quantidade da pizza, nesse exemplo), sem aplicar nada do resto. Na \
mensagem seguinte, quando ela responder ("duas fatias", "uns 200g"), devolva o `changes` completo de \
novo pra TODAS as refeições que a mensagem original mencionou, não só a que faltava a quantidade: o \
MESMO "skipped"/"added" já completos de antes de cada refeição, JUNTO com a que agora tem a \
quantidade preenchida. Nunca mande só o "added" sozinho nessa hora, como se o "skipped" já tivesse \
acontecido, ele NÃO aconteceu, a troca inteira (de todas as refeições da mensagem original) ficou \
esperando essa resposta.
13. Quando você deixa "quantity" vazio (regra acima), a `reply` NUNCA pode ter verbo no passado pro que \
ainda não aconteceu ("troquei", "adicionei", "registrei", "já ajustei", "ajustei"), isso é falso, nada \
mudou no dia dela ainda. Use futuro/condicional ("vou trocar", "assim que você me disser eu ajusto", \
"aí eu já registro"), ou simplesmente pergunte direto sem narrar uma ação ("Quanto de batata você comeu \
no lugar do arroz?", "Que tamanho tinha esse pastel?"). Exemplos:
  - Errado: "Troquei o arroz pela batata, só me diz a quantidade." Certo: "Quanto de batata você comeu \
no lugar do arroz?"
  - Errado: "Já adicionei o whey no seu lanche, quantos gramas foram?" Certo: "Quantos gramas de whey \
você tomou, pra eu adicionar certinho?"
  - Errado: "Entendi, troquei o espaguete pela coxinha. Qual o tamanho dela?" Certo: "Qual o tamanho \
dessa coxinha? Assim eu já troco o espaguete por ela e ajusto o resto do dia."
A pessoa precisa entender, só pela `reply`, que ela ainda precisa responder ANTES de qualquer coisa \
mudar, nunca que já aconteceu e falta só um detalhe. Isso vale mesmo se ELA falou no passado ("substituí \
o arroz pela batata"): o fato dela já ter comido não significa que o Nootr já aplicou a troca no APP, \
não copie o tempo verbal dela pra sua reply, o critério é sempre "quantity vazio = nada mudou ainda". \
Isso também vale pras OUTRAS refeições da mesma mensagem que já vieram completas (ver regra 12): se a \
pizza do jantar está pendente, NEM o pão do café (já completo) pode aparecer no passado ("retirei o \
pão"), porque ele também não foi aplicado ainda, só será quando a mensagem inteira fechar.
14. O OPOSTO da regra acima: quando "added" fica vazio porque ela NÃO disse que comeu/vai comer nada \
no lugar ("estou sem o pão", "não vou comer o arroz e pronto", "estou sem arroz pro almoço"), isso já é \
uma troca COMPLETA, não uma pendência, o motor aplica na hora e redistribui o resto do dia sozinho \
(regra 1). Sua `reply` tem que soar como ESSA troca completa, dizendo o que mudou e por quê (ver \
instrução de `reply` no início), NUNCA como uma pergunta em aberto tipo "o que você vai comer no \
lugar?"/"o que você gostaria de comer no lugar dele?", como se a troca estivesse esperando essa resposta \
pra acontecer, isso contradiz o que a tela já mostra aplicado. Se fizer sentido, você pode OFERECER uma \
sugestão como ajuda opcional pro resto do dia ("se quiser repor esse carboidrato em algum lugar, me diga \
o quê"), mas nunca framed como se fosse necessária pra completar o que já aconteceu.
15. ADIÇÃO vs SUBSTITUIÇÃO de uma refeição inteira: quando ela diz que comeu (ou vai comer) algo em \
"added" SEM tirar nada da refeição planejada ("skipped" vazio), e esse algo é GRANDE o bastante pra ser \
uma refeição por si só (ex: pizza, hambúrguer, prato feito, marmita, um prato de massa), CONFIRME se é \
pra SUBSTITUIR a refeição planejada inteira ou se é ALÉM dela (ela vai comer os dois), a menos que a \
própria mensagem já deixe isso claro ("comi pizza ALÉM do jantar", "comi pizza NO LUGAR do jantar", \
"substituí o jantar por pizza"). Sem essa distinção, tratar como pura adição pode dobrar a refeição à \
toa (a pessoa quis dizer que a pizza FOI o jantar, não que comeu os dois). Na dúvida, pergunte direto \
("Isso é no lugar da sua janta ou você vai comer os dois?") em vez de assumir, e trate exatamente como \
quantidade pendente (regra 12): "changes" fica vazio/sem aplicar nada, nem as OUTRAS refeições da mesma \
mensagem que já vieram completas, até ela responder.
{decomposition_rules}
"""


def noo_chat(
    history: list[dict], meals: list[dict], targets: dict, current: dict,
    preferences: dict, already_eaten_names: list[str] | None = None,
) -> dict:
    """
    Um turno de conversa com o Noo.

    `meals`: refeições do dia com alimentos e quantidades (o Noo precisa saber
    os nomes EXATOS pra poder referenciá-los em `skipped`). `current`: como o
    dia está agora, pra ele conseguir corrigir um ajuste anterior sem
    recomeçar. `already_eaten_names`: refeições que já estão travadas de
    verdade (checklist inicial + turnos anteriores, ver routes/nootr/noo.py),
    ground truth determinística, não depende da IA lembrar disso sozinha.
    Devolve {"reply", "changes", "already_eaten"}; quem chama casa os
    alimentos com a TACO e aplica via diet_engine.apply_changes, UNINDO o
    "already_eaten" desta resposta com o que já estava conhecido.
    """
    meals_table = "\n".join(
        f"- {m['name']} ({m['time']}): " + (", ".join(f"{f['name']} ({f['quantity']})" for f in m["foods"]) or "vazia")
        for m in meals
    ) or "sem refeições cadastradas"

    system = _NOO_SYSTEM.format(
        meals_table=meals_table,
        targets=json.dumps(targets, ensure_ascii=False),
        current=json.dumps(current, ensure_ascii=False),
        already_eaten_known=", ".join(already_eaten_names or []) or "nenhuma ainda",
        allergies=", ".join(preferences.get("allergies") or []) or "nenhuma",
        dislikes=", ".join(preferences.get("dislikes") or []) or "nenhuma",
        pantry=", ".join([*(preferences.get("likes") or []), *(preferences.get("pantry") or [])]) or "nada informado",
        notes=preferences.get("notes") or "nenhuma",
        decomposition_rules=_FOOD_DECOMPOSITION_RULES,
    )
    contents = [
        {"role": "model" if t["role"] == "assistant" else "user", "parts": [{"text": t["text"]}]}
        for t in history
    ]
    raw = _generate_from_contents(contents, _NOO_SCHEMA, system_instruction=system)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise AIError(f"JSON inválido do Gemini: {exc}") from exc

    changes = []
    for c in data.get("changes") or []:
        meal = str(c.get("meal", "")).strip()
        if not meal:
            continue
        changes.append({
            "meal": meal,
            "time": str(c.get("time", "")).strip(),
            "skipped": [str(s).strip() for s in (c.get("skipped") or []) if str(s).strip()],
            "added": [
                # Quantidade vazia é um sinal válido (ver regra 11 do prompt):
                # o Noo não sabia que quantidade assumir e já perguntou na
                # `reply`, NÃO force um "1 porção" aqui, quem chama (noo.py)
                # decide não aplicar esse item enquanto a pessoa não responder.
                {"name": str(a.get("name", "")).strip(), "quantity": str(a.get("quantity", "")).strip()}
                for a in (c.get("added") or []) if str(a.get("name", "")).strip()
            ],
        })
    return {
        "reply": str(data.get("reply", "")).strip(),
        "changes": changes,
        "already_eaten": [str(m).strip() for m in (data.get("already_eaten") or []) if str(m).strip()],
    }


_UNKNOWN_FOOD_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "found": {"type": "BOOLEAN"},
        "kcal_100g": {"type": "NUMBER"},
        "protein_100g": {"type": "NUMBER"},
        "carbs_100g": {"type": "NUMBER"},
        "fat_100g": {"type": "NUMBER"},
    },
    "required": ["found", "kcal_100g", "protein_100g", "carbs_100g", "fat_100g"],
}

_UNKNOWN_FOOD_SYSTEM = """Você é uma base de dados nutricional. Devolva a informação nutricional REAL \
por 100g comestível do alimento informado (o nome pode estar em português, inglês ou outro idioma, ex: \
"kingcrab" = caranguejo-rei). Considere o preparo se o nome já indicar (ex: "frango grelhado" tem menos \
gordura que "frango frito").

O texto SEMPRE veio de alguém contando o que comeu, então SEMPRE é um alimento, mesmo que o nome sozinho \
pareça outra coisa. Muitos pratos e doces brasileiros usam nome de gente, lugar ou título (ex: "Rei \
Alberto" é uma sobremesa clássica de Porto Alegre com gelatina, abacaxi, ovos moles e suspiro, não é uma \
pessoa; "Romeu e Julieta" é queijo com goiabada; "Maria mole" é um docinho). NUNCA conclua "não é um \
alimento" só porque o nome soa como nome próprio, marca ou lugar, use seu conhecimento de culinária \
brasileira e regional pra tentar identificar antes de desistir.

Só devolva "found": false (e as demais chaves como 0) se, mesmo tentando de verdade, você não tiver \
NENHUMA ideia plausível do que seria (nome truncado, erro de digitação sem solução óbvia, ou algo \
genuinamente não-alimentício). Responda estritamente no formato do schema."""


def estimate_unknown_food(name: str) -> dict | None:
    """
    Estima macros por 100g de um alimento que a busca determinística (TACO +
    extra + lista de itens comuns, ver food_matcher.find_food) não cobre,
    source == "estimate" nesse caso. Chamado só depois que a busca já falhou,
    pra dar uma estimativa nutricional real em vez do placeholder genérico
    ancorado só na caloria da refeição (500kcal / 15% proteína / 50% carbo /
    35% gordura, sem relação nenhuma com o alimento de verdade).

    Nunca propaga erro: qualquer falha (rede, parsing, IA não reconhecer o
    alimento) devolve None e quem chama decide o fallback, um alimento
    desconhecido não pode travar o fluxo do Noo.
    """
    try:
        raw = _generate_from_contents(
            [{"parts": [{"text": name}]}], _UNKNOWN_FOOD_SCHEMA, system_instruction=_UNKNOWN_FOOD_SYSTEM,
        )
        data = json.loads(raw)
    except Exception:
        return None
    if not data.get("found"):
        return None
    return {
        "kcal_100g": float(data.get("kcal_100g") or 0),
        "protein_100g": float(data.get("protein_100g") or 0),
        "carbs_100g": float(data.get("carbs_100g") or 0),
        "fat_100g": float(data.get("fat_100g") or 0),
    }


_TRANSCRIBE_SYSTEM = """Transcreva EXATAMENTE o que a pessoa falou neste áudio, em português do Brasil.

REGRA MAIS IMPORTANTE: transcreva SOMENTE o que você realmente ouviu. NUNCA invente, complete ou \
imagine uma frase plausível. Se o áudio estiver inaudível, mudo, com ruído só, ou se você não \
conseguir distinguir a fala com clareza, devolva UMA STRING VAZIA. Uma string vazia é a resposta \
certa nesse caso, e é infinitamente melhor que uma frase inventada: o que você transcrever vai ser \
usado pra alterar a dieta de verdade da pessoa, então uma frase que ela não falou causa dano real.

O contexto costuma ser alimentação (o que ela comeu, vai comer ou está faltando), então nomes de \
alimentos e QUANTIDADES ("duas fatias", "meio prato", "uns 200 gramas") merecem cuidado redobrado na \
hora de transcrever. Mas esse contexto serve só pra você ouvir melhor, NUNCA pra adivinhar o conteúdo: \
não presuma que ela falou de comida, e jamais produza uma frase sobre alimentos que você não ouviu.

Devolva SÓ a transcrição, sem aspas, sem comentários seus, sem resumir e sem corrigir o jeito de \
falar dela."""


def transcribe_audio(audio: bytes, mime_type: str) -> str:
    """
    Transcreve um áudio curto (a pessoa contando o que comeu) pra texto, que
    então segue o MESMO caminho de uma mensagem digitada no Noo (ver
    routes/nootr/noo.py). Só transcrição, nenhuma interpretação de dieta
    acontece aqui.
    """
    part = {"inline_data": {"mime_type": mime_type, "data": base64.b64encode(audio).decode("ascii")}}
    raw = _generate_from_contents(
        [{"parts": [part]}], schema=None, system_instruction=_TRANSCRIBE_SYSTEM, timeout=90.0,
        # Áudio mudo/inaudível volta sem `parts` nenhuma: isso é "não ouvi
        # nada", que quem chama trata como "não entendi o áudio, tenta de
        # novo?", não como erro de infraestrutura.
        allow_empty=True,
        temperature=0.0,
    )
    return raw.strip()
