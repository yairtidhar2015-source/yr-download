// Builds the live-preview document for one page of a project and maps
// click-to-edit changes back onto the clean source HTML.

const TEXT_SEL = 'h1,h2,h3,h4,h5,h6,p,li,a,button,blockquote,figcaption,label,td,th,dt,dd,summary,small,span';

/** Editable elements of a parsed document, in a stable order. */
export function editableElements(doc) {
  const texts = [...doc.body.querySelectorAll(TEXT_SEL)].filter((node) => {
    if (node.closest('script,style,svg,noscript')) return false;
    if (!node.textContent.trim()) return false;
    for (let p = node.parentElement; p && p !== doc.body; p = p.parentElement) if (p.matches(TEXT_SEL)) return false;
    return true;
  });
  return { texts, images: [...doc.body.querySelectorAll('img')] };
}

export const serialize = (doc) => `<!doctype html>\n${doc.documentElement.outerHTML}\n`;
export const parse = (html) => new DOMParser().parseFromString(html, 'text/html');

const svgDataUri = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// Runtime injected into every preview document (runs inside the sandboxed iframe).
const RUNTIME = `(() => {
  const post = (m) => parent.postMessage(m, '*');
  const edit = document.documentElement.hasAttribute('data-sf-edit');
  window.addEventListener('message', (e) => {
    if (e.source !== parent || !e.data) return;
    if (e.data.type === 'sf:render') { document.open(); document.write(e.data.html); document.close(); }
    if (e.data.type === 'sf:setImage') { const img = document.querySelector('img[data-sf-img="' + e.data.id + '"]'); if (img) img.src = e.data.url; }
  });
  const y = Number(document.documentElement.getAttribute('data-sf-scroll') || 0);
  if (y) addEventListener('load', () => scrollTo(0, y));
  let t; addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => post({ type: 'sf:scroll', y: scrollY }), 120); });
  document.addEventListener('click', (e) => {
    const img = edit && e.target.closest('img[data-sf-img]');
    if (img) { e.preventDefault(); post({ type: 'sf:pickImage', id: img.getAttribute('data-sf-img') }); return; }
    const a = e.target.closest('a[href]');
    if (!a) return;
    if (edit) { e.preventDefault(); return; }
    const href = a.getAttribute('href');
    if (href.startsWith('#')) { e.preventDefault(); const el = document.getElementById(href.slice(1)); if (el) el.scrollIntoView({ behavior: 'smooth' }); return; }
    const m = href.match(/^(?:\\.\\/)?([a-z0-9_-]+\\.html)(#.*)?$/i);
    e.preventDefault();
    if (m) post({ type: 'sf:navigate', page: m[1], hash: m[2] || '' });
    else post({ type: 'sf:external', href });
  }, true);
  document.addEventListener('submit', (e) => { if (edit) e.preventDefault(); }, true);
  if (edit) {
    const style = document.createElement('style');
    style.textContent = '[data-sf-text]{outline:1px dashed transparent;outline-offset:3px;cursor:text;transition:outline-color .15s}[data-sf-text]:hover{outline-color:rgba(139,92,246,.7)}[data-sf-text]:focus{outline:2px solid #8b5cf6}img[data-sf-img]{cursor:pointer}img[data-sf-img]:hover{outline:3px solid #8b5cf6;outline-offset:2px}';
    document.head.appendChild(style);
    document.querySelectorAll('[data-sf-text]').forEach((node) => {
      node.contentEditable = 'true';
      node.spellcheck = true;
      let d;
      node.addEventListener('input', () => { clearTimeout(d); d = setTimeout(() => post({ type: 'sf:edit', id: node.getAttribute('data-sf-text'), html: node.innerHTML }), 250); });
      node.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !/^(P|LI|BLOCKQUOTE|TD|DD)$/.test(node.tagName)) { e.preventDefault(); node.blur(); } });
    });
  }
})();`;

/**
 * Build the preview HTML for `page`.
 * @param {Record<string,string>} files project files
 * @param {{page:string, edit:boolean, scroll:number}} opts
 */
