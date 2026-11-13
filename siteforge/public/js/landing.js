import { $, esc, renderNav, getConfig, money } from './common.js';

export const SUGGESTED_PROMPTS = [
  'A modern site for my dental clinic in Tel Aviv',
  'Portfolio for a wedding photographer, dark and elegant',
  'Landing page for a habit-tracking app',
  'A cozy Italian restaurant with a menu page',
  'Personal trainer site with prices and booking',
];

const meP = renderNav($('#nav'));
$('#yr').textContent = new Date().getFullYear();

const ta = $('#heroPrompt');
$('#heroSuggestions').innerHTML = SUGGESTED_PROMPTS.map((p) => `<button type="button">${esc(p)}</button>`).join('');
$('#heroSuggestions').addEventListener('click', (e) => {
  if (e.target.tagName === 'BUTTON') { ta.value = e.target.textContent; ta.focus(); }
});
ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#heroChat').requestSubmit(); } });

$('#heroChat').addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = ta.value.trim();
  if (!prompt) { ta.focus(); return; }
  try { sessionStorage.setItem('sf_pending_prompt', prompt); } catch { /* storage unavailable */ }
  const me = await meP;
  window.location.href = me.user ? '/app' : '/signup?next=/app';
});

getConfig().then((cfg) => {
  $('#pkgTeaser').innerHTML = cfg.packages.map((p) => `<div><b>${money(p.price, cfg)}</b>${p.credits.toLocaleString()} credits · ${esc(p.name)}</div>`).join('');
});
