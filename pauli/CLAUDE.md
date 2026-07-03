# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Sempre responda em português**, independentemente do idioma da mensagem do usuário.

## Project

Pauli — a Next.js 14 (App Router) marketing/portfolio site for **Paula Pastorino** (CRN 18489D), a nutricionista clínica e esportiva based in Balneário Piçarras, SC, live at `pauli.nutrirpicarras.com.br`. Paula is the site owner and the sole editor via the `/admin` CMS. She is the fiancée of Pedro (the user working in this repo), who builds and maintains the site on her behalf. Mostly static content plus a markdown-based blog editable through a CMS. Much lower risk surface than Nutrir (no payments, no customer accounts, no sensitive data beyond public business info) — but it has the only **automatic** deploy pipeline in the monorepo, so pushes here are more consequential than in `nutrir/` or `nootr/`. This file covers only `pauli/`; see the repo root `CLAUDE.md` for the monorepo overview and shared VPS notes.

## Commands

```bash
npm install
npm run dev      # localhost:3002
npm run build
npm run start    # -p 3002, used in production
npm run lint
npx tsc --noEmit # no test suite exists — this + build are the correctness checks
```

Copy `.env.example` to `.env.local`. `DECAP_GITHUB_CLIENT_ID`/`DECAP_GITHUB_CLIENT_SECRET` are only needed to test the `/admin` CMS login locally; the rest of the site works without them.

## Architecture

### Content & blog

Blog posts are markdown files in `content/blog/*.md` (frontmatter + body), read via `lib/blog.ts` (`gray-matter` for frontmatter, `remark`/`remark-html` to render). `getAllPosts()` filters out drafts before they reach `app/sitemap.ts` / the public blog listing. Post rendering (`components/blog/PostBody.tsx`) uses `dangerouslySetInnerHTML` on the rendered markdown — safe only because the content source is repo-committed files edited exclusively through the CMS by the site owner, never arbitrary user input; don't reuse that rendering path for anything that could contain third-party content.

Static site config/copy (name, CRN, phone, plans, testimonials, FAQ) lives in `lib/site.ts`, `lib/faq-data.ts`, `lib/testimonials-data.ts` — edit these directly for copy changes rather than hunting through components.

### CMS (`/admin`)

Editorial access is via **Decap CMS**, a static admin UI served from `public/admin/` and reached through the rewrite in `next.config.js` (`/admin` → `/admin/index.html`). Authentication is a GitHub OAuth flow implemented in `app/api/decap-auth/route.ts` (kicks off the OAuth redirect) and `app/api/decap-auth/callback/route.ts` (handles the callback, exchanges the code, posts the token back to the CMS popup via `window.opener.postMessage`) against the `nutrirbrasil/nutrir` repo with `repo` scope. There's no additional app-level gate beyond GitHub OAuth + repo access — whoever can authenticate as a GitHub collaborator with repo write access can publish. `redirect_uri` is always built server-side from the configured site URL, never taken from client input, so there's no open-redirect risk there.

### Deploy — this project auto-deploys

`.github/workflows/deploy-pauli.yml` triggers on every push to `main` that touches `pauli/**` (or the workflow file itself). It SSHes into the VPS, does `git reset --hard origin/main` on the **whole monorepo checkout** (not just `pauli/`), rebuilds, and restarts `pauli-web` via pm2 — then smoke-tests by curling `/blog` locally on the VPS for a known post title. **This means:**
- Pushing to `main` with any change under `pauli/` deploys it live within minutes, unencrypted from manual review — be more careful about what lands on `main` for this folder than you would need to be for `nutrir/` or `nootr/`, which deploy manually.
- Because the workflow does `git reset --hard` on the shared monorepo checkout on the VPS, an in-progress uncommitted change made directly on the server (rare, but possible during manual debugging) would be destroyed by the next Pauli auto-deploy.
- Manual deploy, if ever needed outside the Action:
  ```bash
  cd ~/nutricao/pauli && npm install && npm run build && pm2 restart pauli-web
  ```

See the root `CLAUDE.md` for the shared-VPS caveats (the same server also runs an unrelated trading project under the same Linux user, and `nutrir-web` shares the same pm2 `ecosystem.config.js`).
