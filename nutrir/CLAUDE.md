# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Responda sempre em português.

## Project

Nutrir — a Next.js 14 (App Router) marmitaria ordering site, live at `nutrirpicarras.com.br`. This is the one project in the monorepo with real payments and real customer data flowing through it — treat correctness and security here with more care than a typical marketing site. This file covers only `nutrir/`; see the repo root `CLAUDE.md` for the monorepo overview, VPS layout, and shared deploy notes.

## Commands

```bash
npm install
npm run dev      # localhost:3000
npm run build
npm run start    # -p 3001, used in production
npm run lint
npx tsc --noEmit # no test suite exists — this + build are the correctness checks
```

Copy `.env.example` to `.env.local` (never `.env` — Next.js won't load it). Without Supabase/InfinitePay/Pix/Telegram credentials set, the relevant `/api/nutrir/*` routes return `503` rather than crashing. Path alias `@/*` maps to this folder's root (`tsconfig.json`).

## Architecture

### Order flow

Guest checkout — no login required to order. Supabase Auth exists separately so returning customers can view order history at `/perfil`.

`lib/cart-context.tsx` (cart persisted in `localStorage`) → `/checkout/dados` → `/checkout/revisar` → `/checkout/pagamento` → `POST /api/nutrir/orders`. Orders get a random 5-digit id (`lib/order-id.ts`, `order-XXXXX`, 10000–99999) — this is **not** a capability token, just a display id, so order-specific routes (`/api/nutrir/orders/[id]/*`) should not be assumed safe from enumeration.

### Pricing — server is the source of truth, with one known exception

`lib/order-pricing.ts` computes the actual charged total; the client's `price_cents` per item is not trusted wholesale:

- **Plain marmitas and kits**: `validateCatalogItemPrice()` cross-checks the client-submitted base `price_cents` against the catalog (`lib/menu-data.ts` → `MENU_SECTIONS` for marmitas, `KIT_PRODUCTS` for kits) in the `POST /api/nutrir/orders` `validate()` step, and rejects the order if it doesn't match exactly.
- **Combo items are the one exception** (`lib/combo-builder-data.ts`, "monte seu combo"): the total depends on a client-side computation (`calculateComboBuild` — quantity per marmita type + a progressive per-meal discount) and is **not** re-verified server-side. This is a known, accepted gap — the store owner manually checks order totals before producing meals, so it's a business-process mitigation rather than a code fix. If asked to close this gap, the fix is to send the composition (quantities + target meal count) instead of just the final total, and recompute with `calculateComboBuild` server-side to compare.
- Coupons (`lib/coupons.ts`) and the pix/cash-vs-card discount are always computed server-side from fixed rules — the client only ever sends a coupon *code*, never a discount amount. These were already safe and don't need the same scrutiny as per-item pricing.

### Payment confirmation — never trust a "paid" flag from the client or an unsigned webhook

- `checkInfinitePayPayment()` in `lib/infinitepay.ts` is a real server-to-server call to InfinitePay's `/payment_check` endpoint. **Any code path that marks an order as paid must go through this** (or the equivalent Pix confirmation), because the InfinitePay webhook (`app/api/nutrir/webhooks/infinitepay/route.ts`) is unsigned — InfinitePay does not authenticate it, so the route re-verifies with the gateway before calling `notifyOrderPaid()` rather than trusting the POST body directly. `app/api/nutrir/orders/verify/route.ts` follows the same pattern for client-initiated polling.
- There is intentionally no endpoint that lets a client directly set `payment_status` — an earlier unauthenticated `PATCH /api/nutrir/orders` that did this was removed. Don't reintroduce a direct "mark as paid" mutation without gateway verification behind it.

### Data layer

- `lib/supabase-server.ts` / `supabase-db.ts` use the **service-role key** (bypasses RLS) for all server-side API route reads/writes — this is the only Supabase access path for orders/customers/pacientes data.
- `lib/supabase-browser.ts` uses the **anon key**, client-side, for Supabase Auth only (login/signup/session) — never for direct table access.
- RLS policies on `nutrir_orders`/`nutrir_customers` scope access by `auth.jwt() ->> 'email'`, via the `nutrir_current_customer_id()` SQL helper (`SECURITY DEFINER`, revoked from `anon`, granted to `authenticated` because the order-history RLS policy needs it). This matters mainly if something ever queries Supabase directly via PostgREST/anon key instead of through the API routes — the API routes themselves bypass RLS via the service role, so RLS is defense-in-depth, not the primary access control.
- `pacientes` table has RLS enabled with **zero policies** — this is intentional (default-deny for `anon`/`authenticated`; only the service role touches it, to check if a customer qualifies for the "patient" discount via `findPacienteByCpf`).
- Migrations: `supabase/migrations/` (repo root, shared file but this is the only project using the DB). Project ref `ocjtzacohamatjbzlind`. Run the Supabase security advisor after any schema change — this project has already had `SECURITY DEFINER` functions caught being unnecessarily exposed via public RPC (`nutrir_trim_orders_per_customer`, `nutrir_touch_updated_at` — both are trigger functions, never meant to be called directly).

### API routes (`app/api/nutrir/*`)

- `orders` (POST create, no PATCH — see above), `orders/[id]` (GET), `orders/[id]/checkout` (InfinitePay link), `orders/[id]/pix` (Pix copia-e-cola), `orders/verify` (gateway re-check)
- `customers`, `customers/orders` — lookup/upsert by phone or email, used for checkout autofill for guests. **No auth on these today** — anyone who knows a phone/email can read or overwrite that customer's saved name/CPF/address. Known, accepted-for-now gap (locking it down breaks the guest-autofill UX; would need a product decision, e.g. an OTP step, not just a code patch).
- `pacientes/check` — CPF lookup to apply the patient discount.
- `webhooks/infinitepay` — see payment confirmation above.

### Integrations

- **InfinitePay** (`lib/infinitepay.ts`): online card checkout links + payment verification. Needs `INFINITEPAY_HANDLE` + `NEXT_PUBLIC_SITE_URL`.
- **Pix** (`lib/pix-brcode.ts`): generates copia-e-cola/QR from `PIX_KEY`/`PIX_RECEIVER_NAME`/`PIX_CITY` — this is a static key, not a payment gateway, so "confirmation" here is manual/Telegram-notified, not verified automatically.
- **Telegram** (`lib/telegram.ts`, `order-telegram.ts`): sends order notifications to the store owner on new local-payment orders and payment confirmations.

## Deploy

Manual — no CI/CD for this project (unlike Pauli, which auto-deploys via GitHub Actions):
```bash
cd ~/nutricao/nutrir && npm run build && pm2 restart nutrir-web
```
See the root `CLAUDE.md` for the shared-VPS caveats (the same server also runs an unrelated trading project under the same Linux user).