export function buildPreview(files, { page = 'index.html', edit = false, scroll = 0 } = {}) {
  const src = files[page] ?? files['index.html'] ?? '<!doctype html><title>Empty</title><p>No page</p>';
  const doc = parse(src);
  const assetUri = (ref) => {
    const p = ref.replace(/^\.?\//, '');
    return files[p] && p.endsWith('.svg') ? svgDataUri(files[p]) : null;
  };

  if (edit) {
    doc.documentElement.setAttribute('data-sf-edit', '');
    const { texts, images } = editableElements(doc);
    texts.forEach((n, i) => n.setAttribute('data-sf-text', String(i)));
    images.forEach((n, i) => n.setAttribute('data-sf-img', String(i)));
  }
  if (scroll) doc.documentElement.setAttribute('data-sf-scroll', String(Math.round(scroll)));

  // Inline local stylesheets & scripts (the sandboxed frame cannot fetch project files).
  for (const link of doc.querySelectorAll('link[rel="stylesheet"][href]')) {
    const href = link.getAttribute('href').replace(/^\.?\//, '');
    if (files[href] !== undefined) {
      const style = doc.createElement('style');
      style.textContent = files[href].replace(/url\(\s*['"]?(assets\/[a-z0-9_-]+\.svg)['"]?\s*\)/gi, (m, ref) => (assetUri(ref) ? `url("${assetUri(ref)}")` : m));
      link.replaceWith(style);
    }
  }
  for (const s of doc.querySelectorAll('script[src]')) {
    const srcAttr = s.getAttribute('src').replace(/^\.?\//, '');
    if (files[srcAttr] !== undefined) {
      const inline = doc.createElement('script');
      inline.textContent = files[srcAttr];
      s.replaceWith(inline);
    }
  }
  for (const node of doc.querySelectorAll('[src^="assets/"],[src^="./assets/"]')) {
    const uri = assetUri(node.getAttribute('src'));
    if (uri) node.setAttribute('src', uri);
  }

  const rt = doc.createElement('script');
  rt.textContent = RUNTIME;
  doc.body.append(rt);
  // Scripts written via document.write run in order; make sure the site's own
  // script.js sees the DOM (it uses DOMContentLoaded, which still fires).
  return serialize(doc).replace(/<\/script>\s*<\/body>/i, '</script></body>');
}

/** Apply a text edit coming back from the preview to the source HTML. */
export function applyTextEdit(html, id, innerHTML) {
  const doc = parse(html);
  const node = editableElements(doc).texts[Number(id)];
  if (!node) return html;
  // Keep only harmless inline markup from contenteditable.
  const tmp = doc.createElement('div');
  tmp.innerHTML = innerHTML;
  for (const bad of tmp.querySelectorAll('script,style,iframe,object,embed')) bad.remove();
  for (const n of tmp.querySelectorAll('*')) for (const a of [...n.attributes]) if (/^on/i.test(a.name) || a.name.startsWith('data-sf-') || a.name === 'contenteditable') n.removeAttribute(a.name);
  node.innerHTML = tmp.innerHTML;
  return serialize(doc);
}

export function applyImageEdit(html, id, url) {
  const doc = parse(html);
  const node = editableElements(doc).images[Number(id)];
  if (!node) return html;
  node.setAttribute('src', url);
  return serialize(doc);
}

// ---------------------------------------------------------------- theme
const VARS = ['color-primary', 'color-accent', 'color-bg', 'color-surface', 'color-text', 'color-muted'];
export const THEME_LABELS = { 'color-primary': 'Primary', 'color-accent': 'Accent', 'color-bg': 'Background', 'color-surface': 'Surface', 'color-text': 'Text', 'color-muted': 'Muted text' };

export function readTheme(css = '') {
  const get = (name) => (css.match(new RegExp(`--${name}:\\s*([^;]+);`)) || [])[1]?.trim();
  const colors = {};
  for (const v of VARS) { const c = get(v); if (c && /^#[0-9a-f]{3,8}$/i.test(c)) colors[v] = c.length === 4 ? `#${[...c.slice(1)].map((x) => x + x).join('')}` : c.slice(0, 7); }
  const font = (v) => (get(v) || '').match(/'([^']+)'/)?.[1] || null;
  const radius = Number.parseInt(get('radius') || '14', 10);
  return { colors, heading: font('font-heading'), body: font('font-body'), radius: Number.isNaN(radius) ? 14 : radius };
}

export function setCssVar(css, name, value) {
  const re = new RegExp(`(--${name}:\\s*)[^;]+;`);
  if (re.test(css)) return css.replace(re, `$1${value};`);
  return css.replace(/:root\s*\{/, `:root {\n  --${name}: ${value};`);
}

export function setFonts(css, heading, body) {
  css = setCssVar(css, 'font-heading', `'${heading}', system-ui, sans-serif`);
  css = setCssVar(css, 'font-body', `'${body}', system-ui, sans-serif`);
  const fam = [...new Set([heading, body])].map((f) => `family=${f.replace(/ /g, '+')}:wght@400;600;800`).join('&');
  const imp = `@import url('https://fonts.googleapis.com/css2?${fam}&display=swap');`;
  return /@import url\(['"]?https:\/\/fonts\.googleapis\.com[^)]*\);/.test(css)
    ? css.replace(/@import url\(['"]?https:\/\/fonts\.googleapis\.com[^)]*\);/, imp)
    : `${imp}\n${css}`;
}

export function currentAnimation(files) {
  for (const [p, html] of Object.entries(files)) {
    if (!p.endsWith('.html')) continue;
    const m = html.match(/data-animate="([^"]+)"/);
    if (m) return m[1];
  }
  return 'none';
}

export function setAnimation(files, anim) {
  const next = { ...files };
  for (const [p, html] of Object.entries(files)) {
    if (p.endsWith('.html')) next[p] = html.replace(/data-animate="[^"]*"/g, `data-animate="${anim}"`);
  }
  if (anim === 'none' && next['styles.css'] && !next['styles.css'].includes('[data-animate="none"]')) {
    next['styles.css'] += '\n.js [data-animate="none"] { opacity: 1; transform: none; transition: none; }\n';
  }
  return next;
}
