import { $, api, esc, renderNav, getConfig, bindBuyButtons, updateCredits, money } from './common.js';

await renderNav($('#nav'), { active: '/account' });
bindBuyButtons($('main'));
const cfg = await getConfig();
const params = new URLSearchParams(location.search);

const fmtDate = (s) => new Date(`${s.replace(' ', 'T')}Z`).toLocaleString();
const statusBadge = (s) => ({ paid: '<span class="badge badge-ok">Paid</span>', failed: '<span class="badge badge-err">Failed</span>',
  refunded: '<span class="badge badge-err">Refunded</span>', created: '<span class="badge badge-brand">Pending</span>' }[s] || esc(s));

async function load() {
  const data = await api('/api/credits');
  updateCredits(data.balance.available);
  $('#heldNote').textContent = data.balance.held ? `${data.balance.held} credits reserved for an AI request in progress.` : '';
  const tx = data.transactions;
  $('#txTable tbody').innerHTML = tx.length ? tx.map((t) => `<tr>
    <td class="faint">${fmtDate(t.created_at)}</td>
    <td>${esc(t.description)} ${t.test ? '<span class="badge badge-test">TEST</span>' : ''}</td>
    <td style="text-align:right" class="${t.amount > 0 ? 'amt-pos' : 'amt-neg'}">${t.amount > 0 ? '+' : ''}${t.amount}</td>
    <td style="text-align:right" class="muted">${t.balance_after}</td></tr>`).join('')
    : '<tr><td colspan="4" class="muted">No credit activity yet.</td></tr>';
  const pur = data.purchases;
  $('#purTable tbody').innerHTML = pur.length ? pur.map((p) => `<tr>
    <td class="faint">${fmtDate(p.created_at)}</td>
    <td>${esc(p.package_id)} · ${p.credits} credits ${p.test ? '<span class="badge badge-test">TEST</span>' : ''}</td>
    <td>${money(p.amount_minor / 100, cfg)}</td><td>${statusBadge(p.status)}</td></tr>`).join('')
    : '<tr><td colspan="4" class="muted">No purchases yet.</td></tr>';
  return data;
}

function showStatus(kind, html) { $('#paymentStatus').innerHTML = `<div class="alert alert-${kind}" style="margin-bottom:20px">${html}</div>`; }

await load();
const payment = params.get('payment');
const purchaseId = params.get('purchase');
if (payment === 'success') showStatus('ok', '<b>Payment confirmed.</b> Your credits have been added. <a href="/app">Back to building →</a>');
else if (payment === 'cancelled') showStatus('warn', 'Checkout was cancelled. You were not charged.');
else if (payment === 'failed') showStatus('err', 'The payment could not be completed. You were not charged.');
else if (payment === 'pending' && purchaseId) {
  // Credits are only granted after the payment provider confirms it – poll our server.
  showStatus('warn', '<span class="spinner" style="display:inline-block;vertical-align:-3px"></span> Waiting for the payment provider to confirm your payment…');
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const p = await api(`/api/purchases/${encodeURIComponent(purchaseId)}`).catch(() => null);
    if (p?.status === 'paid') { showStatus('ok', '<b>Payment confirmed.</b> Your credits have been added.'); await load(); break; }
    if (p?.status === 'failed') { showStatus('err', 'The payment failed. You were not charged.'); break; }
    if (i === 19) showStatus('warn', 'Your payment is still being processed. Credits will appear here automatically once it is confirmed.');
  }
}
if (payment) history.replaceState(null, '', '/account');

$('#logout').addEventListener('click', async () => { await api('/api/auth/logout', { method: 'POST' }); window.location.href = '/'; });
