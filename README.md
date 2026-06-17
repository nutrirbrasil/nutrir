# Nutrir Ecosystem

Monorepo com dois produtos:

| Projeto | Pasta | Porta dev | Descrição |
|---------|-------|-----------|-----------|
| **Nutrir** | `nutrir/` | 3000 | Marmitaria — cardápio, pedidos, monte sua marmita |
| **Nootr** | `nootr/` | 3001 | App de substituições alimentares |
| **API** | `backend/` | 8000 | Backend compartilhado (FastAPI) |

## Estrutura

```
Nutrir/
├── backend/           # API FastAPI
├── nutrir/            # Site da marmitaria (Next.js)
├── nootr/             # App de nutrição (Next.js)
└── supabase/          # Migrations SQL
```

## Como rodar

### 1. Backend

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
pip install -r requirements.txt
# Na raiz do monorepo, copie .env.example → .env
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

> Rode o uvicorn **na raiz** do monorepo (`Nutrir/`), não dentro de `backend/`.

### 2. Nutrir (marmitaria)

```bash
cd nutrir
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000)

### 3. Nootr (app)

```bash
cd nootr
npm install
npm run dev
```

Abre em [http://localhost:3001](http://localhost:3001)

## Rotas Nutrir (site)

| Rota | Função |
|------|--------|
| `/` | Landing |
| `/cardapio` | Cardápios da semana |
| `/pedido` | Fazer pedido (notifica admin) |
| `/montar` | Monte sua própria marmita |

## Rotas Nootr (app)

| Rota | Função |
|------|--------|
| `/` | Home / visão geral |
| `/dieta` | Dieta do dia |
| `/substituir` | Comi diferente · Vou comer diferente · Estou em falta |

## API

Documentação interativa: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

Prefixos:
- `/nutrir/*` — cardápios, pedidos, marmita customizada
- `/nootr/*` — dietas e substituições (MVP)
