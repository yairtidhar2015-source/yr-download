import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Minimal .env loader (no dependency). Real environment variables win.
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, '');
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

const env = process.env;
const int = (v, d) => (v === undefined || v === '' ? d : Number.parseInt(v, 10));
const isProd = env.NODE_ENV === 'production';
// DEMO_MODE: a public demo before real keys exist – offline demo AI + simulated
// payments, clearly labelled in the UI. Automatically ignored for whichever part
// has real credentials, and test payments are never combined with real AI.
const demoMode = ['1', 'true', 'yes'].includes(String(env.DEMO_MODE || '').toLowerCase());
const port = int(env.PORT, 3000);
const dataDir = path.resolve(env.DATA_DIR || path.join(ROOT, 'data'));
fs.mkdirSync(path.join(dataDir, 'uploads'), { recursive: true });

// ---- AI provider -------------------------------------------------------------
// anthropic: real Claude models (needs ANTHROPIC_API_KEY)
// mock:      offline demo provider for local development only – never in production
// none:      AI disabled
let aiProvider = env.AI_PROVIDER || (env.ANTHROPIC_API_KEY ? 'anthropic' : isProd && !demoMode ? 'none' : 'mock');
if (isProd && !demoMode && aiProvider === 'mock') {
  console.warn('[config] AI_PROVIDER=mock is not allowed in production – AI disabled.');
  aiProvider = 'none';
}

// ---- Payment provider --------------------------------------------------------
const paypal = {
  clientId: env.PAYPAL_CLIENT_ID || '',
  clientSecret: env.PAYPAL_CLIENT_SECRET || '',
  webhookId: env.PAYPAL_WEBHOOK_ID || '',
  mode: env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox',
};
const paypalReady = Boolean(paypal.clientId && paypal.clientSecret && paypal.webhookId);
let paymentProvider = env.PAYMENT_PROVIDER || (paypalReady ? 'paypal' : isProd && !demoMode ? 'none' : 'test');
if (paymentProvider === 'paypal' && !paypalReady) {
  console.warn('[config] PAYMENT_PROVIDER=paypal but PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_WEBHOOK_ID are missing.');
  paymentProvider = isProd ? 'none' : 'test';
}
if (isProd && paymentProvider === 'test' && !(demoMode && aiProvider === 'mock')) {
  // Simulated payments must never unlock a real (paid) AI model in production.
  console.warn('[config] Test payments are disabled in production. Configure PayPal (see README).');
  paymentProvider = 'none';
}

export const config = {
  isProd,
  demoMode,
  port,
  baseUrl: (env.BASE_URL || env.RENDER_EXTERNAL_URL || `http://localhost:${port}`).replace(/\/$/, ''),
  dataDir,
  dbFile: env.DB_FILE || path.join(dataDir, 'siteforge.db'),
  uploadsDir: path.join(dataDir, 'uploads'),
  maxProjectsPerUser: int(env.MAX_PROJECTS_PER_USER, 1),
  sessionDays: int(env.SESSION_DAYS, 30),
  ai: {
    provider: aiProvider,
    model: env.AI_MODEL || 'claude-opus-5-5',
    effort: env.AI_EFFORT || 'medium',
    maxHistoryTurns: int(env.AI_HISTORY_TURNS, 8),
  },
  payments: {
    provider: paymentProvider,
    paypal,
    // Secret used to sign simulated webhooks in test mode. Random per boot unless set.
    testWebhookSecret: env.TEST_WEBHOOK_SECRET || crypto.randomBytes(32).toString('hex'),
  },
};
