# SiteForge AI

Build websites by chatting with AI. The AI chat is the main workspace: describe a site, add pages, restyle, rewrite text,
draw images, add animations, and watch the live preview update next to the chat.

- **Website builder: free.** Register, create and edit one website, basic templates, click-to-edit text and images,
  theme colors and fonts, basic scroll animations, your own image uploads, desktop/tablet/mobile preview, version history.
- **AI: one-time credit packages.** No subscription. Credits never expire and are charged only after an AI change succeeds.
- **Hosting:** shown as a separate, future product on the pricing page.

## Quick start

```bash
cd siteforge
npm install
cp .env.example .env      # optional – works without any keys in development
npm start                 # http://localhost:3000
npm test                  # credit ledger, webhook and AI pipeline tests
```

Requires Node.js 22.13+ (uses the built-in `node:sqlite`; Node prints an "experimental" warning for it, which is expected).

With no keys set, development mode runs:
- a **Demo AI** (rule-based, offline, labelled "DEMO" in the UI) so you can try the full chat → preview → credits flow, and
- **test payments**: "Buy" opens a simulated checkout labelled *TEST MODE – NO REAL MONEY*. Its button makes the server send
  itself an HMAC-signed webhook that goes through the same verification and idempotent grant code as real payments.
  Test purchases are flagged and shown with a TEST badge.

Neither runs in production (`NODE_ENV=production`): without keys, AI and payments are disabled and the UI says so.
Nothing ever pretends a real payment succeeded.

## Going live

### 1. AI (Claude)
Set `ANTHROPIC_API_KEY`. Default model `claude-opus-5-5` (`AI_MODEL` to change), streaming, adaptive thinking,
cached system prompt, and server-side refusal fallback enabled (`fallbacks: "default"`), so a request a safety classifier
declines is retried on a fallback model inside the same call.

### 2. Payments (PayPal – supports Israeli merchants and ₪ ILS)
1. Create a PayPal **Business** account and a REST app at <https://developer.paypal.com/dashboard/applications>
   (start with *Sandbox*).
2. Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE=sandbox|live`, and `BASE_URL` (your public https URL).
3. In the app, add a webhook to `https://YOUR-DOMAIN/api/payments/webhooks/paypal` with events
   `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`,
   `PAYMENT.CAPTURE.REVERSED`. Put its ID in `PAYPAL_WEBHOOK_ID`.
4. Restart. The startup log shows `Payments: paypal`.

Other Israeli providers (Cardcom, PayPlus, Grow/Meshulam, Tranzila) can be added as a module in `src/payments/`
implementing `createOrder`, `verifyWebhook`, `interpret` (and optionally `captureOrder`) – see `paypal.js`.

### 3. Run in production
`NODE_ENV=production`, behind HTTPS (cookies are `Secure`). Back up `DATA_DIR` (SQLite database + uploaded images).

## How credits are kept safe

| Rule | Where |
|---|---|
| Balances can't go negative | `CHECK (credits >= 0)`, `CHECK (held <= credits)` in `src/db.js` |
| Credits are deducted only after success | AI requests **reserve** a hold; the hold is **captured** only after the AI output is parsed, validated and saved; any error, abort or "no changes" **releases** it (`src/credits.js`, `src/ai/index.js`) |
| Parallel requests can't overspend | Reservation is one conditional `UPDATE … WHERE credits - held >= cost` |
| Exact cost shown before sending | The Send button always shows the action's cost; the cost comes from `config/pricing.json` on the server, never from the browser |
| Purchases verified on the backend | PayPal orders are captured server-side and amount + currency + `custom_id` are checked; webhooks are verified with PayPal's signature API |
| No duplicate grants | Purchase moves `created → paid` in one conditional update; ledger has `UNIQUE (kind, reference)`; webhook event IDs are recorded |
| Frontend can't unlock credits | Balance only changes in `src/credits.js`, called from verified payment code |
| Refunds | `PAYMENT.CAPTURE.REFUNDED/REVERSED` removes the purchased credits that are still unspent (never below zero) |
| History | Every purchase, AI charge and refund is a row in `credit_transactions`, shown on the Account page |

## Configuration

- **Prices / packages / AI action costs:** `config/pricing.json` (example prices: Starter 50 credits ₪19, Creator 200 ₪49,
  Pro 600 ₪99, Ultimate 1,500 ₪199).
- **Free website limit:** `MAX_PROJECTS_PER_USER` (default 1).

## Adding AI models or providers

`src/ai/index.js` keeps a provider registry. A provider is an object with
`{ id, label, model, complete({ system, messages, onText, signal, effort, context }) }` that streams text and returns
`{ text }`. Register it in `PROVIDERS` and select it with `AI_PROVIDER`. Operation types and their credit prices live in
`config/pricing.json` and `src/ai/prompts.js`. "Create an illustration" currently generates SVG vector art with the text
model; a raster image provider can be added the same way.

## Architecture

```
server.js                 boot, stale-hold cleanup
src/app.js                Express routes, CSP, CSRF header check, SSE streaming for AI
src/credits.js            ledger: reserve / capture / release / grantPurchase / revokePurchase
src/payments/             registry + PayPal + test provider
src/ai/                   prompts, output parser, providers (Claude, offline demo), operation runner
src/projects.js           projects, files, versions (undo), chat history
src/templates.js          free basic templates
public/                   landing, pricing, auth, account, workspace (chat + live preview)
```

The live preview runs generated HTML/JS in an iframe with `sandbox="allow-scripts"` (no same-origin access to cookies
or the API) and a CSP that blocks network requests from site scripts.
