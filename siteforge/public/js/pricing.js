import { $, $$, esc, renderNav, getConfig, packagesHtml, startCheckout } from './common.js';

const meP = renderNav($('#nav'), { active: '/pricing' });
const cfg = await getConfig();
const me = await meP;

if (cfg.payments.testMode) $('#testNote').innerHTML = '<div class="alert alert-warn" style="margin-bottom:14px"><b>Test mode:</b> payments are simulated on this server – no real money is charged.</div>';
$('#packages').innerHTML = packagesHtml(cfg, { buttons: true });
for (const b of $$('[data-package]')) {
  b.addEventListener('click', () => {
    if (!me.user) { window.location.href = '/signup?next=/account'; return; }
    startCheckout(b.dataset.package, b);
  });
}
$('#opsTable tbody').innerHTML = Object.values(cfg.operations)
  .map((o) => `<tr><td><b>${esc(o.label)}</b></td><td class="muted">${esc(o.hint)}</td><td style="text-align:right;font-weight:700">${o.credits}</td></tr>`).join('');
