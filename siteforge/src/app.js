import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { config, ROOT } from './config.js';
import { db } from './db.js';
import { pricing } from './pricing.js';
import { HttpError, rateLimiter } from './util.js';
import * as auth from './auth.js';
import * as credits from './credits.js';
import * as projects from './projects.js';
import * as payments from './payments/index.js';
import { buildTestEvent, signTestPayload } from './payments/test.js';
import { saveUpload, listUploads, uploadMime, MAX_UPLOAD_BYTES } from './uploads.js';
import { listTemplates, FONTS, ANIMATIONS } from './templates.js';
import { runOperation, getProvider } from './ai/index.js';

const PUBLIC = path.join(ROOT, 'public');

const APP_CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data: blob: https:", "frame-src 'self'",
  "connect-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'self'",
].join('; ');

// The live preview runs user/AI-generated HTML+JS. It is loaded in an iframe with
// sandbox="allow-scripts" (no same-origin → no access to cookies or the API) and
// this restrictive CSP (no network requests from scripts).
const PREVIEW_CSP = [
  "default-src 'none'", "script-src 'unsafe-inline'", "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com data:", 'img-src * data: blob:', 'media-src * data: blob:',
  "connect-src 'none'", "form-action 'none'", "frame-ancestors 'self'", "base-uri 'none'",
].join('; ');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
    next();
  });

  app.get('/healthz', (_req, res) => res.json({ ok: true }));

  // ---- Webhooks: raw body, no session, no CSRF header (verified by signature) ----
  app.post('/api/payments/webhooks/:provider', express.text({ type: '*/*', limit: '1mb' }), async (req, res) => {
    try {
      const status = await payments.handleWebhook(req.params.provider, req.headers, typeof req.body === 'string' ? req.body : '');
      res.status(status).json({ ok: status === 200 });
    } catch (err) {
      console.error('[webhook] error:', err);
      res.status(500).json({ ok: false }); // provider will retry; processing is idempotent
    }
  });

  app.use(auth.sessionMiddleware);

  // CSRF protection for state-changing API calls: browsers can't send this
  // custom header cross-site without a CORS preflight (which we never allow).
  app.use('/api', (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (req.get('x-requested-with') !== 'SiteForge') return next(new HttpError(403, 'csrf', 'Missing request header.'));
    next();
  });

  const json = express.json({ limit: '3mb' });
  const authLimiter = rateLimiter({ windowMs: 15 * 60_000, max: 20 });
  const aiLimiter = rateLimiter({ windowMs: 60_000, max: 10 });

  // ---------------------------------------------------------------- public info
  app.get('/api/config', (req, res) => {
    const ai = getProvider();
    res.json({
      currency: pricing.currency,
      currencySymbol: pricing.currencySymbol,
      packages: pricing.packages.map(({ id, name, credits: c, price, tagline, popular }) => ({ id, name, credits: c, price, tagline, popular: !!popular })),
      operations: pricing.operations,
      payments: payments.paymentsInfo(),
      ai: { enabled: Boolean(ai), provider: ai?.label || null, demo: ai?.id === 'mock' },
      templates: listTemplates(),
      fonts: FONTS,
      animations: ANIMATIONS,
      maxProjects: config.maxProjectsPerUser,
    });
  });

  // ---------------------------------------------------------------------- auth
  app.post('/api/auth/signup', json, async (req, res) => {
    if (!authLimiter(`signup:${req.ip}`)) throw new HttpError(429, 'rate_limited', 'Too many attempts. Try again later.');
    const { email, password, name } = auth.validateSignup(req.body || {});
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new HttpError(409, 'email_taken', 'An account with this email already exists. Try logging in.');
    const hash = await auth.hashPassword(password);
    const { lastInsertRowid } = db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)').run(email, name, hash);
    auth.createSession(res, Number(lastInsertRowid));
    res.status(201).json({ ok: true });
  });

  app.post('/api/auth/login', json, async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!authLimiter(`login:${req.ip}`) || !authLimiter(`login:${email}`)) throw new HttpError(429, 'rate_limited', 'Too many attempts. Try again later.');
    const user = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email);
    const ok = user ? await auth.verifyPassword(String(req.body?.password || ''), user.password_hash) : false;
    if (!ok) throw new HttpError(401, 'invalid_login', 'Wrong email or password.');
    auth.createSession(res, user.id);
    res.json({ ok: true });
  });

  app.post('/api/auth/logout', (req, res) => { auth.destroySession(req, res); res.json({ ok: true }); });

  app.get('/api/me', (req, res) => {
    if (!req.user) return res.json({ user: null });
    res.json({ user: auth.publicUser(req.user), balance: credits.getBalance(req.user.id) });
  });

  // ------------------------------------------------------------------ projects
  app.use('/api/projects', auth.requireUser);
  app.get('/api/projects', (req, res) => res.json({ projects: projects.listProjects(req.user.id), max: config.maxProjectsPerUser }));
  app.post('/api/projects', json, (req, res) => res.status(201).json({ project: projects.createProject(req.user.id, req.body || {}) }));
  app.get('/api/projects/:id', (req, res) => {
    const project = projects.getProject(req.user.id, req.params.id);
    res.json({ project, chat: projects.chatHistory(project.id) });
  });
  app.patch('/api/projects/:id', json, (req, res) => res.json({ project: projects.renameProject(req.user.id, req.params.id, req.body?.name) }));
  // Free manual editing (text, images, theme, animations) – no credits involved.
  app.put('/api/projects/:id/files', json, (req, res) => {
    const project = projects.saveFiles(req.user.id, req.params.id, req.body?.files, { source: 'manual', note: String(req.body?.note || 'Manual edit').slice(0, 120) });
    res.json({ project });
  });
  app.post('/api/projects/:id/reset', json, (req, res) => res.json({ project: projects.resetFromTemplate(req.user.id, req.params.id, req.body?.template) }));
  app.get('/api/projects/:id/versions', (req, res) => res.json({ versions: projects.listVersions(req.user.id, req.params.id) }));
  app.post('/api/projects/:id/versions/:vid/restore', (req, res) => res.json({ project: projects.restoreVersion(req.user.id, req.params.id, Number(req.params.vid)) }));

  // AI operation – streamed back as Server-Sent Events over the POST response.
  app.post('/api/projects/:id/ai', json, async (req, res) => {
    if (!aiLimiter(`ai:${req.user.id}`)) throw new HttpError(429, 'rate_limited', 'Too many AI requests. Please wait a moment.');
    const controller = new AbortController();
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    let streaming = false;
    const emit = (event, data) => {
      if (!streaming) {
        res.status(200).set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
        res.flushHeaders();
        streaming = true;
      }
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    try {
      const result = await runOperation({
        user: req.user, projectId: req.params.id, operationId: req.body?.operation, prompt: req.body?.prompt,
        currentPage: typeof req.body?.currentPage === 'string' ? req.body.currentPage.slice(0, 80) : 'index.html',
        signal: controller.signal, emit,
      });
      emit('done', result);
      res.end();
    } catch (err) {
      if (!streaming) throw err; // normal JSON error (e.g. 402 insufficient credits)
      if (!res.writableEnded) {
        const balance = credits.getBalance(req.user.id).available;
        emit('error', { code: err.code || 'error', message: err instanceof HttpError ? err.message : 'Something went wrong. No credits were used.', balance });
        res.end();
      }
      if (!(err instanceof HttpError)) console.error('[ai] error:', err);
    }
  });

  // ------------------------------------------------------------------- credits
  app.get('/api/credits', auth.requireUser, (req, res) => {
    res.json({
      balance: credits.getBalance(req.user.id),
      transactions: credits.listTransactions(req.user.id),
      purchases: payments.listPurchases(req.user.id),
    });
  });

  app.post('/api/checkout', auth.requireUser, json, async (req, res) => {
    res.json(await payments.startCheckout(req.user, String(req.body?.packageId || '')));
  });

  app.get('/api/purchases/:id', auth.requireUser, (req, res) => {
    const p = payments.getPurchase(req.params.id);
    if (!p || p.user_id !== req.user.id) throw new HttpError(404, 'not_found', 'Purchase not found.');
    res.json({ id: p.id, status: p.status, credits: p.credits, test: !!p.test, balance: credits.getBalance(req.user.id).available });
  });

  // PayPal return: capture server-side, verify, grant. Never trusts query params alone.
  app.get('/api/payments/paypal/return', auth.requireUser, async (req, res) => {
    const p = payments.getPurchase(String(req.query.purchase || ''));
    if (!p || p.user_id !== req.user.id || p.provider !== 'paypal') return res.redirect('/account?payment=failed');
    if (p.status === 'paid') return res.redirect(`/account?payment=success&purchase=${p.id}`);
    const orderId = String(req.query.token || '');
    if (!orderId || orderId !== p.provider_order_id) return res.redirect('/account?payment=failed');
    try {
      const provider = payments.providerById('paypal');
      const cap = await provider.captureOrder(orderId, p.id);
      if (cap.status === 'paid' && cap.customId === p.id) {
        const r = payments.settlePaid('paypal', { purchaseId: p.id, ...cap });
        return res.redirect(`/account?payment=${r.ok ? 'success' : 'failed'}&purchase=${p.id}`);
      }
      if (cap.status === 'pending') return res.redirect(`/account?payment=pending&purchase=${p.id}`);
      db.prepare("UPDATE purchases SET status = 'failed' WHERE id = ? AND status = 'created'").run(p.id);
      res.redirect('/account?payment=failed');
    } catch (err) {
      console.error('[paypal] capture error:', err);
      res.redirect(`/account?payment=pending&purchase=${p.id}`); // webhook will settle it
    }
  });
  app.get('/api/payments/paypal/cancel', (req, res) => res.redirect('/account?payment=cancelled'));

  // ---- Test-mode checkout (only when PAYMENT_PROVIDER resolves to "test") ----
  const testOnly = (req, _res, next) => next(config.payments.provider === 'test' ? undefined : new HttpError(404, 'not_found', 'Not found'));
  app.get('/checkout/test/:id', testOnly, (req, res) => {
    if (!req.user) return res.redirect('/login');
    res.set('Content-Security-Policy', APP_CSP).sendFile(path.join(PUBLIC, 'test-checkout.html'));
  });
  app.get('/api/payments/test/:id', testOnly, auth.requireUser, (req, res) => {
    const p = payments.getPurchase(req.params.id);
    if (!p || p.user_id !== req.user.id) throw new HttpError(404, 'not_found', 'Purchase not found.');
    res.json({ id: p.id, package: p.package_id, credits: p.credits, amount: p.amount_minor / 100, currency: p.currency, status: p.status });
  });
  app.post('/api/payments/test/:id/pay', testOnly, auth.requireUser, json, async (req, res) => {
    const p = payments.getPurchase(req.params.id);
    if (!p || p.user_id !== req.user.id || p.provider !== 'test') throw new HttpError(404, 'not_found', 'Purchase not found.');
    // Simulate the provider: build a signed webhook and run it through the normal verified path.
    const raw = JSON.stringify(buildTestEvent(p, req.body?.outcome === 'fail' ? 'fail' : 'success'));
    const status = await payments.handleWebhook('test', { 'x-siteforge-signature': signTestPayload(raw) }, raw);
    const after = payments.getPurchase(p.id);
    res.status(status === 200 ? 200 : 400).json({ status: after.status, balance: credits.getBalance(req.user.id).available });
  });

  // ------------------------------------------------------------------- uploads
  app.post('/api/uploads', auth.requireUser, express.raw({ type: 'image/*', limit: MAX_UPLOAD_BYTES + 1024 }), (req, res) => {
    res.status(201).json(saveUpload(req.user.id, req.body, decodeURIComponent(req.get('x-filename') || 'image')));
  });
  app.get('/api/uploads', auth.requireUser, (req, res) => res.json({ uploads: listUploads(req.user.id) }));
  app.get('/u/:id', (req, res) => {
    const mime = uploadMime(req.params.id);
    if (!mime) return res.status(404).end();
    res.set({ 'Content-Type': mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'Content-Security-Policy': "default-src 'none'" });
    fs.createReadStream(path.join(config.uploadsDir, req.params.id)).pipe(res);
  });

  // --------------------------------------------------------------------- pages
  app.get('/preview-frame', (req, res) => {
    res.set({ 'Content-Security-Policy': PREVIEW_CSP, 'Cache-Control': 'no-store' }).sendFile(path.join(PUBLIC, 'preview-frame.html'));
  });
  const pages = { '/': 'index.html', '/pricing': 'pricing.html', '/login': 'auth.html', '/signup': 'auth.html', '/app': 'app.html', '/account': 'account.html' };
  for (const [route, file] of Object.entries(pages)) {
    app.get(route, (req, res) => {
      if ((route === '/app' || route === '/account') && !req.user) return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
      res.set({ 'Content-Security-Policy': APP_CSP, 'X-Frame-Options': 'SAMEORIGIN' }).sendFile(path.join(PUBLIC, file));
    });
  }
  app.use(express.static(PUBLIC, { index: false, maxAge: config.isProd ? '1h' : 0, setHeaders: (res) => res.set('Content-Security-Policy', APP_CSP) }));

  // --------------------------------------------------------------------- errors
  app.use('/api', (req, _res, next) => next(new HttpError(404, 'not_found', 'Not found')));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    if (err.type === 'entity.too.large') err = new HttpError(413, 'too_large', 'Upload too large.');
    else if (err.type === 'entity.parse.failed') err = new HttpError(400, 'bad_json', 'Invalid request body.');
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) console.error(err);
    if (!req.path.startsWith('/api') && status === 404) return res.status(404).sendFile(path.join(PUBLIC, 'index.html'));
    res.status(status).json({ error: { code: err.code || 'server_error', message: status === 500 ? 'Something went wrong.' : err.message, ...(err.extra || {}) } });
  });

  return app;
}
