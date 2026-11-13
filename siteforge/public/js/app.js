import {
  $, $$, api, esc, el, getConfig, getMe, logoHtml, creditPillHtml, updateCredits, bindBuyButtons,
  openBuyCredits, openModal, toast, LOGO_SVG,
} from './common.js';
import {
  buildPreview, applyTextEdit, applyImageEdit, readTheme, setCssVar, setFonts, currentAnimation, setAnimation, THEME_LABELS,
} from './preview.js';

const S = {
  cfg: null, project: null, files: {}, page: 'index.html', device: 'desktop', edit: false,
  op: 'edit', opManual: false, busy: false, balance: 0, scroll: 0, controller: null,
  saveTimer: null, saving: null, dirtyNote: null,
};

const SUGGESTIONS = [
  { icon: '✨', op: 'create_site', text: 'Build a website for my yoga studio in Jerusalem with a class schedule, prices and a contact form' },
  { icon: '🎨', op: 'restyle', text: 'Switch to a dark, elegant color palette with gold accents and a classic serif font' },
  { icon: '📄', op: 'add_page', text: 'Add an About page with our story, values and a team section' },
  { icon: '✍️', op: 'write_text', text: 'Rewrite the homepage headline and intro so they are bolder and clearer' },
  { icon: '🖼️', op: 'image', text: 'Draw a friendly illustration for the hero section that matches my brand colors' },
  { icon: '🎬', op: 'animation', text: 'Add a testimonials slider that auto-rotates, and make cards lift on hover' },
];

// ------------------------------------------------------------ op detection
function detectOperation(text) {
  const t = text.toLowerCase();
  const fresh = !$$('#messages .msg.ai:not(.error)').length;
  if (/\b(add|create|new|another|make)\b[^.]{0,40}\bpage\b/.test(t)) return 'add_page';
  if (/\b(image|illustration|picture|drawing|draw|icon|logo|graphic|artwork|svg)\b/.test(t) && !/upload/.test(t)) return 'image';
  if (/(animat|slider|carousel|parallax|hover|interactive|tabs?\b|accordion|counter|effect|transition|scroll)/.test(t)) return 'animation';
  if (/(colou?r|font|dark|light mode|theme|layout|style|design|spacing|bigger|smaller|rounded|palette|look)/.test(t)) return 'restyle';
  if (/\b(fix|bug|broken|improve|mobile|responsive|accessib|faster|seo|polish)/.test(t)) return 'fix';
  if (/\b(write|rewrite|text|headline|title|copy|translate|wording|slogan|description|tagline|paragraph)\b/.test(t)) return 'write_text';
  if (fresh && /\b(website|site|landing page|homepage|web page)\b/.test(t)) return 'create_site';
  if (/^(build|create|make|generate|design)\b.*\b(website|site)\b/.test(t)) return 'create_site';
  return 'edit';
}

const opInfo = (id) => S.cfg.operations[id];

function refreshComposer() {
  const info = opInfo(S.op);
  $('#opLabel').textContent = info.label;
  const auto = $('#opAuto');
  auto.textContent = S.opManual ? 'Set' : 'Auto';
  auto.classList.toggle('manual', S.opManual);
  const cost = info.credits;
  const short = S.balance < cost;
  const btn = $('#sendBtn');
  btn.classList.toggle('insufficient', short && S.cfg.ai.enabled);
  $('#sendLabel').textContent = short && S.cfg.ai.enabled ? 'Buy credits' : S.op === 'create_site' ? 'Generate' : 'Send';
  $('#sendCost').textContent = `${cost} credit${cost === 1 ? '' : 's'}`;
  btn.title = `${info.label} – costs ${cost} credit${cost === 1 ? '' : 's'}, charged only if it succeeds`;
  const note = $('#composerNote');
  if (!S.cfg.ai.enabled) {
    note.className = 'composer-note warn';
    note.textContent = 'AI is not configured on this server yet. The free editor still works.';
  } else if (short) {
    note.className = 'composer-note warn';
    note.innerHTML = `This needs <b>${cost}</b> credit${cost === 1 ? '' : 's'} — you have <b>${S.balance}</b>. <button type="button" data-buy-credits>Buy credits</button> · editing by hand is free.`;
    bindBuyButtons(note);
  } else {
    note.className = 'composer-note';
    note.textContent = `${info.label}: ${cost} credit${cost === 1 ? '' : 's'}. Deducted only if the change succeeds · You have ${S.balance}.`;
  }
}

