# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Responda sempre em português.

## Project

Nootr — a Next.js 14 (App Router) frontend plus its own FastAPI backend (`backend/`, inside this folder) for a food-substitution app ("comeu fora do plano? o Nootr ajusta o resto do dia"). **Not deployed yet** — no pm2 entry or nginx config live on the VPS, though `deploy/` now has the ready-to-apply artifacts. The core is real, not mock: a TACO-backed nutrition base (597 foods), a working substitution engine, per-user persistence + auth via a dedicated Supabase project, and a pytest suite. This project is fully self-contained under `nootr/` (frontend + backend); see the repo root `CLAUDE.md` for the monorepo overview.

**Supabase (Nootr's own project, separate from Nutrir):** ref `wdzzipprerboclayrcvw` ("nootr"), same org/region as Nutrir. Tables `profiles` (plano basic/pro + dados corporais + fórmula/alvo calórico), `diets` (templates montados pelo usuário; `weekday` null = base, 0–6 = seg–dom no Pro), `day_plans` (cópia materializada e ajustável do dia — onde as substituições salvas vivem), `substitution_logs` (auditoria). All RLS owner-only (`auth.uid() = user_id`). The backend never uses the service key: it forwards the user's access token to PostgREST so RLS enforces isolation; the anon key is only the `apikey`.

**Modelo de produto:** a dieta NASCE VAZIA (sem auto-provisionamento) — o usuário monta em `/montar-dieta` com alimentos da TACO (medidas caseiras ou gramas). Basic = 1 dieta base; Pro = até 7 (uma por dia da semana, fallback na base). Calorias: manuais ou calculadas por Harris-Benedict / Mifflin-St Jeor (`services/energy.py`) a partir do perfil. Nomes de exibição da TACO ("Pão francês" em vez de "Pão, trigo, francês") vêm de `backend/app/data/taco_display_names.csv` — editável, revisável item a item.

**Visual:** preto profundo + bordô, minimalista (tailwind: cores `nootr.*` em `tailwind.config.ts`; tipografia Inter + Cormorant Garamond via next/font; classes utilitárias em `app/globals.css`). Páginas: `/`, `/login`, `/dieta`, `/substituir`, `/montar-dieta`, `/perfil`, `/termos`, `/privacidade`.

## Commands

```bash
npm install
npm run dev      # localhost:3001
npm run build
npm run start    # -p 3001
npm run lint
npx tsc --noEmit # + build são as checagens de tipo do frontend
```

Copy `.env.example` to `.env.local`. Frontend vars: `NEXT_PUBLIC_NOOTR_API_URL` (default `http://127.0.0.1:8000`), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The frontend needs both the FastAPI backend running AND Supabase auth configured — `/dieta` and `/substituir` exigem login (redirecionam para `/login`).

Backend (run from **this `nootr/` folder** — the `backend.app.*` module path resolves because `backend/` is a subpackage here; it will NOT resolve from the repo root anymore):
```bash
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
python -m pytest          # 23 testes (engine, matcher, portion, rotas)
```
The backend reads `nootr/.env` (SUPABASE_URL, SUPABASE_ANON_KEY, optional EXTRA_CORS_ORIGINS). `config.py` derives the `.env` path as three parents up from itself → resolves to this `nootr/` folder.

## Architecture

### Frontend: client-side, autenticado

Auth via `@supabase/supabase-js` (`lib/supabase.ts` + `components/AuthProvider.tsx`, contexto com a sessão). O browser chama a API **diretamente** (páginas viraram client components) — por isso `/dieta` e `/substituir` usam `components/RequireAuth.tsx` (redireciona para `/login` sem sessão) e passam o `access_token` para `lib/api.ts`. **Implicação de deploy:** a API precisa ser pública em produção (não é proxy interno do Next) e o CORS do backend precisa liberar o domínio do frontend (`EXTRA_CORS_ORIGINS`).

`lib/api.ts` (`nootrApi`) é a camada de dados — toda chamada recebe o `token` e manda `Authorization: Bearer`:
- `getTodayDiet(token)` → `GET /nootr/diets/today`
- `suggestSubstitution(token, body)` → `POST /nootr/substitutions` (aceita `food_taco_id`/`grams` para escolha manual)
- `searchFoods(token, q)` → `GET /nootr/foods/search` (autocomplete da TACO, usado pelo picker de baixa confiança)

Types em `lib/types.ts` espelham à mão os modelos Pydantic em `backend/app/routes/nootr/*.py` — sem codegen, atualize os dois lados juntos.

Pages: `/` (home estática), `/login`, `/dieta` (dieta do dia + macros), `/substituir` (registra desvio/falta e ajusta o dia).

### Backend (`backend/app/`) — only the `nootr` route group is relevant here

`backend/app/main.py` mounts two route groups: `nootr` (`diets.py`, `substitutions.py`, `foods.py`) and `nutrir` (`menus.py`, `orders.py`, `custom_meals.py`). **O grupo `nutrir` é legado e não é usado pelo site Nutrir em produção** — o app `nutrir/` tem suas próprias rotas `app/api/nutrir/*` no Supabase. Para Nootr, só interessa `backend/app/routes/nootr/`.

**Fluxo de dados (real, não mais mock):**
- `data/taco.py` + `taco.csv` — base TACO (597 alimentos), cacheada em memória.
- `services/nutrition.py` — escala macros da TACO por gramas.
- `services/portion.py` — interpreta porções em PT ("2 fatias", "1 colher de sopa", "meia xícara") → gramas.
- `services/food_matcher.py` — casa texto livre com um alimento: `_COMMON_FOODS` (fast-food/industrializados que a TACO não cobre) → busca ranqueada na TACO (prefere ingrediente principal, evita miúdos, respeita preparo) → estimativa genérica (baixa confiança). Também `food_from_taco_id` para escolha manual.
- `services/diet_engine.py` — o motor: substitui a refeição alvo, calcula o delta de kcal e redistribui nas refeições seguintes do dia (protege proteína). Na última refeição, informa honestamente o saldo do dia em vez de fingir redistribuição.
- `services/diet_provisioning.py` — monta a dieta-template padrão da TACO para usuário novo.
- `services/repository.py` + `supabase_client.py` + `auth.py` — persistência via PostgREST sob o token do usuário (RLS), auth via GoTrue.
- `services/store.py` — agora só dados mock das rotas legadas do `nutrir` (menus/ingredientes/pedidos); as rotas do Nootr não o usam mais.

Testes em `backend/tests/` (`python -m pytest` a partir de `nootr/`) cobrem engine, matcher, portion e as rotas (com repository fake em memória, sem tocar a rede).

### Deploy

Artefatos prontos em `deploy/` (`DEPLOY.md`, `ecosystem.nootr.config.js`, `nginx-nootr.conf`) — **ainda não aplicados na VPS** (blast radius compartilhado, ver root `CLAUDE.md`). São **dois processos**: nootr-web (Next, 127.0.0.1:3003) e nootr-api (uvicorn, 127.0.0.1:8010), cada um com seu subdomínio, porque o frontend chama a API pelo browser. Ver `deploy/DEPLOY.md` para o runbook completo.
