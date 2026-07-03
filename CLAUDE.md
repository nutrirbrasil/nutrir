# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

Monorepo with three independent Next.js sites, all deployed to a single Hetzner VPS. The root folder is named `nutricao` specifically to avoid confusion with `nutrir/` (the marmitaria site) — the two are not interchangeable. Nootr additionally has its own FastAPI backend, co-located under `nootr/backend/` (moved there from the repo root so each project is self-contained).

| Project | Path | Dev port | Status | Details |
|---|---|---|---|---|
| **Nutrir** (marmitaria — orders, payments, customer accounts) | `nutrir/` | 3000 (dev) / 3001 (prod) | Live, `nutrirpicarras.com.br` | [nutrir/CLAUDE.md](nutrir/CLAUDE.md) |
| **Pauli** (nutritionist marketing site + blog) | `pauli/` | 3002 | Live, `pauli.nutrirpicarras.com.br` | [pauli/CLAUDE.md](pauli/CLAUDE.md) |
| **Nootr** (food-substitution app) | `nootr/` | 3001 | In development, not deployed | [nootr/CLAUDE.md](nootr/CLAUDE.md) |

**Each project has its own `CLAUDE.md` with the real detail — read that one when working inside `nutrir/`, `pauli/`, or `nootr/`.** This root file only covers what's shared across all of them. If you're operating a session scoped to one project subfolder, you generally don't need the other two projects' files.

The three Next.js apps are fully independent — no shared code, no shared `node_modules`, no imports across `nutrir/`, `pauli/`, `nootr/`. The FastAPI backend lives entirely under `nootr/backend/` and is used only by Nootr (see `nootr/CLAUDE.md` — its `nutrir` route group is legacy/unused mock data, not connected to the live Nutrir site, which has its own Supabase-backed `app/api/*` routes).

## VPS / deployment (shared across projects)

Deployed to a single Hetzner VPS (Ubuntu 24.04) at `/home/zeedo/nutricao/`, managed by pm2 via the root `ecosystem.config.js` (`nutrir-web`, `pauli-web` — Nootr has no pm2 entry, not deployed). Both Next.js processes are bound to `127.0.0.1` only (via `-H 127.0.0.1`); nginx terminates TLS and reverse-proxies from there. **Do not remove the `-H 127.0.0.1` binding** — without it the apps listen on all interfaces and bypass Cloudflare/nginx entirely.

**The same VPS and the same `zeedo` Linux user also run an unrelated project** (a trading/crypto automation stack, pm2 processes `zeedo-backend`/`zeedo-frontend`/`zeedo-manager`, nginx site `zeedo`, port 3000). Any VPS-level change (nginx, pm2, firewall, the `zeedo` user itself) risks that live project too — treat VPS infrastructure changes as higher blast radius than app-level code changes, and don't assume `zeedo-*` pm2 processes or the `zeedo` nginx config belong to this repo.

If `ecosystem.config.js` itself changes (ports, args, env), use `pm2 restart ecosystem.config.js --only nutrir-web,pauli-web` from `~/nutricao` instead of restarting by name, or the new args won't be picked up.

## Supabase (used by Nutrir only)

Project ref `ocjtzacohamatjbzlind` ("nutrirbrasil"). Migrations live in `supabase/migrations/`, applied in order — check `list_migrations` against the folder before adding a new one, and prefer additive migrations over editing already-applied ones. After any DDL change, run the Supabase security/performance advisors to catch missing RLS, mutable `search_path`, or unnecessarily-exposed `SECURITY DEFINER` functions before considering the change done. See `nutrir/CLAUDE.md` for the schema/RLS details.