function setBalance(n, flash = false) {
  S.balance = n;
  updateCredits(n, { flash });
  refreshComposer();
}

function buildOpMenu() {
  const items = Object.entries(S.cfg.operations).map(([id, o]) => `
    <button type="button" role="option" data-op="${id}"><b>${esc(o.label)}</b><small>${esc(o.hint)}</small><span class="c">${o.credits} cr</span></button>`).join('');
  $('#opMenu').innerHTML = `<button type="button" class="auto-item" data-op="auto"><b>Auto-detect</b><small>Pick the action from what you type</small><span class="c"></span></button>${items}`;
}

// ---------------------------------------------------------------- preview
let frameHtml = '';
function renderPreview() {
  frameHtml = buildPreview(S.files, { page: S.page, edit: S.edit, scroll: S.scroll });
  // Reload the sandboxed frame; it asks for the document with sf:ready.
  $('#frame').src = `/preview-frame?r=${Date.now()}`;
  renderPageTabs();
}

function renderPageTabs() {
  const pages = Object.keys(S.files).filter((p) => p.endsWith('.html'))
    .sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
  $('#pageTabs').innerHTML = pages.map((p) => `<button role="tab" class="${p === S.page ? 'on' : ''}" data-page="${esc(p)}">${p === 'index.html' ? 'Home' : esc(p.replace(/\.html$/, '').replace(/[-_]/g, ' '))}</button>`).join('');
}

function goToPage(page) {
  if (!S.files[page]) return;
  S.page = page; S.scroll = 0;
  renderPreview();
}

window.addEventListener('message', async (e) => {
  if (e.source !== $('#frame').contentWindow || !e.data || typeof e.data.type !== 'string') return;
  const d = e.data;
  if (d.type === 'sf:ready') e.source.postMessage({ type: 'sf:render', html: frameHtml }, '*');
  else if (d.type === 'sf:navigate') goToPage(d.page);
  else if (d.type === 'sf:external') toast('External links are disabled in the preview.');
  else if (d.type === 'sf:scroll') S.scroll = Number(d.y) || 0;
  else if (d.type === 'sf:edit' && S.edit && typeof d.html === 'string') {
    S.files[S.page] = applyTextEdit(S.files[S.page], d.id, d.html);
    scheduleSave('Edited text');
  } else if (d.type === 'sf:pickImage' && S.edit) {
    const up = await pickAndUpload();
    if (!up) return;
    S.files[S.page] = applyImageEdit(S.files[S.page], d.id, up.url);
    $('#frame').contentWindow.postMessage({ type: 'sf:setImage', id: d.id, url: up.url }, '*');
    scheduleSave('Replaced image');
  }
});

// ------------------------------------------------------------------- save
function setSaveState(text) { $('#saveState').textContent = text; }

function scheduleSave(note) {
  S.dirtyNote = note;
  setSaveState('Unsaved changes');
  clearTimeout(S.saveTimer);
  S.saveTimer = setTimeout(() => flushSave(), 900);
}

