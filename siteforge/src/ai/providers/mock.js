// Offline DEMO provider for local development without an API key.
// It is deterministic and rule-based – NOT real AI – and is refused in
// production by config.js. It emits output in exactly the same format as the
// real model, so the whole pipeline (streaming, parsing, credit holds,
// versioning) can be exercised end-to-end.
import { buildTemplate } from '../../templates.js';
import { AiProviderError } from '../errors.js';

const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); reject(new AiProviderError('aborted', 'Request cancelled.')); }, { once: true });
});

const PALETTES = [
  { primary: '#e11d48', accent: '#f59e0b' }, { primary: '#059669', accent: '#0ea5e9' },
  { primary: '#7c3aed', accent: '#ec4899' }, { primary: '#0f766e', accent: '#84cc16' },
  { primary: '#ea580c', accent: '#db2777' }, { primary: '#2563eb', accent: '#14b8a6' },
];

function setVar(css, name, value) {
  return css.replace(new RegExp(`(--${name}:\\s*)[^;]+;`), `$1${value};`);
}

function guessBrand(prompt) {
  const q = prompt.match(/["“']([^"”']{2,40})["”']/) || prompt.match(/(?:called|named)\s+([A-Z][\w&' ]{1,30})/);
  return q ? q[1].trim() : null;
}

function plan({ project, operation, prompt }) {
  const p = prompt.toLowerCase();
  const files = project.files;
  const out = {};
  let message;

  switch (operation) {
    case 'create_site': {
      const tpl = /restaurant|cafe|café|food|bakery|bar\b|pizza/.test(p) ? 'restaurant'
        : /portfolio|photograph|designer|artist|freelanc/.test(p) ? 'portfolio'
          : /app|startup|saas|software|product/.test(p) ? 'startup' : 'business';
      Object.assign(out, buildTemplate(tpl, { brand: guessBrand(prompt) || project.name }));
      message = `I built a ${tpl} website for you with a hero, key sections and a contact form. Click any text to fine-tune it, or ask me for changes.`;
      break;
    }
    case 'restyle': {
      let css = files['styles.css'];
      if (/dark/.test(p)) {
        css = setVar(setVar(setVar(setVar(css, 'color-bg', '#0d0f16'), 'color-surface', '#161a24'), 'color-text', '#eef1f8'), 'color-muted', '#9aa3b8');
      } else if (/light|white|bright/.test(p)) {
        css = setVar(setVar(setVar(setVar(css, 'color-bg', '#ffffff'), 'color-surface', '#f4f6fb'), 'color-text', '#0f172a'), 'color-muted', '#64748b');
      }
      const pal = PALETTES[(css.length + p.length) % PALETTES.length];
      css = setVar(setVar(css, 'color-primary', pal.primary), 'color-accent', pal.accent);
      if (/round/.test(p)) css = setVar(css, 'radius', '24px');
      out['styles.css'] = css;
      message = `I refreshed the color palette${/dark/.test(p) ? ' with a dark theme' : ''} (primary ${pal.primary}, accent ${pal.accent}).`;
      break;
    }
    case 'write_text': {
      const headline = prompt.replace(/^(please\s+)?(write|rewrite|change|make)\s+(the\s+)?(headline|title|text)\s*(to|:)?\s*/i, '').slice(0, 80);
      out['index.html'] = files['index.html'].replace(/<h1([^>]*)>[\s\S]*?<\/h1>/, `<h1$1>${headline.replace(/[<>&]/g, '')}</h1>`);
      message = 'I rewrote the main headline on your home page.';
      break;
    }
    case 'add_page': {
      const name = (p.match(/(\w+)\s+page/) || [, 'services'])[1].replace(/[^a-z0-9]/g, '') || 'services';
      const file = `${name}.html`;
      const label = name[0].toUpperCase() + name.slice(1);
      const link = `<a href="${file}">${label}</a>`;
      for (const [path, html] of Object.entries(files)) {
        if (path.endsWith('.html') && !html.includes(`href="${file}"`)) out[path] = html.replace(/(\s*)<\/nav>/, `\n        ${link}$1</nav>`);
      }
      const base = (out['index.html'] || files['index.html']).replace(/ aria-current="page"/g, '');
      out[file] = base.replace(/<main>[\s\S]*<\/main>/, `<main>
    <section class="hero"><div class="container" data-animate="fade-up"><span class="eyebrow">${label}</span><h1>${label}</h1>
      <p class="lead">Tell visitors everything they need to know about ${name}.</p></div></section>
  </main>`).replace(/<title>[^<]*<\/title>/, `<title>${label}</title>`).replace(`href="${file}"`, `href="${file}" aria-current="page"`);
      message = `I added a new “${label}” page and linked it in the menu on every page.`;
      break;
    }
    case 'image': {
      out['assets/illustration.svg'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><circle cx="300" cy="80" r="40" fill="#fde68a"/><path d="M0 230 L110 130 L190 210 L260 150 L400 260 V300 H0Z" fill="#1e1b4b" opacity=".75"/><path d="M0 260 L140 180 L230 250 L320 200 L400 250 V300 H0Z" fill="#312e81"/></svg>`;
      const idx = files['index.html'];
      out['index.html'] = idx.includes('class="hero-art"')
        ? idx.replace(/<div class="hero-art"([^>]*)>[\s\S]*?<\/div>/, '<div class="hero-art"$1><img src="assets/illustration.svg" alt="Illustration of mountains at sunset"></div>')
        : idx.replace(/(<\/h1>)/, '$1\n        <img src="assets/illustration.svg" alt="Illustration of mountains at sunset" style="border-radius:var(--radius);margin:20px auto;max-width:520px">');
      message = 'I drew a vector illustration (assets/illustration.svg) and placed it in your hero section.';
      break;
    }
    case 'animation': {
      const anim = /zoom/.test(p) ? 'zoom' : /slide/.test(p) ? 'slide-left' : 'fade-up';
      for (const [path, html] of Object.entries(files)) {
        if (path.endsWith('.html')) out[path] = html.replace(/data-animate="[^"]*"/g, `data-animate="${anim}"`);
      }
      out['styles.css'] = `${files['styles.css'].trimEnd()}\n\n/* Hover lift on cards */\n.card { transition: transform .3s, box-shadow .3s; }\n.card:hover { transform: translateY(-6px); box-shadow: 0 18px 40px rgba(0,0,0,.12); }\n`;
      message = `Sections now animate in with a “${anim}” effect, and cards lift on hover.`;
      break;
    }
    default: { // edit / fix
      const faq = `
    <section class="alt" id="faq">
      <div class="container">
        <div class="section-head" data-animate="fade-up"><span class="eyebrow">FAQ</span><h2>Questions, answered</h2></div>
        <div class="grid-3">
          <div class="card" data-animate="fade-up"><h3>How do I start?</h3><p class="muted">Send us a message through the form below.</p></div>
          <div class="card" data-animate="fade-up"><h3>How long does it take?</h3><p class="muted">Most projects start within a week.</p></div>
          <div class="card" data-animate="fade-up"><h3>What does it cost?</h3><p class="muted">Clear, fixed prices agreed up front.</p></div>
        </div>
      </div>
    </section>`;
      const idx = files['index.html'];
      out['index.html'] = idx.includes('id="contact"') ? idx.replace(/(\s*<section[^>]*id="contact")/, `${faq}$1`) : idx.replace('</main>', `${faq}\n  </main>`);
      message = operation === 'fix' ? 'I polished the page and added a FAQ section to answer common questions.' : 'I added a FAQ section above your contact form.';
    }
  }
  const body = Object.entries(out).map(([path, c]) => `<file path="${path}">\n${c}\n</file>`).join('\n');
  return `<message>\n[Demo AI – no API key configured] ${message}\n</message>\n${body}`;
}

export function createMockProvider() {
  return {
    id: 'mock',
    label: 'Demo AI (offline)',
    model: 'mock',
    async complete({ onText, signal, context }) {
      if (/simulate (a )?failure/i.test(context.prompt)) { // lets you test the "no charge on failure" path
        await sleep(400, signal);
        throw new AiProviderError('upstream', 'Simulated AI failure (demo).');
      }
      const text = plan(context);
      for (let i = 0; i < text.length; i += 40) {
        await sleep(i < 400 ? 35 : 3, signal);
        onText(text.slice(i, i + 40));
      }
      return { text, model: 'mock', usage: null };
    },
  };
}
