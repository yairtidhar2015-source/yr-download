import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Isolated database + forced test-mode configuration for every run.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-test-'));
process.env.PAYMENT_PROVIDER = 'test';
process.env.AI_PROVIDER = 'mock';
process.env.TEST_WEBHOOK_SECRET = 'unit-test-secret';

let db, credits, payments, testPay;
let n = 0;
const newUser = () => Number(db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)').run(`u${++n}@t.co`, 'U', 'x').lastInsertRowid);

before(async () => {
  ({ db } = await import('../src/db.js'));
  credits = await import('../src/credits.js');
  payments = await import('../src/payments/index.js');
  testPay = await import('../src/payments/test.js');
});

async function buy(userId, packageId = 'starter') {
  const { purchaseId } = await payments.startCheckout({ id: userId }, packageId);
  return payments.getPurchase(purchaseId);
}
function signedWebhook(event) {
  const raw = JSON.stringify(event);
  return payments.handleWebhook('test', { 'x-siteforge-signature': testPay.signTestPayload(raw) }, raw);
}

test('new users start with zero credits and cannot reserve', () => {
  const u = newUser();
  assert.deepEqual(credits.getBalance(u), { credits: 0, held: 0, available: 0 });
  assert.throws(() => credits.reserve(u, 1, 'edit'), (e) => e.status === 402 && e.code === 'insufficient_credits');
});

test('valid signed webhook grants credits exactly once, even if repeated', async () => {
  const u = newUser();
  const p = await buy(u, 'creator');
  const event = testPay.buildTestEvent(p, 'success');
  assert.equal(await signedWebhook(event), 200);
  assert.equal(await signedWebhook(event), 200); // same event id again
  assert.equal(await signedWebhook({ ...event, id: 'evt_different' }), 200); // different event, same payment
  assert.equal(credits.getBalance(u).credits, 200);
  const tx = credits.listTransactions(u);
  assert.equal(tx.length, 1);
  assert.equal(tx[0].kind, 'purchase');
  assert.equal(tx[0].test, 1);
});

test('webhooks with missing, wrong or stale signatures are rejected', async () => {
  const u = newUser();
  const p = await buy(u);
  const raw = JSON.stringify(testPay.buildTestEvent(p, 'success'));
  assert.equal(await payments.handleWebhook('test', {}, raw), 400);
  assert.equal(await payments.handleWebhook('test', { 'x-siteforge-signature': 't=1,v1=deadbeef' }, raw), 400);
  const old = Math.floor(Date.now() / 1000) - 3600;
  assert.equal(await payments.handleWebhook('test', { 'x-siteforge-signature': testPay.signTestPayload(raw, old) }, raw), 400);
  const tampered = raw.replace('"amount_minor":1900', '"amount_minor":1');
  assert.equal(await payments.handleWebhook('test', { 'x-siteforge-signature': testPay.signTestPayload(raw) }, tampered), 400);
  assert.equal(credits.getBalance(u).credits, 0);
});

test('a payment with the wrong amount or currency grants nothing', async () => {
  const u = newUser();
  const p = await buy(u, 'pro');
  const ev = testPay.buildTestEvent(p, 'success');
  ev.data.amount_minor = 100;
  assert.equal(await signedWebhook(ev), 400);
  const ev2 = testPay.buildTestEvent(p, 'success');
  ev2.data.currency = 'USD';
  assert.equal(await signedWebhook(ev2), 400);
  assert.equal(credits.getBalance(u).credits, 0);
  assert.equal(payments.getPurchase(p.id).status, 'created');
});

test('holds: capture only on success, release on failure, never negative', async () => {
  const u = newUser();
  await signedWebhook(testPay.buildTestEvent(await buy(u), 'success')); // 50 credits
  const h1 = credits.reserve(u, 30, 'edit');
  assert.equal(credits.getBalance(u).available, 20);
  assert.throws(() => credits.reserve(u, 21, 'edit'), (e) => e.status === 402); // parallel request can't overspend
  credits.release(h1);
  assert.equal(credits.getBalance(u).available, 50);
  assert.equal(credits.capture(h1, 'x').captured, false); // released holds can't be captured
  const h2 = credits.reserve(u, 50, 'edit');
  assert.equal(credits.capture(h2, 'ok').captured, true);
  assert.equal(credits.capture(h2, 'again').captured, false); // idempotent
  assert.deepEqual(credits.getBalance(u), { credits: 0, held: 0, available: 0 });
  assert.throws(() => db.prepare('UPDATE users SET credits = -1 WHERE id = ?').run(u)); // DB CHECK constraint
});

test('refund removes unspent purchased credits without going negative', async () => {
  const u = newUser();
  const p = await buy(u);
  await signedWebhook(testPay.buildTestEvent(p, 'success'));
  credits.capture(credits.reserve(u, 40, 'edit'), 'spent');
  assert.equal(await signedWebhook({ id: 'evt_refund_1', type: 'payment.refunded', data: { purchase_id: p.id } }), 200);
  assert.equal(credits.getBalance(u).credits, 0);
  assert.equal(payments.getPurchase(p.id).status, 'refunded');
});

test('test provider is refused when another provider is active', async () => {
  const { config } = await import('../src/config.js');
  const prev = config.payments.provider;
  config.payments.provider = 'paypal';
  try {
    assert.equal(await payments.handleWebhook('test', {}, '{}'), 404);
  } finally { config.payments.provider = prev; }
});