async function flushSave() {
  clearTimeout(S.saveTimer);
  if (S.saving) await S.saving;
  if (!S.dirtyNote) return;
  const note = S.dirtyNote;
  S.dirtyNote = null;
  setSaveState('Saving…');
  S.saving = api(`/api/projects/${S.project.id}/files`, { method: 'PUT', body: { files: S.files, note } })
    .then(() => setSaveState('All changes saved'))
    .catch((err) => { S.dirtyNote = note; setSaveState('Not saved'); toast(err.message, { error: true }); })
    .finally(() => { S.saving = null; });
  await S.saving;
}
window.addEventListener('beforeunload', (e) => { if (S.dirtyNote) { flushSave(); e.preventDefault(); } });

// ------------------------------------------------------------------ chat UI
const fmt = (text) => esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');

function scrollChat() { const sc = $('#chatScroll'); sc.scrollTop = sc.scrollHeight; }
function updateEmpty() { $('#chatEmpty').hidden = $('#messages').children.length > 0; }

function addUserMsg(text, op) {
  const m = el(`<div class="msg user">${esc(text)}<span class="op">${esc(opInfo(op)?.label || op || '')}</span></div>`);
  $('#messages').append(m); updateEmpty(); scrollChat();
}

function addAiMsg({ text = '', error = false, system = false, metaHtml = '' } = {}) {
  const m = el(`<div class="msg ai${error ? ' error' : ''}${system ? ' system' : ''}"><div class="av">${LOGO_SVG}</div>
    <div class="body"><div class="text">${fmt(text)}</div><div class="files"></div><div class="meta">${metaHtml}</div></div></div>`);
  $('#messages').append(m); updateEmpty(); scrollChat();
  return m;
}

function renderHistory(chat) {
  $('#messages').innerHTML = '';
  for (const c of chat) {
    if (c.role === 'user') addUserMsg(c.content, c.operation);
    else addAiMsg({ text: c.content, error: c.status === 'error', metaHtml: c.credits ? `<span class="charged">${c.credits} credit${c.credits === 1 ? '' : 's'} used</span>` : c.status === 'error' ? '' : '<span>No credits used</span>' });
  }
  updateEmpty();
}

function insufficientMsg(required, available) {
  const m = addAiMsg({
    system: true,
    text: `**Not enough credits.** This action needs ${required} credit${required === 1 ? '' : 's'} and you have ${available}. Credits are one-time purchases and never expire — or keep editing by hand for free.`,
  });
  const btn = el('<button class="btn btn-primary btn-sm" type="button" style="margin-top:10px">Buy credits</button>');
  btn.addEventListener('click', () => openBuyCredits());
  $('.body', m).append(btn);
}

// --------------------------------------------------------------- AI request
async function* readSse(res) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) !== -1) {
      const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
      const ev = (chunk.match(/^event: (.*)$/m) || [])[1];
      const data = (chunk.match(/^data: (.*)$/m) || [])[1];
      if (ev && data) yield { event: ev, data: JSON.parse(data) };
    }
  }
}

function setBusy(on) {
  S.busy = on;
  $('#sendBtn').disabled = on;
  $('#stopBtn').hidden = !on;
  $('#pvBusy').hidden = !on;
  $('#prompt').disabled = on;
}

