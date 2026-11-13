// Server-side credit ledger.
//
// Rules enforced here (and by CHECK constraints in the schema):
//  * Balances can never go negative (credits >= 0, held <= credits).
//  * AI operations first RESERVE credits (a hold), then CAPTURE on success or
//    RELEASE on failure – so credits are only deducted after a successful
//    operation, and two parallel requests can never overspend.
//  * Purchases are granted exactly once: the purchase row moves
//    created -> paid in a single conditional UPDATE, and the ledger has a
//    UNIQUE (kind, reference) key as a second line of defence.
import { db, tx } from './db.js';
import { HttpError, newId } from './util.js';

const getUser = db.prepare('SELECT id, credits, held FROM users WHERE id = ?');
const insertTx = db.prepare(`INSERT INTO credit_transactions
  (user_id, kind, amount, balance_after, description, reference, test) VALUES (?, ?, ?, ?, ?, ?, ?)`);

export function getBalance(userId) {
  const u = getUser.get(userId);
  if (!u) throw new HttpError(404, 'not_found', 'User not found');
  return { credits: u.credits, held: u.held, available: u.credits - u.held };
}

/** Reserve `amount` credits for an AI operation. Throws 402 if not enough available. */
export function reserve(userId, amount, operation) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('invalid amount');
  return tx(() => {
    const r = db.prepare('UPDATE users SET held = held + ? WHERE id = ? AND credits - held >= ?').run(amount, userId, amount);
    if (r.changes !== 1) {
      const b = getBalance(userId);
      throw new HttpError(402, 'insufficient_credits',
        `This needs ${amount} credit${amount === 1 ? '' : 's'} but you have ${b.available}.`,
        { required: amount, available: b.available });
    }
    const id = newId('hold');
    db.prepare('INSERT INTO credit_holds (id, user_id, amount, operation) VALUES (?, ?, ?, ?)').run(id, userId, amount, operation);
    return id;
  });
}

/** Turn a hold into a real charge. Idempotent: a hold can be captured once. */
export function capture(holdId, description) {
  return tx(() => {
    const hold = db.prepare('SELECT * FROM credit_holds WHERE id = ?').get(holdId);
    if (!hold) throw new Error('hold not found');
    const r = db.prepare("UPDATE credit_holds SET status = 'captured', settled_at = datetime('now') WHERE id = ? AND status = 'held'").run(holdId);
    if (r.changes !== 1) return { captured: false, balance: getBalance(hold.user_id) };
    db.prepare('UPDATE users SET credits = credits - ?, held = held - ? WHERE id = ?').run(hold.amount, hold.amount, hold.user_id);
    const u = getUser.get(hold.user_id);
    insertTx.run(hold.user_id, 'ai_usage', -hold.amount, u.credits, description, holdId, 0);
    return { captured: true, balance: getBalance(hold.user_id) };
  });
}

/** Give reserved credits back (operation failed / was cancelled). Idempotent. */
export function release(holdId) {
  return tx(() => {
    const hold = db.prepare('SELECT * FROM credit_holds WHERE id = ?').get(holdId);
    if (!hold) return false;
    const r = db.prepare("UPDATE credit_holds SET status = 'released', settled_at = datetime('now') WHERE id = ? AND status = 'held'").run(holdId);
    if (r.changes !== 1) return false;
    db.prepare('UPDATE users SET held = held - ? WHERE id = ?').run(hold.amount, hold.user_id);
    return true;
  });
}

/** Release holds left behind by a crash/restart. */
export function releaseStaleHolds(maxAgeMinutes = 15) {
  const stale = db.prepare(`SELECT id FROM credit_holds WHERE status = 'held'
    AND created_at < datetime('now', ?)`).all(`-${maxAgeMinutes} minutes`);
  for (const h of stale) release(h.id);
  return stale.length;
}

/**
 * Mark a purchase as paid and grant its credits – exactly once.
 * Callers MUST have verified the payment with the provider (server-side) and
 * checked amount + currency before calling this.
 * Returns { granted: true } the first time, { granted: false } on repeats.
 */
export function grantPurchase(purchaseId, { providerCaptureId = null } = {}) {
  return tx(() => {
    const p = db.prepare('SELECT * FROM purchases WHERE id = ?').get(purchaseId);
    if (!p) throw new Error(`purchase ${purchaseId} not found`);
    const r = db.prepare(`UPDATE purchases SET status = 'paid', paid_at = datetime('now'),
      provider_capture_id = COALESCE(?, provider_capture_id) WHERE id = ? AND status IN ('created','failed')`)
      .run(providerCaptureId, purchaseId);
    if (r.changes !== 1) return { granted: false, purchase: p };
    db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(p.credits, p.user_id);
    const u = getUser.get(p.user_id);
    const pkgName = p.package_id[0].toUpperCase() + p.package_id.slice(1);
    insertTx.run(p.user_id, 'purchase', p.credits, u.credits, `${pkgName} package – ${p.credits} credits`, purchaseId, p.test);
    return { granted: true, purchase: { ...p, status: 'paid' } };
  });
}

/**
 * Payment was refunded / reversed: remove the purchased credits.
 * Never goes below zero – only credits that are still unspent and not held are removed.
 */
export function revokePurchase(purchaseId, reason = 'Payment refunded') {
  return tx(() => {
    const p = db.prepare('SELECT * FROM purchases WHERE id = ?').get(purchaseId);
    if (!p) return { revoked: 0 };
    const r = db.prepare("UPDATE purchases SET status = 'refunded' WHERE id = ? AND status = 'paid'").run(purchaseId);
    if (r.changes !== 1) return { revoked: 0 };
    const u = getUser.get(p.user_id);
    const removable = Math.max(0, Math.min(p.credits, u.credits - u.held));
    db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').run(removable, p.user_id);
    const after = getUser.get(p.user_id);
    insertTx.run(p.user_id, 'refund', -removable, after.credits, `${reason} (${p.package_id})`, purchaseId, p.test);
    return { revoked: removable };
  });
}

export function listTransactions(userId, limit = 100) {
  return db.prepare(`SELECT id, kind, amount, balance_after, description, test, created_at
    FROM credit_transactions WHERE user_id = ? ORDER BY id DESC LIMIT ?`).all(userId, limit);
}
