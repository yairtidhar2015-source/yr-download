// PayPal Checkout (Orders v2) – supports Israeli merchants and ILS (₪).
//
// Flow:
//  1. Server creates an order (amount comes from the server-side package, never the browser).
//  2. Buyer approves on PayPal and is sent back to /api/payments/paypal/return.
//  3. Server CAPTURES the order and grants credits only if PayPal reports the
//     capture COMPLETED with the exact amount/currency of the purchase.
//  4. Signed webhooks (PAYMENT.CAPTURE.COMPLETED / REFUNDED / REVERSED,
//     CHECKOUT.ORDER.APPROVED) are verified with PayPal's
//     verify-webhook-signature API and processed idempotently, so a buyer who
//     closes the browser still gets credits, and repeats never double-grant.
import { config } from '../config.js';
import { formatMinor } from '../pricing.js';

const cfg = config.payments.paypal;
const API = cfg.mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
let token = null;

async function accessToken() {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const res = await fetch(`${API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`);
  const data = await res.json();
  token = { value: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return token.value;
}

async function api(method, path, body, extraHeaders = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json', ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  return { ok: res.ok, status: res.status, data };
}

export const paypalProvider = {
  id: 'paypal',
  test: false,

  async createOrder(purchase, pkg) {
    const { ok, status, data } = await api('POST', '/v2/checkout/orders', {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: purchase.id,
        custom_id: purchase.id,
        invoice_id: purchase.id,
        description: `SiteForge AI – ${pkg.name} (${pkg.credits} AI credits, one-time)`,
        amount: { currency_code: purchase.currency, value: formatMinor(purchase.amount_minor) },
      }],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: 'SiteForge AI',
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
            return_url: `${config.baseUrl}/api/payments/paypal/return?purchase=${purchase.id}`,
            cancel_url: `${config.baseUrl}/api/payments/paypal/cancel?purchase=${purchase.id}`,
          },
        },
      },
    }, { 'PayPal-Request-Id': `order-${purchase.id}` });
    if (!ok) throw new Error(`PayPal order creation failed (${status}): ${data?.name || ''}`);
    const link = (data.links || []).find((l) => l.rel === 'payer-action' || l.rel === 'approve');
    if (!link) throw new Error('PayPal did not return an approval link');
    return { providerOrderId: data.id, redirectUrl: link.href };
  },

  /**
   * Capture an approved order and return a verified result:
   * { status: 'paid'|'pending'|'failed', captureId, amountMinor, currency, customId }
   */
  async captureOrder(orderId, purchaseId) {
    let { ok, data } = await api('POST', `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {},
      { 'PayPal-Request-Id': `capture-${purchaseId}` });
    if (!ok && data?.details?.some((d) => d.issue === 'ORDER_ALREADY_CAPTURED')) {
      ({ ok, data } = await api('GET', `/v2/checkout/orders/${encodeURIComponent(orderId)}`));
    }
    if (!ok) return { status: 'failed' };
    const unit = data.purchase_units?.[0];
    const cap = unit?.payments?.captures?.[0];
    if (!cap) return { status: 'pending' };
    return {
      status: cap.status === 'COMPLETED' ? 'paid' : cap.status === 'PENDING' ? 'pending' : 'failed',
      captureId: cap.id,
      amountMinor: Math.round(Number(cap.amount.value) * 100),
      currency: cap.amount.currency_code,
      customId: cap.custom_id || unit.custom_id || unit.reference_id,
    };
  },

  /** Verify the webhook signature with PayPal. Returns the parsed event or null. */
  async verifyWebhook(headers, rawBody) {
    const h = (n) => headers[n] || '';
    if (!h('paypal-transmission-sig') || !h('paypal-transmission-id')) return null;
    let event;
    try { event = JSON.parse(rawBody); } catch { return null; }
    const { ok, data } = await api('POST', '/v1/notifications/verify-webhook-signature', {
      auth_algo: h('paypal-auth-algo'),
      cert_url: h('paypal-cert-url'),
      transmission_id: h('paypal-transmission-id'),
      transmission_sig: h('paypal-transmission-sig'),
      transmission_time: h('paypal-transmission-time'),
      webhook_id: cfg.webhookId,
      webhook_event: event,
    });
    return ok && data.verification_status === 'SUCCESS' ? event : null;
  },

  /** Normalise a verified PayPal event into an internal action. */
  interpret(event) {
    const r = event.resource || {};
    const amount = r.amount ? { amountMinor: Math.round(Number(r.amount.value) * 100), currency: r.amount.currency_code } : {};
    const upCapture = (r.links || []).find((l) => l.rel === 'up')?.href?.match(/captures\/([^/?]+)/)?.[1];
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        return { action: 'paid', purchaseId: r.custom_id, captureId: r.id, ...amount };
      case 'CHECKOUT.ORDER.APPROVED':
        return { action: 'approved', orderId: r.id, purchaseId: r.purchase_units?.[0]?.custom_id };
      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.DECLINED':
        return { action: 'failed', purchaseId: r.custom_id };
      case 'PAYMENT.CAPTURE.REFUNDED':
        return { action: 'refunded', purchaseId: r.custom_id, captureId: upCapture };
      case 'PAYMENT.CAPTURE.REVERSED':
        return { action: 'refunded', purchaseId: r.custom_id, captureId: r.id };
      default:
        return { action: 'ignore' };
    }
  },
};
