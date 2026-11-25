# NOVA STORE

A multi-tenant SaaS e-commerce platform: users sign up, create their own stores, manage products and orders, and publish public storefronts.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3 · Supabase (Auth, Postgres, Storage) · Lucide icons · Vercel-ready.

## Status

| Phase | Scope | Status |
|---|---|---|
| 1 | Setup, design system, landing page, auth, Supabase config | ✅ Done |
| 2 | Multi-store, store creation, dashboard, products | ⏳ Next |
| 3 | Store builder, storefront, cart, checkout foundation | — |
| 4 | Orders, customers, analytics | — |
| 5 | Suppliers, payments, shipping | — |
| 6 | Security audit, tests, performance, deployment | — |

### What works in Phase 1
- Marketing homepage (hero, features, how it works, pricing, FAQ, footer), responsive.
- 4 languages: Hebrew (default), English, Arabic, Spanish, with RTL/LTR. The choice is stored in a cookie.
- Real Supabase auth: register, email verification, login, logout, forgot password, password reset, protected `/dashboard`.
- Profile page (edit name, verification status, change password).
- `profiles` table with Row Level Security; users can't give themselves admin rights.
- Server-side validation (zod), per-IP rate limiting on auth actions, open-redirect protection, security headers.
- If Supabase isn't configured, the site still renders and auth forms show a clear message.

Dashboard tiles show "—": no store or order data exists until Phase 2, and nothing shows made-up numbers. Paid plans are display-only: everything runs in development mode without billing.

## Local setup

```bash
cd nova-store
npm install
cp .env.example .env.local   # fill in values (below)
npm run dev                  # http://localhost:3000
```

### Supabase configuration
1. Create a project at supabase.com.
2. **Project Settings → API**: copy the Project URL and the `anon` public key into `.env.local`.
3. **SQL Editor**: run `supabase/migrations/20261125000001_phase1_profiles.sql` (or run `supabase db push` with the Supabase CLI).
4. **Authentication → URL Configuration**: set Site URL to `http://localhost:3000` (your production URL later) and add `http://localhost:3000/auth/confirm` to the redirect URLs.
5. Optional (recommended): in **Authentication → Email Templates**, use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` (for signup) and `...&type=recovery` (for reset). The default `?code=` links also work.
6. Supabase's built-in email sender is heavily rate-limited. Configure custom SMTP for real use.

`SUPABASE_SERVICE_ROLE_KEY` is server-only and not used yet. Never prefix it with `NEXT_PUBLIC_`.

## Scripts
- `npm run dev` / `build` / `start`
- `npm run typecheck`

## Project structure
```
src/
  app/                 routes (landing, (auth)/*, auth/confirm, dashboard/*)
  components/          ui/, landing/, auth/, dashboard/
  i18n/                he.ts (source of truth for keys), en.ts, ar.ts, es.ts
  lib/
    auth/              server actions + requireUser guard
    i18n/              locale config, server/client helpers
    supabase/          browser, server and middleware clients
    rate-limit.ts      in-memory limiter (swap for Redis on multi-instance)
  middleware.ts        session refresh + route protection
supabase/migrations/   SQL migrations
```

## Deploying to Vercel
Set the Root Directory to `nova-store`, then add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL` (your production URL). Add that URL's `/auth/confirm` to the Supabase redirect URLs.
