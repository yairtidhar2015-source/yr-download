import { $, api, esc } from './common.js';

const id = location.pathname.split('/').pop();
const p = await api(`/api/payments/test/${encodeURIComponent(id)}`).catch((e) => ({ error: e.message }));
if (p.error) {
  $('#summary').innerHTML = `<div class="alert alert-err">${esc(p.error)}</div>`;
} else {
  $('#summary').innerHTML = `<div class="row"><span class="muted">Package</span><b>${esc(p.package)}</b></div>
    <div class="row"><span class="muted">AI credits</span><b>${p.credits}</b></div>
    <div class="row"><span class="muted">Amount</span><b>${p.amount.toFixed(2)} ${esc(p.currency)}</b></div>`;
  if (p.status !== 'created') $('#result').innerHTML = `<div class="alert alert-warn" style="margin-top:14px">This purchase is already ${esc(p.status)}.</div>`;
}

async function pay(outcome, btn) {
  btn.disabled = true;
  try {
    const r = await api(`/api/payments/test/${encodeURIComponent(id)}/pay`, { method: 'POST', body: { outcome } });
    if (r.status === 'paid') window.location.href = `/account?payment=success&purchase=${encodeURIComponent(id)}`;
    else window.location.href = '/account?payment=failed';
  } catch (e) {
    $('#result').innerHTML = `<div class="alert alert-err" style="margin-top:14px">${esc(e.message)}</div>`;
    btn.disabled = false;
  }
}
$('#paySuccess').addEventListener('click', (e) => pay('success', e.currentTarget));
$('#payFail').addEventListener('click', (e) => pay('fail', e.currentTarget));