async function send() {
  if (S.busy) return;
  const prompt = $('#prompt').value.trim();
  const op = S.op;
  const cost = opInfo(op).credits;
  if (!S.cfg.ai.enabled) { addAiMsg({ system: true, text: 'AI is not configured on this server yet. You can still edit your site for free using Edit and Design.' }); return; }
  if (S.balance < cost) { openBuyCredits({ reason: `${opInfo(op).label} costs ${cost} credits. You have ${S.balance}.` }); return; }
  if (!prompt) { $('#prompt').focus(); return; }

  await flushSave(); // the AI must see the latest manual edits
  addUserMsg(prompt, op);
  $('#prompt').value = ''; autoGrow();
  const bubble = addAiMsg({ text: '' });
  const textEl = $('.text', bubble);
  const filesEl = $('.files', bubble);
  const metaEl = $('.meta', bubble);
  textEl.innerHTML = '<span class="thinking"><span></span><span></span><span></span></span>';
  setBusy(true);
  S.controller = new AbortController();
  let streamed = '';
  const chips = new Map();

  try {
    const res = await fetch(`/api/projects/${S.project.id}/ai`, {
      method: 'POST', signal: S.controller.signal, credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'SiteForge' },
      body: JSON.stringify({ operation: op, prompt, currentPage: S.page }),
    });
    if (!res.ok || !res.headers.get('content-type')?.includes('text/event-stream')) {
      const body = await res.json().catch(() => ({}));
      bubble.remove();
      if (res.status === 402) { insufficientMsg(body.error?.required ?? cost, body.error?.available ?? 0); setBalance(body.error?.available ?? 0); }
      else addAiMsg({ error: true, text: body.error?.message || 'Something went wrong. No credits were used.' });
      $('#prompt').value = prompt; autoGrow();
      return;
    }
    for await (const { event, data } of readSse(res)) {
      if (event === 'start') {
        metaEl.innerHTML = `<span class="status-line"><span class="spinner"></span> Working · ${data.cost} credit${data.cost === 1 ? '' : 's'} reserved</span>`;
      } else if (event === 'text') {
        streamed += data.delta;
        textEl.innerHTML = `${fmt(streamed)}<span class="caret"></span>`;
        scrollChat();
      } else if (event === 'file') {
        for (const c of chips.values()) { c.classList.remove('writing'); c.classList.add('done'); }
        const chip = el(`<span class="writing">${esc(data.path)}</span>`);
        chips.set(data.path, chip); filesEl.append(chip); scrollChat();
      } else if (event === 'done') {
        textEl.innerHTML = fmt(data.message);
        filesEl.innerHTML = data.changed.map((p) => `<span class="done">${esc(p)}</span>`).join('');
        metaEl.innerHTML = data.charged
          ? `<span class="charged">${data.charged} credit${data.charged === 1 ? '' : 's'} used</span><span>${data.balance} left</span>`
          : '<span>No changes made · no credits used</span>';
        setBalance(data.balance, data.charged > 0);
        if (data.files) {
          S.files = data.files;
          const newPage = data.changed.find((p) => p.endsWith('.html') && !S.project.files[p]);
          S.project.files = data.files;
          if (op === 'add_page' && newPage) { S.page = newPage; S.scroll = 0; }
          if (!S.files[S.page]) S.page = 'index.html';
          if (op === 'create_site') S.scroll = 0;
          renderPreview();
          if (window.matchMedia('(max-width: 900px)').matches) setMobileTab('preview');
        }
      } else if (event === 'error') {
        bubble.classList.add('error');
        textEl.innerHTML = fmt(data.message);
        filesEl.innerHTML = ''; metaEl.innerHTML = '';
        if (typeof data.balance === 'number') setBalance(data.balance);
      }
    }
  } catch (err) {
    bubble.classList.add('error');
    filesEl.innerHTML = '';
    metaEl.innerHTML = '';
    textEl.textContent = err.name === 'AbortError' ? 'Stopped. No credits were used.' : 'Connection lost. No credits were used.';
    setTimeout(() => getMe().then((m) => m.user && setBalance(m.user.credits)), 800);
  } finally {
    setBusy(false);
    S.controller = null;
    if (!S.opManual) { S.op = 'edit'; refreshComposer(); }
    $('#prompt').focus();
  }
}

