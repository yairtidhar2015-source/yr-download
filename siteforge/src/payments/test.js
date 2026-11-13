// TEST payment provider – for local development and QA only.
// Disabled automatically in production (see config.js). Purchases and ledger
// rows created through it are flagged test=1 and shown with a "TEST" badge.
//
// It still exercises the real security path: the "Pay" button on the test
// checkout page makes the server emit an HMAC-signed webhook event that goes
// through the same verification + idempotent grant code as a real provider.
import crypto from 'node:crypto';
import { config } from '../config.js';
import { safeEqual, newId } from '../util.js';

const secret = () => config.payments.testWebhookSecret;
const TOLERANCE_S = 300;

export function signTestPayload(rawBody, timestamp = Math.floor(Date.now() / 1000)) {
  const sig = crypto.createHmac('sha256', secret()).update(`${timestamp}.${rawBody}`).digest('hex');
  return `t=${timestamp},v1=${sig}`;
}

export function buildTestEvent(purchase, outcome) {
  return {
    id: newId('evt'),
    type: outcome === 'success' ? 'payment.succeeded' : 'payment.failed',
    data: { purchase_id: purchase.id, amount_minor: purchase.amount_minor, currency: purchase.currency, capture_id: newId('testcap') },
  };
}

export const testProvider = {
  id: 'test',
  test: true,

  async createOrder(purchase) {
    return { providerOrderId: `test_${purchase.id}`, redirectUrl: `/checkout/test/${purchase.id}` };
  },

  async verifyWebhook(headers, rawBody) {
    const header = headers['x-siteforge-signature'] || '';
    const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=')));
    const t = Number(parts.t);
    if (!t || !parts.v1 || Math.abs(Date.now() / 1000 - t) > TOLERANCE_S) return null;
    const expected = crypto.createHmac('sha256', secret()).update(`${t}.${rawBody}`).digest('hex');
    if (!safeEqual(expected, parts.v1)) return null;
    try { return JSON.parse(rawBody); } catch { return null; }
  },

  interpret(event) {
    const d = event.data || {};
    if (event.type === 'payment.succeeded') return { action: 'paid', purchaseId: d.purchase_id, captureId: d.capture_id, amountMinor: d.amount_minor, currency: d.currency };
    if (event.type === 'payment.failed') return { action: 'failed', purchaseId: d.purchase_id };
    if (event.type === 'payment.refunded') return { action: 'refunded', purchaseId: d.purchase_id };
    return { action: 'ignore' };
  },
};
