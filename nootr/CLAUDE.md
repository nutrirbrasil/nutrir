# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Nootr — a Next.js 14 (App Router) frontend plus its own FastAPI backend (`backend/`, inside this folder) for a food-substitution app ("comeu fora do plano? o Nootr ajusta o resto do dia"). **Not deployed** — no pm2 entry, no nginx config, no production domain. Treat this as early-stage/MVP: the backend returns placeholder logic and mock data, not real ones. This project is fully self-contained under `nootr/` (frontend + backend); see the repo root `CLAUDE.md` for the monorepo overview.

## Commands

```bash
npm install
npm run dev      # localhost:3001
npm run build
npm run start    # -p 3001
npm run lint
npx tsc --noEmit # no test suite exists — this + build are the correctness checks
```

Copy `.env.example` to `.env.local` — only variable is `NEXT_PUBLIC_NOOTR_API_URL` (defaults to `http://127.0.0.1:8000` if unset). The frontend needs the FastAPI backend running to show anything beyond the home page.

Backend (run from **this `nootr/` folder** — the `backend.app.*` module path resolves because `backend/` is a subpackage here; it will NOT resolve from the repo root anymore):
```bash
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```
`backend/app/config.py` derives its `.env` location as three parents up from itself, which now resolves to this `nootr/` folder — so it reads `nootr/.env` (not the repo-root `.env`). Nothing in the `nootr` routes uses those settings yet, so this is inert today, but keep it in mind if you wire up Supabase/Telegram later.

## Architecture

### Frontend is a thin client over the FastAPI backend

`lib/api.ts` (`nootrApi`) is the entire data layer — two calls, both hitting `NEXT_PUBLIC_NOOTR_API_URL`:
- `getTodayDiet()` → `GET /nootr/diets/today`, used by `app/dieta/page.tsx` (server component, fetches at render time).
- `suggestSubstitution(body)` → `POST /nootr/substitutions`, used by `app/substituir/page.tsx` via `components/SubstitutionPanel`.

Types in `lib/types.ts` (`Diet`, `Meal`, `Food`, `SubstitutionAction`, `SubstitutionResult`) mirror the FastAPI Pydantic models in `backend/app/routes/nootr/*.py` (relative to this folder) by hand — there's no shared schema/codegen, so if you change one side, update the other manually.

Three pages total: `/` (home, static), `/dieta` (today's diet + macros), `/substituir` (log an off-plan meal or missing ingredient and get an adjusted plan for the rest of the day).

### Backend (`backend/app/`) — only the `nootr` route group is relevant here

`backend/app/main.py` mounts two route groups: `nootr` (`diets.py`, `substitutions.py`) and `nutrir` (`menus.py`, `orders.py`, `custom_meals.py`). **The `nutrir` route group is legacy and not used by the live Nutrir site** — the real `nutrir/` Next.js app has its own `app/api/nutrir/*` routes backed by Supabase and doesn't call this FastAPI backend at all. Don't assume changes here affect production ordering; if working on Nootr, you only need `backend/app/routes/nootr/`.

`backend/app/services/store.py` is explicitly mock data ("Dados mock para desenvolvimento (substituir por Supabase depois)") — a single hardcoded `SAMPLE_DIET` and a static menu list, no persistence, no per-user data. `substitutions.py`'s `suggest_substitution()` is an explicit placeholder ("MVP: retorna sugestão estruturada... Lógica completa em desenvolvimento") — it doesn't actually compute macro adjustments, it returns the same sample diet's meals with a hardcoded calorie/protein deduction regardless of input. If asked to build out "real" substitution logic or persistence, this is greenfield work, not a bug fix — there's no existing engine or Supabase schema for Nootr to extend yet.

`backend/app/config.py` reads Supabase/Telegram settings from `nootr/.env` (via `pydantic-settings`), but nothing in the `nootr` routes currently uses Supabase — it's provisioned for future use, not wired up.

### Deploy

None yet — no pm2 process, no nginx site, no domain. If this project moves toward production, it'll need its own `ecosystem.config.js` entry and nginx config following the pattern already used for `nutrir-web`/`pauli-web` (see root `CLAUDE.md`), plus a deploy story for the FastAPI backend (now co-located under `nootr/backend/`, so it can ship alongside the Nootr frontend rather than as a separate root-level service).