// ------------------------------------------------------------------ design
function openDesign() {
  const panel = $('#designPanel');
  panel.hidden = !panel.hidden;
  $('#designBtn').classList.toggle('on', !panel.hidden);
  if (panel.hidden) return;
  const theme = readTheme(S.files['styles.css']);
  $('#swatches').innerHTML = Object.entries(theme.colors).map(([k, v]) => `<label><input type="color" value="${v}" data-var="${k}"> ${THEME_LABELS[k]}</label>`).join('')
    || '<p class="faint">This design does not use theme color variables. Ask the AI to restyle it.</p>';
  const fonts = [...new Set([...S.cfg.fonts, theme.heading, theme.body].filter(Boolean))];
  const opts = (sel) => fonts.map((f) => `<option${f === sel ? ' selected' : ''}>${esc(f)}</option>`).join('');
  $('#fontHeading').innerHTML = opts(theme.heading);
  $('#fontBody').innerHTML = opts(theme.body);
  $('#radius').value = theme.radius;
  $('#radiusVal').textContent = ` ${theme.radius}px`;
  const anim = currentAnimation(S.files);
  $('#animSelect').innerHTML = S.cfg.animations.map((a) => `<option value="${a}"${a === anim ? ' selected' : ''}>${a === 'none' ? 'None' : a.replace('-', ' ')}</option>`).join('');
}

let designTimer;
function designChanged(note) {
  clearTimeout(designTimer);
  designTimer = setTimeout(renderPreview, 120);
  scheduleSave(note);
}

$('#swatches').addEventListener('input', (e) => {
  if (!e.target.dataset.var) return;
  S.files['styles.css'] = setCssVar(S.files['styles.css'], e.target.dataset.var, e.target.value);
  designChanged('Changed colors');
});
for (const id of ['fontHeading', 'fontBody']) {
  $(`#${id}`).addEventListener('change', () => {
    S.files['styles.css'] = setFonts(S.files['styles.css'], $('#fontHeading').value, $('#fontBody').value);
    designChanged('Changed fonts');
  });
}
$('#radius').addEventListener('input', (e) => {
  $('#radiusVal').textContent = ` ${e.target.value}px`;
  S.files['styles.css'] = setCssVar(S.files['styles.css'], 'radius', `${e.target.value}px`);
  designChanged('Changed corners');
});
$('#animSelect').addEventListener('change', (e) => {
  S.files = setAnimation(S.files, e.target.value);
  S.scroll = 0;
  designChanged('Changed animations');
});

// ---------------------------------------------------------------- uploads
function pickFile() {
  return new Promise((resolve) => {
    const input = $('#fileInput');
    input.value = '';
    input.onchange = () => resolve(input.files[0] || null);
    input.click();
  });
}

