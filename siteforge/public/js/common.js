// Shared helpers for every page.

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message || `Request failed (${status})`);
    this.status = status;
    this.code = body?.error?.code || 'error';
    this.data = body?.error || {};
  }
}

export async function api(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const opts = { method, headers: { 'X-Requested-With': 'SiteForge', ...headers }, credentials: 'same-origin' };
  if (body !== undefined) {
    if (body instanceof Blob || body instanceof ArrayBuffer) opts.body = body;
    else { opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; }
  }
  const res = await fetch(path, opts);
  if (raw) return res;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

let configPromise;
export const getConfig = () => (configPromise ||= api('/api/config'));
export const getMe = () => api('/api/me');

export function money(amount, cfg) {
  return `${cfg.currencySymbol}${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export const LOGO_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>';

export function logoHtml() {
  return `<a class="logo" href="/"><span class="logo-mark">${LOGO_SVG}</span>SiteForge <span class="grad-text">AI</span></a>`;
}

export function toast(message, { error = false, ms = 3500 } = {}) {
  let wrap = $('.toast-wrap');
  if (!wrap) { wrap = el('<div class="toast-wrap" role="status" aria-live="polite"></div>'); document.body.append(wrap); }
  const t = el(`<div class="toast${error ? ' err' : ''}">${esc(message)}</div>`);
  wrap.append(t);
  setTimeout(() => t.remove(), ms);
}

// ---------------------------------------------------------------- credit pill
export function creditPillHtml(credits) {
  return `<div class="credit-pill${credits < 5 ? ' low' : ''}" title="Your AI credits – one-time purchases, never expire">
    <span class="gem" aria-hidden="true"></span><span data-credits>${credits}</span>&nbsp;<span class="muted">credits</span>
    <button class="btn btn-primary" data-buy-credits type="button">Buy credits</button></div>`;
}

export function updateCredits(n, { flash = false } = {}) {
  for (const node of $$('[data-credits]')) node.textContent = n;
  for (const pill of $$('.credit-pill')) {
    pill.classList.toggle('low', n < 5);
    if (flash) { pill.classList.remove('flash'); void pill.offsetWidth; pill.classList.add('flash'); }
  }
}

// ---------------------------------------------------------------------- nav
export async function renderNav(container, { active } = {}) {
  const me = await getMe().catch(() => ({ user: null }));
  const link = (href, label, cls = '') => `<a href="${href}" class="${cls}"${active === href ? ' style="color:var(--text)"' : ''}>${label}</a>`;
  container.innerHTML = `<nav class="topnav"><div class="container">${logoHtml()}<div class="nav-links">
    ${link('/pricing', 'Pricing', 'hide-sm')}
    ${me.user
    ? `${link('/app', 'Workspace', 'hide-sm')}${link('/account', 'Account', 'hide-sm')}${creditPillHtml(me.user.credits)}`
    : `${link('/login', 'Log in')}<a class="btn btn-primary btn-sm" href="/signup">Start free</a>`}
  </div></div></nav>`;
  bindBuyButtons(container);
  return me;
}

export function bindBuyButtons(root = document) {
  for (const b of $$('[data-buy-credits]', root)) b.addEventListener('click', () => openBuyCredits());
}

// --------------------------------------------------------------------- modal
export function openModal(html, { small = false } = {}) {
  const back = el(`<div class="modal-backdrop"><div class="modal${small ? ' modal-sm' : ''}" role="dialog" aria-modal="true">
    <button class="icon-btn modal-close" aria-label="Close">✕</button>${html}</div></div>`);
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  $('.modal-close', back).addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.append(back);
  return { root: back, close };
}

export function packagesHtml(cfg, { buttons = true } = {}) {
  return `<div class="packages">${cfg.packages.map((p) => `
    <div class="pkg${p.popular ? ' popular' : ''}">
      ${p.popular ? '<span class="tag">MOST POPULAR</span>' : ''}
      <h3>${esc(p.name)}</h3>
      <div class="credits">${p.credits.toLocaleString()} <span>AI credits</span></div>
      <div class="price">${money(p.price, cfg)}<small>one-time payment · no subscription</small></div>
      <div class="per">${money(p.price / p.credits, cfg)} per credit</div>
      <p>${esc(p.tagline || '')}</p>
      ${buttons ? `<button class="btn ${p.popular ? 'btn-primary' : ''}" data-package="${p.id}" type="button">Buy ${esc(p.name)}</button>` : ''}
    </div>`).join('')}</div>`;
}

export async function startCheckout(packageId, button) {
  const prev = button?.innerHTML;
  if (button) { button.disabled = true; button.innerHTML = '<span class="spinner"></span> Redirecting…'; }
  try {
    const { redirectUrl } = await api('/api/checkout', { method: 'POST', body: { packageId } });
    window.location.href = redirectUrl;
  } catch (err) {
    if (err.status === 401) { window.location.href = `/signup?next=${encodeURIComponent('/account')}`; return; }
    toast(err.message, { error: true });
    if (button) { button.disabled = false; button.innerHTML = prev; }
  }
}

export async function openBuyCredits({ reason } = {}) {
  const cfg = await getConfig();
  const pay = cfg.payments;
  const m = openModal(`
    <h2>Buy AI credits</h2>
    <p class="muted" style="margin:0">One-time purchase. No subscription, no renewals. Credits never expire and are only used when an AI change succeeds.</p>
    ${reason ? `<div class="alert alert-warn" style="margin-top:14px">${esc(reason)}</div>` : ''}
    ${!pay.enabled ? '<div class="alert alert-err" style="margin-top:14px">Payments are not configured on this server yet.</div>' : ''}
    ${pay.testMode ? '<div class="alert alert-warn" style="margin-top:14px"><b>Test mode:</b> no real money is charged. The site owner has not connected a live payment provider yet.</div>' : ''}
    ${packagesHtml(cfg, { buttons: pay.enabled })}
    <p class="faint" style="font-size:13px;margin:16px 0 0">Prices in Israeli shekels (ILS). Secure checkout${pay.provider === 'paypal' ? ' by PayPal (cards and PayPal balance)' : ''}.
      <a href="/pricing">See what each AI action costs →</a></p>`);
  for (const b of $$('[data-package]', m.root)) b.addEventListener('click', () => startCheckout(b.dataset.package, b));
}
