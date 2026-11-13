// Payment provider registry + provider-independent purchase logic.
// To add another provider (e.g. Cardcom, PayPlus, Grow, Stripe): implement
// { id, test, createOrder, verifyWebhook, interpret, [captureOrder] } and register it below.
import { config } from '../config.js';
import { db } from '../db.js';
import { getPackage } from '../pricing.js';
import { pricing } from '../pricing.js';
import * as credits from '../credits.js';
import { HttpError, newId } from '../util.js';
import { paypalProvider } from './paypal.js';
import { testProvider } from './test.js';

const PROVIDERS = { paypal: paypalProvider, test: testProvider };

export function activeProvider() {
  return config.payments.provider === 'none' ? null : PROVIDERS[config.payments.provider] || null;
}
export const providerById = (id) => PROVIDERS[id] || null;

export function paymentsInfo() {
  const p = activeProvider();
  return { enabled: Boolean(p), provider: p?.id || null, testMode: Boolean(p?.test) };
}

export async function startCheckout(user, packageId) {
  const provider = activeProvider();
  if (!provider) throw new HttpError(503, 'payments_disabled', 'Payments are not configured on this server yet.');
  const pkg = getPackage(packageId);
  if (!pkg) throw new HttpError(400, 'invalid_package', 'Unknown credit package.');

  const purchase = {
    id: newId('pur'), user_id: user.id, package_id: pkg.id, credits: pkg.credits,
    amount_minor: pkg.priceMinor, currency: pricing.currency, provider: provider.id, test: provider.test ? 1 : 0,
  };
  db.prepare(`INSERT INTO purchases (id, user_id, package_id, credits, amount_minor, currency, provider, test)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(purchase.id, purchase.user_id, purchase.package_id, purchase.credits,
    purchase.amount_minor, purchase.currency, purchase.provider, purchase.test);

  try {
    const { providerOrderId, redirectUrl } = await provider.createOrder(purchase, pkg);
    db.prepare('UPDATE purchases SET provider_order_id = ? WHERE id = ?').run(providerOrderId, purchase.id);
    return { purchaseId: purchase.id, redirectUrl };
  } catch (err) {
    db.prepare("UPDATE purchases SET status = 'failed' WHERE id = ?").run(purchase.id);
    console.error('[payments] createOrder failed:', err.message);
    throw new HttpError(502, 'checkout_failed', 'Could not start checkout. Please try again.');
  }
}

export function getPurchase(id) {
  return db.prepare('SELECT * FROM purchases WHERE id = ?').get(id) || null;
}

/**
 * Grant credits for a VERIFIED payment after checking it matches the purchase
 * exactly (provider, amount, currency). Idempotent.
 */
export function settlePaid(providerId, { purchaseId, captureId, amountMinor, currency }) {
  const p = purchaseId ? getPurchase(purchaseId) : null;
  if (!p || p.provider !== providerId) return { ok: false, reason: 'unknown_purchase' };
  if (amountMinor !== p.amount_minor || currency !== p.currency) {
    console.error(`[payments] amount mismatch for ${p.id}: got ${amountMinor} ${currency}, expected ${p.amount_minor} ${p.currency}`);
    return { ok: false, reason: 'amount_mismatch' };
  }
  const { granted } = credits.grantPurchase(p.id, { providerCaptureId: captureId });
  return { ok: true, granted };
}

/** Process a webhook: verify signature, de-duplicate, apply. Returns HTTP status. */
export async function handleWebhook(providerId, headers, rawBody) {
  const provider = providerById(providerId);
  if (!provider || (provider.test && config.payments.provider !== 'test')) return 404;
  const event = await provider.verifyWebhook(headers, rawBody);
  if (!event) return 400; // bad / missing signature – never trust it
  const eventId = event.id;
  if (!eventId) return 400;
  if (db.prepare('SELECT 1 FROM webhook_events WHERE provider = ? AND event_id = ?').get(providerId, eventId)) return 200; // duplicate

  const act = provider.interpret(event);
  switch (act.action) {
    case 'paid': {
      const r = settlePaid(providerId, act);
      if (!r.ok && r.reason === 'amount_mismatch') return 400;
      break;
    }
    case 'approved': { // buyer approved but may never have returned to our site – capture now
      const p = act.purchaseId && getPurchase(act.purchaseId);
      if (p && p.status === 'created' && provider.captureOrder) {
        const cap = await provider.captureOrder(act.orderId, p.id);
        if (cap.status === 'paid' && cap.customId === p.id) settlePaid(providerId, { purchaseId: p.id, ...cap });
      }
      break;
    }
    case 'failed':
      if (act.purchaseId) db.prepare("UPDATE purchases SET status = 'failed' WHERE id = ? AND status = 'created'").run(act.purchaseId);
      break;
    case 'refunded': {
      const p = act.purchaseId ? getPurchase(act.purchaseId)
        : act.captureId ? db.prepare('SELECT * FROM purchases WHERE provider = ? AND provider_capture_id = ?').get(providerId, act.captureId) : null;
      if (p) credits.revokePurchase(p.id);
      break;
    }
    default: break;
  }
  db.prepare('INSERT OR IGNORE INTO webhook_events (provider, event_id, event_type) VALUES (?, ?, ?)').run(providerId, eventId, event.event_type || event.type || null);
  return 200;
}

export function listPurchases(userId) {
  return db.prepare(`SELECT id, package_id, credits, amount_minor, currency, provider, status, test, created_at, paid_at
    FROM purchases WHERE user_id = ? AND (status != 'created' OR created_at > datetime('now','-1 day'))
    ORDER BY created_at DESC LIMIT 50`).all(userId);
}