async function uploadFile(file) {
  if (file.size > 5 * 1024 * 1024) { toast('Images must be 5 MB or smaller.', { error: true }); return null; }
  try {
    return await api('/api/uploads', { method: 'POST', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Filename': encodeURIComponent(file.name) } });
  } catch (err) { toast(err.message, { error: true }); return null; }
}

async function pickAndUpload() {
  const f = await pickFile();
  return f ? uploadFile(f) : null;
}

async function openImages() {
  const m = openModal(`<h2>Your images</h2>
    <p class="muted" style="margin:0">Upload your own images for free (PNG, JPG, GIF, WebP · up to 5 MB). Turn on <b>Edit</b> and click any image on your page to replace it,
    or ask the AI, e.g. “use my uploaded logo in the header”.</p>
    <button class="btn btn-primary" id="upBtn" type="button" style="margin-top:14px">Upload image</button>
    <div class="img-grid" id="imgGrid"></div>`);
  const load = async () => {
    const { uploads } = await api('/api/uploads');
    $('#imgGrid', m.root).innerHTML = uploads.length
      ? uploads.map((u) => `<figure><img src="${esc(u.url)}" alt="" loading="lazy"><figcaption>${esc(u.filename)}</figcaption></figure>`).join('')
      : '<p class="faint">No images yet.</p>';
  };
  $('#upBtn', m.root).addEventListener('click', async () => { if (await pickAndUpload()) { toast('Image uploaded'); load(); } });
  load();
}

// ---------------------------------------------------- templates & history
async function openTemplates() {
  const m = openModal(`<h2>Start from a template</h2>
    <p class="muted" style="margin:0">Free basic templates. This replaces your current site — you can undo it from version history.</p>
    <div class="tpl-grid">${S.cfg.templates.map((t) => `<button class="tpl" type="button" data-tpl="${t.id}">
      <div class="sw" style="background:linear-gradient(135deg, ${t.theme.primary}, ${t.theme.accent}); box-shadow: inset 0 -26px 0 ${t.theme.bg}"></div>
      <b>${esc(t.name)}</b><small>${esc(t.description)}</small></button>`).join('')}</div>`);
  for (const b of $$('[data-tpl]', m.root)) {
    b.addEventListener('click', async () => {
      await flushSave();
      const { project } = await api(`/api/projects/${S.project.id}/reset`, { method: 'POST', body: { template: b.dataset.tpl } });
      loadProjectFiles(project);
      m.close();
      toast('Template applied. Undo anytime from history.');
    });
  }
}

async function openHistory() {
  await flushSave();
  const { versions } = await api(`/api/projects/${S.project.id}/versions`);
  const badge = { ai: 'badge-brand', manual: 'badge-ok', template: 'badge-test', restore: 'badge-test' };
  const m = openModal(`<h2>Version history</h2><p class="muted" style="margin:0">Every AI change and manual edit is saved. Restoring is free.</p>
    <div class="ver-list">${versions.map((v, i) => `<div class="ver"><span class="badge ${badge[v.source] || ''}">${esc(v.source.toUpperCase())}</span>
      <div class="info"><div>${esc(v.note || '')}</div><small class="faint">${new Date(`${v.created_at.replace(' ', 'T')}Z`).toLocaleString()}</small></div>
      ${i === 0 ? '<span class="faint" style="font-size:12px">Current</span>' : `<button class="btn btn-sm" data-ver="${v.id}" type="button">Restore</button>`}</div>`).join('')}</div>`);
  for (const b of $$('[data-ver]', m.root)) {
    b.addEventListener('click', async () => {
      const { project } = await api(`/api/projects/${S.project.id}/versions/${b.dataset.ver}/restore`, { method: 'POST' });
      loadProjectFiles(project); m.close(); toast('Version restored');
    });
  }
}

function loadProjectFiles(project) {
  S.project = project; S.files = { ...project.files };
  if (!S.files[S.page]) S.page = 'index.html';
  S.scroll = 0;
  renderPreview();
  if (!$('#designPanel').hidden) { $('#designPanel').hidden = true; openDesign(); }
}

// ------------------------------------------------------------ misc wiring
function autoGrow() { const ta = $('#prompt'); ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 260)}px`; }

function setMobileTab(tab) {
  $('.ws-main').dataset.mtab = tab;
  for (const b of $$('[data-mtab]')) b.classList.toggle('on', b.dataset.mtab === tab);
}

function wire() {
  $('#composer').addEventListener('submit', (e) => { e.preventDefault(); send(); });
  $('#prompt').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
  $('#prompt').addEventListener('input', () => {
    autoGrow();
    if (!S.opManual) { S.op = detectOperation($('#prompt').value); refreshComposer(); }
  });
  $('#stopBtn').addEventListener('click', () => S.controller?.abort());

  $('#opBtn').addEventListener('click', () => {
    const menu = $('#opMenu');
    menu.hidden = !menu.hidden;
    $('#opBtn').setAttribute('aria-expanded', String(!menu.hidden));
    for (const b of $$('[data-op]', menu)) b.classList.toggle('on', S.opManual ? b.dataset.op === S.op : b.dataset.op === 'auto');
  });
  $('#opMenu').addEventListener('click', (e) => {
    const b = e.target.closest('[data-op]');
    if (!b) return;
    if (b.dataset.op === 'auto') { S.opManual = false; S.op = detectOperation($('#prompt').value); } else { S.opManual = true; S.op = b.dataset.op; }
    $('#opMenu').hidden = true;
    refreshComposer();
    $('#prompt').focus();
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.op-picker')) $('#opMenu').hidden = true; });

  $('#suggestions').innerHTML = SUGGESTIONS.map((s, i) => `<button type="button" data-sugg="${i}"><span class="pi">${s.icon}</span><span>${esc(s.text)}</span><span class="pc">${opInfo(s.op).credits} cr</span></button>`).join('');
  $('#suggestions').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sugg]');
    if (!b) return;
    const s = SUGGESTIONS[b.dataset.sugg];
    $('#prompt').value = s.text; S.op = s.op; S.opManual = true;
    refreshComposer(); autoGrow(); $('#prompt').focus();
  });

  $('#pageTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-page]'); if (b) goToPage(b.dataset.page); });
  for (const b of $$('[data-device]')) {
    b.addEventListener('click', () => {
      S.device = b.dataset.device;
      $('#device').className = `pv-device ${S.device}`;
      for (const x of $$('[data-device]')) x.classList.toggle('on', x === b);
    });
  }
  $('#editToggle').addEventListener('click', () => {
    S.edit = !S.edit;
    $('#editToggle').classList.toggle('on', S.edit);
    $('#editToggle').textContent = S.edit ? '✓ Done editing' : '✎ Edit';
    $('#editBanner').hidden = !S.edit;
    if (!S.edit) flushSave();
    renderPreview();
  });
  $('#designBtn').addEventListener('click', openDesign);
  $('#designClose').addEventListener('click', openDesign);
  $('#imagesBtn').addEventListener('click', openImages);
  $('#templatesBtn').addEventListener('click', openTemplates);
  $('#historyBtn').addEventListener('click', openHistory);
  for (const b of $$('[data-mtab]')) b.addEventListener('click', () => setMobileTab(b.dataset.mtab));

  $('#projectName').addEventListener('change', async (e) => {
    try { await api(`/api/projects/${S.project.id}`, { method: 'PATCH', body: { name: e.target.value } }); toast('Renamed'); } catch (err) { toast(err.message, { error: true }); }
  });
}

// --------------------------------------------------------------------- init
async function init() {
  const [cfg, me] = await Promise.all([getConfig(), getMe()]);
  if (!me.user) { window.location.href = '/login?next=/app'; return; }
  S.cfg = cfg;
  $('#logo').innerHTML = logoHtml();
  $('#creditSlot').innerHTML = creditPillHtml(me.user.credits);
  bindBuyButtons($('#creditSlot'));
  $('#aiBadge').innerHTML = cfg.ai.enabled
    ? `<span class="ai-badge"><span class="dot"></span>${esc(cfg.ai.provider)}${cfg.ai.demo ? ' <span class="badge badge-test">DEMO</span>' : ''}</span>`
    : '<span class="badge badge-err">AI off</span>';
  $('.ws-main').dataset.mtab = 'chat';
  buildOpMenu();
  wire();
  S.balance = me.user.credits;

  let { projects } = await api('/api/projects');
  let project;
  if (!projects.length) ({ project } = await api('/api/projects', { method: 'POST', body: { name: 'My Website', template: 'blank' } }));
  const full = await api(`/api/projects/${(project || projects[0]).id}`);
  S.project = full.project; S.files = { ...full.project.files };
  $('#projectName').value = S.project.name;
  renderHistory(full.chat);
  renderPreview();
  setSaveState('All changes saved');

  let pending = null;
  try { pending = sessionStorage.getItem('sf_pending_prompt'); sessionStorage.removeItem('sf_pending_prompt'); } catch { /* ignore */ }
  if (pending) { $('#prompt').value = pending; S.op = 'create_site'; S.opManual = true; autoGrow(); }
  refreshComposer();
  $('#prompt').focus();
}

init().catch((err) => { console.error(err); toast(err.message || 'Could not load the workspace.', { error: true }); });
